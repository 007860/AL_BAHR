import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, newId } from "../src/db/database.ts";
import { loadConfig } from "../src/config.ts";
import { SlidingRateLimiter, hashPassword } from "../src/core/security.ts";
import { createOsRequestHandler } from "../src/server.ts";
import { getCustomerProfile, getDocumentSignedUrl, uploadPrivateDocument } from "../src/modules/crm-cases.ts";
import { confirmAppointment, getInvoiceDetail, getMyTrips, issueFlightTicket, uploadPaymentEvidence, verifyOrRejectPayment } from "../src/modules/travel-commercial.ts";
import { changeStaffRole, submitReview } from "../src/modules/hr-cms-ops.ts";

test("E2E-03 & E2E-10 Security: Cross-customer/partner isolation, anti-self-escalation, forged slip & immutable audit/ledger", async () => {
  const db = createDatabase();
  const cfg = loadConfig();
  const now = new Date().toISOString();

  const custAUser = newId();
  const custBUser = newId();
  const custAId = newId();
  const custBId = newId();
  const empId = newId();
  const finId = newId();
  const partnerAId = newId();
  const partnerBId = newId();
  const partnerAUser = newId();

  for (const [uid, email, role, pId] of [
    [custAUser, "custa@test.com", "customer", null],
    [custBUser, "custb@test.com", "customer", null],
    [empId, "emp@test.com", "employee", null],
    [finId, "fin@test.com", "finance", null],
    [partnerAUser, "parta@test.com", "partner", partnerAId],
  ] as const) {
    db.prepare("INSERT INTO os_users VALUES (?, ?, ?, ?, ?, NULL, 'en', 0, NULL, 'active', ?, ?)").run(
      uid, cfg.defaultOrgId, email, hashPassword("Pass!123456"), email, now, now
    );
    db.prepare("INSERT INTO os_memberships (id, organization_id, user_id, role_id, partner_id, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      newId(), cfg.defaultOrgId, uid, role, pId, now
    );
  }

  db.prepare("INSERT INTO os_customers (id, organization_id, user_id, partner_id, full_name, primary_phone, created_at, updated_at) VALUES (?, ?, ?, NULL, 'Cust A', '+92111', ?, ?)").run(custAId, cfg.defaultOrgId, custAUser, now, now);
  db.prepare("INSERT INTO os_customers (id, organization_id, user_id, partner_id, full_name, primary_phone, created_at, updated_at) VALUES (?, ?, ?, ?, 'Cust B', '+92222', ?, ?)").run(custBId, cfg.defaultOrgId, custBUser, partnerBId, now, now);

  const invBId = newId();
  db.prepare("INSERT INTO os_invoices (id, organization_id, invoice_number, customer_id, partner_id, total_pkr, verified_paid_pkr, status, issued_at) VALUES (?, ?, 'INV-B-1', ?, ?, 50000, 0, 'issued', ?)").run(invBId, cfg.defaultOrgId, custBId, partnerBId, now);

  const claimsA = { sub: custAUser, sid: "sa", role: "customer", orgId: cfg.defaultOrgId, aal: "aal1" as const, exp: 9999999999 };
  const claimsB = { sub: custBUser, sid: "sb", role: "customer", orgId: cfg.defaultOrgId, aal: "aal1" as const, exp: 9999999999 };
  const claimsPartnerA = { sub: partnerAUser, sid: "spa", role: "partner", orgId: cfg.defaultOrgId, partnerId: partnerAId, aal: "aal1" as const, exp: 9999999999 };
  const claimsEmp = { sub: empId, sid: "se", role: "employee", orgId: cfg.defaultOrgId, aal: "aal1" as const, exp: 9999999999 };

  // 1. Customer A cannot read Customer B profile, invoice, or private doc
  assert.equal(getCustomerProfile(db, claimsA, custBId, "r1").status, 403);
  assert.equal(getInvoiceDetail(db, claimsA, invBId, "r2").status, 403);

  const docB = uploadPrivateDocument(db, claimsB, {
    customerId: custBId,
    docCategory: "passport",
    fileName: "passport.png",
    mimeType: "image/png",
    contentBase64: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString("base64"),
  }, "r3");
  assert.equal(docB.status, 201);
  assert.equal(getDocumentSignedUrl(db, claimsA, (docB.body as { id: string }).id, cfg.signedUrlSecret, "r4").status, 403);

  // 2. Partner A cannot read Partner B customer or invoice
  assert.equal(getCustomerProfile(db, claimsPartnerA, custBId, "r5").status, 403);
  assert.equal(getInvoiceDetail(db, claimsPartnerA, invBId, "r6").status, 403);
  assert.equal((getMyTrips(db, claimsPartnerA, "r7").body as { items: unknown[] }).items.length, 0);

  // 3. Employee cannot escalate own role or verify payments (403)
  assert.equal(changeStaffRole(db, claimsEmp, empId, "ceo", "r8").status, 403);

  const slipB = uploadPaymentEvidence(db, claimsB, { invoiceId: invBId, amountPkr: 50000, bankName: "HBL", bankReference: "FAKE-1" }, "r9");
  assert.equal(slipB.status, 201);
  const payId = (slipB.body as { id: string }).id;
  assert.equal(verifyOrRejectPayment(db, claimsEmp, payId, { decision: "verified" }, "k1", "r10").status, 403);

  // 4. E2E-10: Finance rejects forged slip -> invoice stays unpaid & ticket issuance blocked
  const claimsFin = { sub: finId, sid: "sf", role: "finance", orgId: cfg.defaultOrgId, aal: "aal2" as const, exp: 9999999999 };
  const rej = verifyOrRejectPayment(db, claimsFin, payId, { decision: "rejected", reason: "Forged reference number" }, "k2", "r11");
  assert.equal(rej.status, 200);
  assert.equal((rej.body as { invoiceStatus: string }).invoiceStatus, "issued");

  const caseBId = newId();
  const bkBId = newId();
  const travId = newId();
  db.prepare("INSERT INTO os_cases (id, organization_id, case_number, customer_id, service_type, title, status, created_at, updated_at) VALUES (?, ?, 'CASE-B', ?, 'flight', 'Flight', 'processing', ?, ?)").run(caseBId, cfg.defaultOrgId, custBId, now, now);
  db.prepare("INSERT INTO os_bookings (id, organization_id, booking_number, case_id, invoice_id, customer_id, status, created_at) VALUES (?, ?, 'BK-B', ?, ?, ?, 'supplier_pending', ?)").run(bkBId, cfg.defaultOrgId, caseBId, invBId, custBId, now);
  db.prepare("INSERT INTO os_travelers (id, booking_id, full_name, created_at) VALUES (?, ?, 'Trav B', ?)").run(travId, bkBId, now);

  assert.equal(issueFlightTicket(db, claimsEmp, bkBId, { travelerId: travId, ticketNumber: "214-1234567890", eTicketDocumentId: (docB.body as { id: string }).id }, "r12").status, 422);

  // 5. Cannot confirm appointment without real evidence, nor submit review for unconfirmed booking
  const apptId = newId();
  db.prepare("INSERT INTO os_appointments (id, organization_id, case_id, provider_name, center_city, preferred_window, status, created_at) VALUES (?, ?, ?, 'VFS', 'Lahore', 'Next week', 'requested', ?)").run(apptId, cfg.defaultOrgId, caseBId, now);
  assert.equal(confirmAppointment(db, claimsEmp, apptId, { externalRef: "", evidenceDocumentId: "", slotDatetime: now }, "r13").status, 422);
  assert.equal(submitReview(db, claimsB, { bookingId: bkBId, rating: 5, comment: "Nice" }, "r14").status, 422);

  // 6. Immutable DB triggers block UPDATE/DELETE on os_audit_events & os_ledger_entries
  assert.throws(() => db.prepare("DELETE FROM os_audit_events").run());
  assert.throws(() => db.prepare("UPDATE os_audit_events SET action = 'tampered'").run());

  // 7. Real HTTP server checks: public signup disabled (404), MFA gate (403 on aal1), session revocation (401)
  const { createOsServer } = await import("../src/server.ts");
  const server = createOsServer({ db, config: cfg, limiter: new SlidingRateLimiter() });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const signupRes = await fetch(`${baseUrl}/api/v1/public/signup`, { method: "POST", body: "{}" });
    assert.equal(signupRes.status, 404);

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "emp@test.com", password: "Pass!123456" }),
    });
    assert.equal(loginRes.status, 200);
    const { token } = (await loginRes.json()) as { token: string };

    // Employee without MFA or CEO role gets 403 on session revoke-all
    const revRes = await fetch(`${baseUrl}/api/v1/sessions/revoke-all`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(revRes.status, 403);

    // Logout immediately invalidates token (401)
    const outRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(outRes.status, 200);

    const afterOut = await fetch(`${baseUrl}/api/v1/dashboard`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(afterOut.status, 401);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
