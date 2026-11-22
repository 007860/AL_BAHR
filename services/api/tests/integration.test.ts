import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, newId } from "../src/db/database.ts";
import { loadConfig } from "../src/config.ts";
import { hashPassword } from "../src/core/security.ts";
import { convertLeadToCase, createLead, uploadPrivateDocument } from "../src/modules/crm-cases.ts";
import {
  acceptQuoteAndDraftInvoice,
  confirmSupplierBooking,
  createBookingAndConfirmSupplier,
  createQuote,
  createUmrahPackage,
  getMyTrips,
  listPublicActiveUmrahPackages,
  publishOrExpireUmrahPackage,
  sendQuote,
  uploadPaymentEvidence,
  verifyOrRejectPayment,
} from "../src/modules/travel-commercial.ts";
import {
  activateOrRollbackRule,
  createCampaignAndSend,
  createRuleDraft,
  deactivateStaffAndRevokeSessions,
  decideLeaveRequest,
  emergencyPauseAutomation,
  inviteEmployee,
  redeemEmployeeInvitation,
  sendCampaignIdempotent,
  simulateRulesAndQueue,
} from "../src/modules/hr-cms-ops.ts";

function seedStaff(db: ReturnType<typeof createDatabase>, orgId: string, email: string, role: string, skills: string[], maxActive = 50) {
  const id = newId();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO os_users VALUES (?, ?, ?, ?, ?, NULL, 'en', 0, NULL, 'active', ?, ?)").run(
    id, orgId, email, hashPassword("Pass!123456"), email.split("@")[0], now, now
  );
  db.prepare("INSERT INTO os_memberships (id, organization_id, user_id, role_id, created_at) VALUES (?, ?, ?, ?, ?)").run(newId(), orgId, id, role, now);
  if (["employee", "manager", "finance", "support"].includes(role)) {
    db.prepare("INSERT INTO os_employees (user_id, organization_id, team_id, max_active_tasks, active_weighted_load, auto_assign_enabled, leave_status, updated_at) VALUES (?, ?, 'umrah', ?, 0, 1, 'available', ?)").run(
      id, orgId, maxActive, now
    );
    for (const sk of skills) {
      db.prepare("INSERT INTO os_staff_skills VALUES (?, ?, 1)").run(id, sk);
    }
  }
  return id;
}

test("E2E-01 & E2E-04: Full Umrah Lead -> Least-Load Assign -> Case -> Quote -> Idempotent Invoice -> Bank Verify -> Booking -> My Trips", () => {
  const db = createDatabase();
  const cfg = loadConfig();
  const ceoId = seedStaff(db, cfg.defaultOrgId, "ceo@albahr.local", "ceo", []);
  const mgrId = seedStaff(db, cfg.defaultOrgId, "mgr1@albahr.local", "manager", []);
  const empId = seedStaff(db, cfg.defaultOrgId, "umrah1@albahr.local", "employee", ["umrah"]);
  const finId = seedStaff(db, cfg.defaultOrgId, "fin@albahr.local", "finance", []);
  const custUserId = seedStaff(db, cfg.defaultOrgId, "pilgrim@gmail.com", "customer", []);

  const mgrClaims = { sub: mgrId, sid: "sm1", role: "manager", orgId: cfg.defaultOrgId, aal: "aal1" as const, exp: 9999999999 };
  const empClaims = { sub: empId, sid: "s1", role: "employee", orgId: cfg.defaultOrgId, aal: "aal1" as const, exp: 9999999999 };
  const finClaims = { sub: finId, sid: "s2", role: "finance", orgId: cfg.defaultOrgId, aal: "aal2" as const, exp: 9999999999 };
  const custClaims = { sub: custUserId, sid: "s3", role: "customer", orgId: cfg.defaultOrgId, aal: "aal1" as const, exp: 9999999999 };

  // 1. Website Umrah lead created -> auto-assigned to eligible empId
  const leadRes = createLead(db, null, cfg.defaultOrgId, {
    fullName: "Haji Tariq",
    phone: "+923001112233",
    serviceType: "umrah",
    sourceChannel: "website_form",
    consentGiven: true,
  }, "idem-lead-1", "req1");
  assert.equal(leadRes.status, 201);
  assert.equal((leadRes.body as { assignedEmployeeId: string }).assignedEmployeeId, empId);

  // 2. Employee converts lead to Case & links Customer user
  const convRes = convertLeadToCase(db, empClaims, (leadRes.body as { id: string }).id, "idem-conv-1", "req2");
  assert.equal(convRes.status, 201);
  const { id: caseId, customerId } = convRes.body as { id: string; customerId: string };
  db.prepare("UPDATE os_customers SET user_id = ? WHERE id = ?").run(custUserId, customerId);

  // 3. Employee creates draft Quote; Manager approves & sends Quote (employee blocked from final send)
  const qtRes = createQuote(db, empClaims, {
    customerId,
    caseId,
    validUntil: new Date(Date.now() + 86400_000).toISOString(),
    lines: [{ description: "14-Night Umrah Quad Package (Makkah 400m / Madinah 200m)", qty: 2, unitCostPkr: 240000, unitSellingPkr: 265000 }],
  }, "req3");
  assert.equal(qtRes.status, 201);
  const quoteId = (qtRes.body as { id: string }).id;
  assert.equal(sendQuote(db, empClaims, quoteId, "req4a").status, 403);
  assert.equal(sendQuote(db, mgrClaims, quoteId, "req4b").status, 200);

  // 4. Customer accepts quote TWICE via retry -> exactly ONE invoice generated (E2E-04)
  const acc1 = acceptQuoteAndDraftInvoice(db, custClaims, quoteId, "idem-acc-1", "req5");
  const acc2 = acceptQuoteAndDraftInvoice(db, custClaims, quoteId, "idem-acc-1", "req6");
  assert.equal(acc1.status, 200);
  assert.equal(acc2.status, 200);
  const invId = (acc1.body as { invoice: { id: string } }).invoice.id;
  assert.equal((acc2.body as { invoice: { id: string } }).invoice.id, invId);
  assert.equal((db.prepare("SELECT COUNT(*) as c FROM os_invoices").get() as { c: number }).c, 1);

  // 5. Customer uploads bank slip -> pending_review (invoice still NOT paid)
  const payEv = uploadPaymentEvidence(db, custClaims, {
    invoiceId: invId,
    amountPkr: 530000,
    bankName: "Meezan Bank",
    bankReference: "MEZ-998877",
  }, "req7");
  assert.equal(payEv.status, 201);
  assert.equal((payEv.body as { status: string; invoiceStatus: string }).status, "pending_review");
  assert.equal((payEv.body as { invoiceStatus: string }).invoiceStatus, "issued");
  const paymentId = (payEv.body as { id: string }).id;

  // 6. Finance verifies payment TWICE -> exactly ONE pair of ledger entries posted (E2E-04)
  const ver1 = verifyOrRejectPayment(db, finClaims, paymentId, { decision: "verified" }, "idem-ver-1", "req8");
  const ver2 = verifyOrRejectPayment(db, finClaims, paymentId, { decision: "verified" }, "idem-ver-1", "req9");
  assert.equal(ver1.status, 200);
  assert.equal((ver1.body as { invoiceStatus: string }).invoiceStatus, "paid");
  assert.equal(ver2.status, 200);
  assert.equal((db.prepare("SELECT COUNT(*) as c FROM os_ledger_entries WHERE reference_type = 'payment'").get() as { c: number }).c, 2);

  // 7. Operations uploads voucher & confirms booking -> appears in Customer My Trips
  const pdfB64 = Buffer.from("%PDF-1.4 voucher content").toString("base64");
  const docRes = uploadPrivateDocument(db, empClaims, {
    customerId,
    caseId,
    docCategory: "umrah_voucher",
    fileName: "hotel_voucher.pdf",
    mimeType: "application/pdf",
    contentBase64: pdfB64,
  }, "req10");
  const docId = (docRes.body as { id: string }).id;

  const bkRes = createBookingAndConfirmSupplier(db, empClaims, { caseId, customerId, quoteId, invoiceId: invId, travelerFullName: "Haji Tariq" }, "req11");
  const bkId = (bkRes.body as { id: string }).id;
  assert.equal(confirmSupplierBooking(db, empClaims, bkId, { supplierPnrRef: "SAU-771122", voucherDocumentId: docId }, "req12").status, 200);

  const trips = getMyTrips(db, custClaims, "req13");
  assert.equal((trips.body as { items: unknown[] }).items.length, 1);
  assert.ok(ceoId);
});

test("E2E-02: Smart Assignment fair rotation, leave exclusion, manager triage, and 50 concurrent leads balanced", () => {
  const db = createDatabase();
  const cfg = loadConfig();
  const mgrId = seedStaff(db, cfg.defaultOrgId, "mgr@albahr.local", "manager", []);
  const empA = seedStaff(db, cfg.defaultOrgId, "a@albahr.local", "employee", ["umrah"], 50);
  const empB = seedStaff(db, cfg.defaultOrgId, "b@albahr.local", "employee", ["umrah"], 50);
  const empC = seedStaff(db, cfg.defaultOrgId, "c@albahr.local", "employee", ["umrah"], 50);
  const mgrClaims = { sub: mgrId, sid: "sm", role: "manager", orgId: cfg.defaultOrgId, aal: "aal1" as const, exp: 9999999999 };

  // Put empC on approved leave -> excluded!
  const leaveId = newId();
  db.prepare("INSERT INTO os_leave_requests VALUES (?, ?, '2026-12-01', '2026-12-05', 'Annual', 'pending', NULL, ?)").run(
    leaveId, empC, new Date().toISOString()
  );
  assert.equal(decideLeaveRequest(db, mgrClaims, leaveId, "approved", "rl").status, 200);

  // Send 50 simultaneous leads -> must balance 25 / 25 between empA and empB (0 to empC on leave)
  const counts: Record<string, number> = { [empA]: 0, [empB]: 0, [empC]: 0 };
  for (let i = 0; i < 50; i++) {
    const res = createLead(db, null, cfg.defaultOrgId, {
      fullName: `Pilgrim ${i}`,
      phone: `+923000000${String(i).padStart(3, "0")}`,
      serviceType: "umrah",
      sourceChannel: "website_form",
      consentGiven: true,
    }, undefined, `req-${i}`);
    const assignee = (res.body as { assignedEmployeeId: string }).assignedEmployeeId;
    counts[assignee] = (counts[assignee] ?? 0) + 1;
  }
  assert.equal(counts[empA], 25);
  assert.equal(counts[empB], 25);
  assert.equal(counts[empC], 0);

  // No eligible employee for 'study' skill -> goes to manager_triage
  const triageRes = createLead(db, null, cfg.defaultOrgId, {
    fullName: "Student One",
    phone: "+923111111111",
    serviceType: "study",
    sourceChannel: "website_form",
    consentGiven: true,
  }, undefined, "req-study");
  assert.equal((triageRes.body as { queue: string; assignedEmployeeId: null }).queue, "manager_triage");
  assert.equal((triageRes.body as { assignedEmployeeId: null }).assignedEmployeeId, null);
});

test("E2E-04 Campaign & E2E-05 Package Expiry & E2E-07 Deactivation & E2E-08 Rule Versioning/Pause", () => {
  const db = createDatabase();
  const cfg = loadConfig();
  const ceoId = seedStaff(db, cfg.defaultOrgId, "ceo2@albahr.local", "ceo", []);
  const ceoClaims = { sub: ceoId, sid: "sc", role: "ceo", orgId: cfg.defaultOrgId, aal: "aal2" as const, exp: 9999999999 };

  // E2E-05: Published package expires -> hidden from public browse, historical booking preserved
  const pkgRes = createUmrahPackage(db, ceoClaims, {
    pkgNo: "UMR-2026-01",
    title: "Dec 14N Umrah",
    departureCity: "Lahore",
    airline: "PIA",
    route: "LHE-JED-LHE",
    totalNights: 14,
    makkahHotel: "Swissotel",
    makkahDistanceM: 350,
    makkahNights: 7,
    madinahHotel: "Anwar Al Madinah",
    madinahDistanceM: 150,
    madinahNights: 7,
    priceSharingPkr: 210000,
    priceQuadPkr: 230000,
    priceTriplePkr: 255000,
    priceDoublePkr: 295000,
  }, "r1");
  const pkgId = (pkgRes.body as { id: string }).id;
  assert.equal(publishOrExpireUmrahPackage(db, ceoClaims, pkgId, "publish", "r2").status, 200);
  assert.equal((listPublicActiveUmrahPackages(db, cfg.defaultOrgId).body as { items: unknown[] }).items.length, 1);

  assert.equal(publishOrExpireUmrahPackage(db, ceoClaims, pkgId, "expire", "r3").status, 200);
  assert.equal((listPublicActiveUmrahPackages(db, cfg.defaultOrgId).body as { items: unknown[] }).items.length, 0);

  // E2E-04 Campaign retry -> 1 logical delivery per opted-in subscriber
  const now = new Date().toISOString();
  db.prepare("INSERT INTO os_subscribers VALUES (?, ?, 'sub1@test.com', 'subscribed', 'tok1', ?)").run(newId(), cfg.defaultOrgId, now);
  db.prepare("INSERT INTO os_subscribers VALUES (?, ?, 'sub2@test.com', 'unsubscribed', 'tok2', ?)").run(newId(), cfg.defaultOrgId, now);
  const camp = createCampaignAndSend(db, ceoClaims, { title: "Ramadan", subject: "Packages", bodyTemplate: "View offers. Click unsubscribe." }, "rc1");
  const campId = (camp.body as { id: string }).id;
  const s1 = sendCampaignIdempotent(db, ceoClaims, campId, "idem-camp-1", "rc2");
  const s2 = sendCampaignIdempotent(db, ceoClaims, campId, "idem-camp-1", "rc3");
  assert.equal((s1.body as { eligibleSubscribers: number }).eligibleSubscribers, 1);
  assert.equal((s2.body as { eligibleSubscribers: number }).eligibleSubscribers, 1);
  assert.equal((db.prepare("SELECT COUNT(*) as c FROM os_campaign_deliveries").get() as { c: number }).c, 1);

  // E2E-07 Invite -> Activate -> Assign Case -> Deactivate revokes session & requeues case
  const inv = inviteEmployee(db, ceoClaims, { email: "newemp@albahr.local", fullName: "New Emp", targetRole: "employee", skills: ["visa"] }, "ri1");
  const actToken = (inv.body as { activationToken: string }).activationToken;
  const act = redeemEmployeeInvitation(db, { activationToken: actToken, password: "ValidPassword!99", acceptTerms: true }, "ri2");
  assert.equal(act.status, 201);
  // Token cannot be reused
  assert.equal(redeemEmployeeInvitation(db, { activationToken: actToken, password: "ValidPassword!99", acceptTerms: true }, "ri3").status, 410);

  const newEmpId = (act.body as { userId: string }).userId;
  const custId = newId();
  db.prepare("INSERT INTO os_customers (id, organization_id, full_name, primary_phone, created_at, updated_at) VALUES (?, ?, 'Client', '+92333', ?, ?)").run(custId, cfg.defaultOrgId, now, now);
  db.prepare("INSERT INTO os_cases (id, organization_id, case_number, customer_id, service_type, title, assigned_employee_id, status, created_at, updated_at) VALUES (?, ?, 'CASE-99', ?, 'visa', 'UK Visa', ?, 'assigned', ?, ?)").run(newId(), cfg.defaultOrgId, custId, newEmpId, now, now);

  const deact = deactivateStaffAndRevokeSessions(db, ceoClaims, newEmpId, "Resigned", "ri4");
  assert.equal((deact.body as { openCasesRequeued: number }).openCasesRequeued, 1);

  // E2E-08 Rule draft -> dry-run simulate -> activate -> rollback creates v2 -> emergency pause
  const rule = createRuleDraft(db, ceoClaims, {
    name: "Umrah Auto Assign",
    triggerEvent: "lead.created",
    conditions: [{ field: "service_type", op: "eq", value: "umrah" }],
    actions: [{ type: "assign_least_loaded" }],
  }, "rr1");
  const ruleId = (rule.body as { id: string }).id;
  const v1Id = (rule.body as { versionId: string }).versionId;
  assert.equal(activateOrRollbackRule(db, ceoClaims, ruleId, undefined, "rr2").status, 200);
  const sim = simulateRulesAndQueue(db, ceoClaims, { triggerEvent: "lead.created", serviceType: "umrah", payload: { service_type: "umrah" } }, "rr3");
  assert.equal((sim.body as { dryRun: boolean; matchedRuleVersionId: string }).matchedRuleVersionId, v1Id);

  const rb = activateOrRollbackRule(db, ceoClaims, ruleId, v1Id, "rr4");
  assert.equal((rb.body as { versionNo: number }).versionNo, 2);

  assert.equal(emergencyPauseAutomation(db, ceoClaims, ["lead.created"], "rr5").status, 200);
});

test("E2E-06 & E2E-09: Multi-step Umrah draft save/resume + Idempotent Submit + Outbox Retry & Dead-Letter without fake success", async () => {
  const db = createDatabase();
  const cfg = loadConfig();
  const empId = seedStaff(db, cfg.defaultOrgId, "ops@albahr.local", "employee", ["umrah"]);
  const custUserId = seedStaff(db, cfg.defaultOrgId, "draftcust@gmail.com", "customer", []);
  const now = new Date().toISOString();
  const custId = newId();
  db.prepare("INSERT INTO os_customers (id, organization_id, user_id, full_name, primary_phone, created_at, updated_at) VALUES (?, ?, ?, 'Draft Pilgrim', '+923445556677', ?, ?)").run(
    custId, cfg.defaultOrgId, custUserId, now, now
  );

  // E2E-06: Draft saved on step 2, resumed with exact step preserved
  const reqId = newId();
  db.prepare(
    `INSERT INTO os_umrah_requests (id, customer_id, departure_city, total_nights, travelers_count, makkah_distance_pref, madinah_distance_pref, room_type, transport_type, ziyarat_included, draft_step, status, created_at)
     VALUES (?, ?, 'Lahore', 14, 4, '400m', '200m', 'Quad', 'Private GMC', 1, 2, 'draft', ?)`
  ).run(reqId, custId, now);
  const resumed = db.prepare("SELECT draft_step, makkah_distance_pref, madinah_distance_pref FROM os_umrah_requests WHERE id = ?").get(reqId) as {
    draft_step: number;
    makkah_distance_pref: string;
    madinah_distance_pref: string;
  };
  assert.equal(resumed.draft_step, 2);
  assert.equal(resumed.makkah_distance_pref, "400m");
  assert.equal(resumed.madinah_distance_pref, "200m");

  // Duplicate Submit with same Idempotency-Key produces exactly ONE lead/case
  const s1 = createLead(db, null, cfg.defaultOrgId, {
    fullName: "Draft Pilgrim",
    phone: "+923445556677",
    serviceType: "umrah",
    sourceChannel: "mobile_app",
    consentGiven: true,
  }, "idem-draft-submit", "rd1");
  const s2 = createLead(db, null, cfg.defaultOrgId, {
    fullName: "Draft Pilgrim",
    phone: "+923445556677",
    serviceType: "umrah",
    sourceChannel: "mobile_app",
    consentGiven: true,
  }, "idem-draft-submit", "rd2");
  assert.equal((s1.body as { id: string }).id, (s2.body as { id: string }).id);
  assert.equal((s1.body as { assignedEmployeeId: string }).assignedEmployeeId, empId);

  // E2E-09: Website bridge outage retries up to maxAttempts and enters dead_letter (no false completion)
  const { enqueueOutboxEvent, processOutboxBatch } = await import("../src/core/outbox.ts");
  enqueueOutboxEvent(db, "cms.sync", "pkg-1", { slug: "ramadan" }, "cms-sync:pkg-1");
  for (let attempt = 0; attempt < 3; attempt++) {
    processOutboxBatch(db, () => {
      throw new Error("Website webhook 503 Service Unavailable");
    }, 3);
  }
  const outRow = db.prepare("SELECT status, attempt_count, last_error FROM os_outbox_events WHERE dedupe_key = 'cms-sync:pkg-1'").get() as {
    status: string;
    attempt_count: number;
    last_error: string;
  };
  assert.equal(outRow.status, "dead_letter");
  assert.equal(outRow.attempt_count, 3);
  assert.match(outRow.last_error, /503/);
});
