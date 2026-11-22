import type { DatabaseSync } from "node:sqlite";
import { newId, nextSequence } from "../db/database.ts";
import { recordAudit, runWithIdempotency } from "../core/audit-idempotency.ts";
import { enqueueOutboxEvent } from "../core/outbox.ts";
import { hasPermission } from "../core/rbac.ts";
import { toCsv, type SessionClaims } from "../core/security.ts";
import type { HttpResult } from "./crm-cases.ts";

// --- FLIGHTS (Option A: Supplier-Verified Fares, Default PKR 2,000/pax Configurable, Manual Ticket Issuance) ---

export function createFlightRequest(
  db: DatabaseSync,
  claims: SessionClaims,
  input: {
    caseId: string;
    originIata: string;
    destinationIata: string;
    departureDate: string;
    returnDate?: string;
    passengerCount: number;
    cabinClass?: string;
    baggageKg?: number;
  },
  requestId: string
): HttpResult {
  if (!input.caseId || !input.originIata || !input.destinationIata || !input.departureDate || input.passengerCount < 1) {
    return { status: 400, body: { code: "VALIDATION_ERROR", message: "Invalid flight request fields", requestId } };
  }
  const id = newId();
  db.prepare(
    `INSERT INTO os_flight_requests (id, case_id, origin_iata, destination_iata, departure_date, return_date, passenger_count, cabin_class, baggage_kg, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.caseId,
    input.originIata.toUpperCase(),
    input.destinationIata.toUpperCase(),
    input.departureDate,
    input.returnDate ?? null,
    input.passengerCount,
    input.cabinClass ?? "economy",
    input.baggageKg ?? 20,
    new Date().toISOString()
  );
  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "flight.request_created",
    resourceType: "flight_request",
    resourceId: id,
    requestId,
  });
  return { status: 201, body: { id } };
}

export function addVerifiedFlightFare(
  db: DatabaseSync,
  claims: SessionClaims,
  flightRequestId: string,
  input: {
    supplierId: string;
    netFarePerPaxPkr: number;
    overrideMarkupPerPaxPkr?: number;
    validUntil: string;
    pnrRef?: string;
  },
  requestId: string
): HttpResult {
  if (!["ceo", "manager", "employee"].includes(claims.role)) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Only authorized staff can enter supplier fares", requestId } };
  }
  if (input.netFarePerPaxPkr <= 0 || new Date(input.validUntil).getTime() <= Date.now()) {
    return { status: 400, body: { code: "VALIDATION_ERROR", message: "Positive fare and future validity expiry are required", requestId } };
  }

  const reqRow = db.prepare("SELECT passenger_count FROM os_flight_requests WHERE id = ?").get(flightRequestId) as
    | { passenger_count: number }
    | undefined;
  if (!reqRow) return { status: 404, body: { code: "NOT_FOUND", message: "Flight request not found", requestId } };

  const settings = db
    .prepare("SELECT default_flight_markup_pkr FROM os_company_settings WHERE organization_id = ?")
    .get(claims.orgId) as { default_flight_markup_pkr: number };

  let markupPerPax = settings.default_flight_markup_pkr;
  if (input.overrideMarkupPerPaxPkr !== undefined && input.overrideMarkupPerPaxPkr !== markupPerPax) {
    const ov = hasPermission(claims, "quote:override_markup");
    if (!ov.ok) return { status: 403, body: { code: "FORBIDDEN", message: "Only CEO can override default flight markup", requestId } };
    if (input.overrideMarkupPerPaxPkr < 0) {
      return { status: 400, body: { code: "VALIDATION_ERROR", message: "Markup cannot be negative", requestId } };
    }
    markupPerPax = input.overrideMarkupPerPaxPkr;
  }

  const totalSellingPkr = (input.netFarePerPaxPkr + markupPerPax) * reqRow.passenger_count;
  const id = newId();
  db.prepare(
    `INSERT INTO os_fare_quotes (
      id, flight_request_id, supplier_id, net_fare_per_pax_pkr, markup_per_pax_pkr,
      total_selling_pkr, valid_until, pnr_ref, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, flightRequestId, input.supplierId, input.netFarePerPaxPkr, markupPerPax,
    totalSellingPkr, input.validUntil, input.pnrRef ?? null, claims.sub, new Date().toISOString()
  );

  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "flight.fare_added",
    resourceType: "fare_quote",
    resourceId: id,
    after: { passengerCount: reqRow.passenger_count, markupPerPax, totalSellingPkr },
    requestId,
  });

  return {
    status: 201,
    body: {
      id,
      passengerCount: reqRow.passenger_count,
      netFarePerPaxPkr: input.netFarePerPaxPkr,
      markupPerPaxPkr: markupPerPax,
      totalSellingPkr,
      validUntil: input.validUntil,
    },
  };
}

export function issueFlightTicket(
  db: DatabaseSync,
  claims: SessionClaims,
  bookingId: string,
  input: { travelerId: string; ticketNumber: string; eTicketDocumentId: string },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "flight:issue_ticket");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
  if (!input.ticketNumber?.trim() || !input.eTicketDocumentId) {
    return { status: 400, body: { code: "EVIDENCE_REQUIRED", message: "Real supplier ticket number and uploaded E-ticket PDF are required", requestId } };
  }

  const booking = db.prepare("SELECT id, invoice_id, status FROM os_bookings WHERE id = ?").get(bookingId) as
    | { id: string; invoice_id: string | null; status: string }
    | undefined;
  if (!booking) return { status: 404, body: { code: "NOT_FOUND", message: "Booking not found", requestId } };

  // Hard block before verified payment!
  if (!booking.invoice_id) {
    return { status: 422, body: { code: "PAYMENT_REQUIRED", message: "Cannot issue ticket without linked verified invoice", requestId } };
  }
  const verifiedPayment = db
    .prepare("SELECT id FROM os_payments WHERE invoice_id = ? AND status = 'verified' LIMIT 1")
    .get(booking.invoice_id);
  if (!verifiedPayment) {
    return { status: 422, body: { code: "PAYMENT_UNVERIFIED", message: "Cannot issue ticket until Finance verifies payment receipt", requestId } };
  }

  const doc = db.prepare("SELECT id FROM os_documents WHERE id = ? AND archived_at IS NULL").get(input.eTicketDocumentId);
  if (!doc) return { status: 404, body: { code: "DOC_NOT_FOUND", message: "Uploaded E-ticket document not found", requestId } };

  const now = new Date().toISOString();
  db.prepare("UPDATE os_travelers SET ticket_number = ?, voucher_document_id = ? WHERE id = ? AND booking_id = ?").run(
    input.ticketNumber.trim(),
    input.eTicketDocumentId,
    input.travelerId,
    bookingId
  );
  db.prepare("UPDATE os_bookings SET status = 'documents_issued', confirmed_by = ?, confirmed_at = ? WHERE id = ?").run(
    claims.sub,
    now,
    bookingId
  );

  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "flight.ticket_issued",
    resourceType: "booking",
    resourceId: bookingId,
    after: { travelerId: input.travelerId, ticketNumber: input.ticketNumber.trim() },
    requestId,
  });

  return { status: 200, body: { bookingId, status: "documents_issued", ticketNumber: input.ticketNumber.trim() } };
}

// --- UMRAH & HAJJ (Separate Makkah/Madinah Distances, Authoritative Package, Publish/Expire Preserving Bookings) ---

export function createUmrahPackage(
  db: DatabaseSync,
  claims: SessionClaims,
  input: {
    pkgNo: string;
    title: string;
    departureCity: string;
    airline: string;
    route: string;
    totalNights: number;
    makkahHotel: string;
    makkahDistanceM: number;
    makkahNights: number;
    madinahHotel: string;
    madinahDistanceM: number;
    madinahNights: number;
    priceSharingPkr: number;
    priceQuadPkr: number;
    priceTriplePkr: number;
    priceDoublePkr: number;
    inclusions?: string[];
    expiresAt?: string;
  },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "cms:draft");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  if (input.makkahDistanceM < 0 || input.madinahDistanceM < 0 || !input.makkahHotel || !input.madinahHotel) {
    return { status: 400, body: { code: "VALIDATION_ERROR", message: "Makkah and Madinah hotel details and distances must be captured separately", requestId } };
  }

  const id = newId();
  db.prepare(
    `INSERT INTO os_umrah_packages (
      id, organization_id, pkg_no, title, departure_city, airline, route, total_nights,
      makkah_hotel, makkah_distance_m, makkah_nights, madinah_hotel, madinah_distance_m, madinah_nights,
      price_sharing_pkr, price_quad_pkr, price_triple_pkr, price_double_pkr, inclusions_json,
      status, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
  ).run(
    id, claims.orgId, input.pkgNo, input.title, input.departureCity, input.airline, input.route,
    input.totalNights, input.makkahHotel, input.makkahDistanceM, input.makkahNights,
    input.madinahHotel, input.madinahDistanceM, input.madinahNights,
    input.priceSharingPkr, input.priceQuadPkr, input.priceTriplePkr, input.priceDoublePkr,
    JSON.stringify(input.inclusions ?? []), input.expiresAt ?? null, new Date().toISOString()
  );

  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "umrah.package_created",
    resourceType: "umrah_package",
    resourceId: id,
    after: { pkgNo: input.pkgNo, makkahDistanceM: input.makkahDistanceM, madinahDistanceM: input.madinahDistanceM },
    requestId,
  });

  return { status: 201, body: { id, pkgNo: input.pkgNo, status: "draft" } };
}

export function publishOrExpireUmrahPackage(
  db: DatabaseSync,
  claims: SessionClaims,
  pkgId: string,
  action: "publish" | "unpublish" | "expire",
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "cms:publish");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const pkg = db.prepare("SELECT * FROM os_umrah_packages WHERE id = ?").get(pkgId) as { id: string; status: string } | undefined;
  if (!pkg) return { status: 404, body: { code: "NOT_FOUND", message: "Package not found", requestId } };

  const targetStatus = action === "publish" ? "published" : action === "unpublish" ? "unpublished" : "expired";
  db.prepare("UPDATE os_umrah_packages SET status = ? WHERE id = ?").run(targetStatus, pkgId);

  if (action === "expire") {
    enqueueOutboxEvent(db, "package.expired", pkgId, { packageId: pkgId }, `pkg.expire:${pkgId}`);
  }
  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: `umrah.package_${action}`,
    resourceType: "umrah_package",
    resourceId: pkgId,
    before: { status: pkg.status },
    after: { status: targetStatus },
    requestId,
  });
  return { status: 200, body: { id: pkgId, status: targetStatus } };
}

export function listPublicActiveUmrahPackages(db: DatabaseSync, orgId: string): HttpResult {
  const now = new Date().toISOString();
  // Automatically hides expired or unpublished offers
  db.prepare("UPDATE os_umrah_packages SET status = 'expired' WHERE status = 'published' AND expires_at IS NOT NULL AND expires_at <= ?").run(now);
  const rows = db
    .prepare("SELECT * FROM os_umrah_packages WHERE organization_id = ? AND status = 'published' ORDER BY created_at DESC")
    .all(orgId);
  return { status: 200, body: { items: rows } };
}

// --- VISAS, APPOINTMENTS, HOTELS & STUDY ABROAD (Evidence-Required Confirmations) ---

export function confirmAppointment(
  db: DatabaseSync,
  claims: SessionClaims,
  appointmentId: string,
  input: { externalRef: string; evidenceDocumentId: string; slotDatetime: string },
  requestId: string
): HttpResult {
  if (!["ceo", "manager", "employee"].includes(claims.role)) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Staff authorization required", requestId } };
  }
  if (!input.externalRef?.trim() || !input.evidenceDocumentId || !input.slotDatetime) {
    return { status: 422, body: { code: "EVIDENCE_REQUIRED", message: "Appointment cannot be confirmed without provider reference and uploaded confirmation slip", requestId } };
  }
  const doc = db.prepare("SELECT id FROM os_documents WHERE id = ? AND archived_at IS NULL").get(input.evidenceDocumentId);
  if (!doc) return { status: 404, body: { code: "DOC_NOT_FOUND", message: "Evidence document not found", requestId } };

  db.prepare("UPDATE os_appointments SET status = 'confirmed', external_ref = ?, evidence_document_id = ?, slot_datetime = ? WHERE id = ?").run(
    input.externalRef.trim(),
    input.evidenceDocumentId,
    input.slotDatetime,
    appointmentId
  );
  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "appointment.confirmed",
    resourceType: "appointment",
    resourceId: appointmentId,
    after: { externalRef: input.externalRef.trim() },
    requestId,
  });
  return { status: 200, body: { id: appointmentId, status: "confirmed", externalRef: input.externalRef.trim() } };
}

// --- UNIFIED QUOTES & PROPOSALS ---

export interface QuoteLineInput {
  description: string;
  qty: number;
  unitCostPkr: number;
  unitSellingPkr: number;
  taxPkr?: number;
}

export function createQuote(
  db: DatabaseSync,
  claims: SessionClaims,
  input: { customerId: string; caseId?: string; validUntil: string; lines: QuoteLineInput[] },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "quote:create");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
  if (!input.customerId || !input.validUntil || !Array.isArray(input.lines) || input.lines.length === 0) {
    return { status: 400, body: { code: "VALIDATION_ERROR", message: "customerId, validUntil, and at least one line item are required", requestId } };
  }

  let supplierCost = 0;
  let totalSelling = 0;
  let totalTax = 0;
  for (const l of input.lines) {
    if (l.qty <= 0 || l.unitCostPkr < 0 || l.unitSellingPkr < 0) {
      return { status: 400, body: { code: "VALIDATION_ERROR", message: "Line quantities and prices must be valid positive numbers", requestId } };
    }
    supplierCost += l.qty * l.unitCostPkr;
    totalTax += l.taxPkr ?? 0;
    totalSelling += l.qty * l.unitSellingPkr + (l.taxPkr ?? 0);
  }
  const markup = totalSelling - totalTax - supplierCost;
  if (markup < 0) {
    const ov = hasPermission(claims, "quote:override_markup");
    if (!ov.ok) return { status: 403, body: { code: "FORBIDDEN", message: "Selling below supplier cost requires CEO override", requestId } };
  }

  const cust = db.prepare("SELECT partner_id FROM os_customers WHERE id = ?").get(input.customerId) as { partner_id: string | null } | undefined;
  if (!cust) return { status: 404, body: { code: "NOT_FOUND", message: "Customer not found", requestId } };

  const quoteId = newId();
  const quoteNumber = nextSequence(db, "quote", "QT");
  const versionId = newId();
  const now = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO os_quotes (id, organization_id, quote_number, case_id, customer_id, partner_id, status, active_version, valid_until, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?)`
    ).run(quoteId, claims.orgId, quoteNumber, input.caseId ?? null, input.customerId, cust.partner_id, input.validUntil, claims.sub, now, now);

    db.prepare(
      `INSERT INTO os_quote_versions (id, quote_id, version_no, supplier_cost_pkr, markup_pkr, tax_pkr, total_selling_pkr, lines_json, created_by, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`
    ).run(versionId, quoteId, supplierCost, markup, totalTax, totalSelling, JSON.stringify(input.lines), claims.sub, now);

    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "quote.created",
      resourceType: "quote",
      resourceId: quoteId,
      after: { quoteNumber, totalSellingPkr: totalSelling },
      requestId,
    });
    db.exec("COMMIT");
    return { status: 201, body: { id: quoteId, quoteNumber, versionNo: 1, totalSellingPkr: totalSelling, status: "draft" } };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function sendQuote(db: DatabaseSync, claims: SessionClaims, quoteId: string, requestId: string): HttpResult {
  const perm = hasPermission(claims, "quote:send");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const quote = db.prepare("SELECT * FROM os_quotes WHERE id = ?").get(quoteId) as
    | { id: string; active_version: number; valid_until: string; status: string }
    | undefined;
  if (!quote) return { status: 404, body: { code: "NOT_FOUND", message: "Quote not found", requestId } };
  if (new Date(quote.valid_until).getTime() <= Date.now()) {
    return { status: 422, body: { code: "QUOTE_EXPIRED", message: "Cannot send an expired quote; revise validity first", requestId } };
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE os_quotes SET status = 'sent', updated_at = ? WHERE id = ?").run(now, quoteId);
  db.prepare("UPDATE os_quote_versions SET frozen_at = ? WHERE quote_id = ? AND version_no = ?").run(now, quoteId, quote.active_version);
  enqueueOutboxEvent(db, "quote.sent", quoteId, { quoteId, versionNo: quote.active_version }, `quote.sent:${quoteId}:v${quote.active_version}`);

  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "quote.sent",
    resourceType: "quote",
    resourceId: quoteId,
    requestId,
  });

  return { status: 200, body: { id: quoteId, status: "sent", versionNo: quote.active_version } };
}

export function acceptQuoteAndDraftInvoice(
  db: DatabaseSync,
  claims: SessionClaims,
  quoteId: string,
  idemKey: string | undefined,
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "quote:accept");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  return runWithIdempotency(db, idemKey, claims.sub, `POST:/api/v1/quotes/${quoteId}/accept`, { quoteId }, () => {
    const quote = db
      .prepare(
        `SELECT q.*, c.user_id as cust_user_id, c.partner_id as cust_partner_id
         FROM os_quotes q JOIN os_customers c ON c.id = q.customer_id
         WHERE q.id = ?`
      )
      .get(quoteId) as
      | {
          id: string;
          organization_id: string;
          case_id: string | null;
          customer_id: string;
          partner_id: string | null;
          status: string;
          active_version: number;
          valid_until: string;
          cust_user_id: string | null;
          cust_partner_id: string | null;
        }
      | undefined;

    if (!quote) return { status: 404, body: { code: "NOT_FOUND", message: "Quote not found", requestId } };
    if (claims.role === "customer" && quote.cust_user_id !== claims.sub) {
      return { status: 403, body: { code: "FORBIDDEN", message: "Cannot accept another customer's quote", requestId } };
    }
    if (claims.role === "partner" && quote.cust_partner_id !== claims.partnerId) {
      return { status: 403, body: { code: "FORBIDDEN", message: "Cannot accept another agency's quote", requestId } };
    }
    if (new Date(quote.valid_until).getTime() <= Date.now()) {
      db.prepare("UPDATE os_quotes SET status = 'expired' WHERE id = ?").run(quoteId);
      return { status: 422, body: { code: "QUOTE_EXPIRED", message: "Quote has expired and cannot be accepted", requestId } };
    }
    if (quote.status === "accepted") {
      const existingInv = db.prepare("SELECT id, invoice_number, total_pkr, status FROM os_invoices WHERE quote_id = ?").get(quoteId);
      return { status: 200, body: { quoteId, status: "accepted", invoice: existingInv, deduplicated: true } };
    }
    if (quote.status !== "sent") {
      return { status: 422, body: { code: "INVALID_STATE", message: `Quote must be 'sent' before acceptance (current: ${quote.status})`, requestId } };
    }

    const qv = db
      .prepare("SELECT * FROM os_quote_versions WHERE quote_id = ? AND version_no = ?")
      .get(quoteId, quote.active_version) as { id: string; total_selling_pkr: number };

    const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("UPDATE os_quotes SET status = 'accepted', updated_at = ? WHERE id = ?").run(now, quoteId);
      db.prepare("INSERT INTO os_quote_acceptances (id, quote_id, quote_version_id, accepted_by, accepted_at) VALUES (?, ?, ?, ?, ?)").run(
        newId(),
        quoteId,
        qv.id,
        claims.sub,
        now
      );

      // OnQuoteAccepted -> generate invoice exactly once
      const existingInv = db.prepare("SELECT id, invoice_number, total_pkr, status FROM os_invoices WHERE quote_version_id = ?").get(qv.id) as
        | { id: string; invoice_number: string; total_pkr: number; status: string }
        | undefined;
      let invoice = existingInv;
      if (!invoice) {
        const invId = newId();
        const invNum = nextSequence(db, "invoice", "INV");
        db.prepare(
          `INSERT INTO os_invoices (
            id, organization_id, invoice_number, quote_id, quote_version_id, case_id, customer_id, partner_id,
            total_pkr, verified_paid_pkr, status, issued_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'issued', ?)`
        ).run(invId, quote.organization_id, invNum, quoteId, qv.id, quote.case_id, quote.customer_id, quote.partner_id, qv.total_selling_pkr, now);

        db.prepare(
          `INSERT INTO os_ledger_entries (id, organization_id, entry_ym, account_code, direction, amount_pkr, reference_type, reference_id, posted_by, created_at)
           VALUES (?, ?, ?, 'receivable', 'debit', ?, 'invoice', ?, ?, ?)`
        ).run(newId(), quote.organization_id, now.slice(0, 7), qv.total_selling_pkr, invId, claims.sub, now);

        invoice = { id: invId, invoice_number: invNum, total_pkr: qv.total_selling_pkr, status: "issued" };
      }

      enqueueOutboxEvent(db, "invoice.issued", invoice.id, { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number }, `inv.issued:${invoice.id}`);
      recordAudit(db, {
        organizationId: quote.organization_id,
        actorUserId: claims.sub,
        actorRole: claims.role,
        action: "quote.accepted_invoice_issued",
        resourceType: "quote",
        resourceId: quoteId,
        after: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number },
        requestId,
      });

      db.exec("COMMIT");
      return { status: 200, body: { quoteId, status: "accepted", invoice } };
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  });
}

// --- INVOICES, MANUAL BANK EVIDENCE & FINANCE VERIFICATION (Upload != Verified) ---

export function uploadPaymentEvidence(
  db: DatabaseSync,
  claims: SessionClaims,
  input: { invoiceId: string; amountPkr: number; bankName: string; bankReference: string; evidenceDocumentId?: string },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "payment:upload_slip");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  if (!input.invoiceId || input.amountPkr <= 0 || !input.bankName?.trim() || !input.bankReference?.trim()) {
    return { status: 400, body: { code: "VALIDATION_ERROR", message: "invoiceId, positive amountPkr, bankName, and bankReference are required", requestId } };
  }

  const inv = db
    .prepare("SELECT i.*, c.user_id as cust_user_id FROM os_invoices i JOIN os_customers c ON c.id = i.customer_id WHERE i.id = ?")
    .get(input.invoiceId) as
    | { id: string; customer_id: string; total_pkr: number; verified_paid_pkr: number; status: string; cust_user_id: string | null }
    | undefined;
  if (!inv) return { status: 404, body: { code: "NOT_FOUND", message: "Invoice not found", requestId } };
  if (claims.role === "customer" && inv.cust_user_id !== claims.sub) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Cannot upload slip for another customer's invoice", requestId } };
  }
  if (inv.status === "void" || inv.status === "paid") {
    return { status: 422, body: { code: "INVALID_STATE", message: `Invoice is '${inv.status}'`, requestId } };
  }

  const paymentId = newId();
  const now = new Date().toISOString();
  // ALWAYS pending_review — NEVER marks invoice paid automatically!
  db.prepare(
    `INSERT INTO os_payments (
      id, organization_id, invoice_id, customer_id, amount_pkr, bank_name, bank_reference,
      evidence_document_id, status, submitted_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)`
  ).run(paymentId, claims.orgId, inv.id, inv.customer_id, input.amountPkr, input.bankName.trim(), input.bankReference.trim(), input.evidenceDocumentId ?? null, claims.sub, now);

  enqueueOutboxEvent(db, "payment.evidence_received", paymentId, { paymentId, invoiceId: inv.id }, `pay.ev:${paymentId}`);
  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "payment.evidence_uploaded",
    resourceType: "payment",
    resourceId: paymentId,
    after: { status: "pending_review", amountPkr: input.amountPkr, bankReference: input.bankReference.trim() },
    requestId,
  });

  return { status: 201, body: { id: paymentId, status: "pending_review", invoiceStatus: inv.status } };
}

export function verifyOrRejectPayment(
  db: DatabaseSync,
  claims: SessionClaims,
  paymentId: string,
  input: { decision: "verified" | "rejected"; reason?: string },
  idemKey: string | undefined,
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "payment:verify");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  return runWithIdempotency(db, idemKey, claims.sub, `POST:/api/v1/payments/${paymentId}/${input.decision}`, input, () => {
    const pay = db.prepare("SELECT * FROM os_payments WHERE id = ?").get(paymentId) as
      | { id: string; organization_id: string; invoice_id: string; amount_pkr: number; status: string; submitted_by: string }
      | undefined;
    if (!pay) return { status: 404, body: { code: "NOT_FOUND", message: "Payment record not found", requestId } };

    if (pay.submitted_by === claims.sub && claims.role !== "ceo") {
      return { status: 403, body: { code: "SEGREGATION_OF_DUTIES", message: "Staff cannot verify payment evidence they submitted", requestId } };
    }
    if (pay.status === "verified" && input.decision === "verified") {
      return { status: 200, body: { id: paymentId, status: "verified", deduplicated: true } };
    }
    if (pay.status !== "pending_review") {
      return { status: 422, body: { code: "INVALID_STATE", message: `Payment already '${pay.status}'`, requestId } };
    }
    if (input.decision === "rejected" && !input.reason?.trim()) {
      return { status: 400, body: { code: "REASON_REQUIRED", message: "Rejection reason is required (e.g., bank slip forged or mismatched)", requestId } };
    }

    const inv = db.prepare("SELECT * FROM os_invoices WHERE id = ?").get(pay.invoice_id) as
      | { id: string; total_pkr: number; verified_paid_pkr: number; status: string }
      | undefined;
    if (!inv) return { status: 404, body: { code: "NOT_FOUND", message: "Linked invoice not found", requestId } };

    const now = new Date().toISOString();
    const ym = now.slice(0, 7);
    const period = db.prepare("SELECT locked FROM os_accounting_periods WHERE period_ym = ?").get(ym) as { locked: number } | undefined;
    if (period?.locked === 1) {
      return { status: 409, body: { code: "PERIOD_LOCKED", message: `Accounting period ${ym} is locked`, requestId } };
    }

    db.exec("BEGIN IMMEDIATE");
    try {
      if (input.decision === "rejected") {
        db.prepare("UPDATE os_payments SET status = 'rejected', reviewed_by = ?, review_reason = ?, reviewed_at = ? WHERE id = ?").run(
          claims.sub,
          input.reason!.trim(),
          now,
          paymentId
        );
        enqueueOutboxEvent(db, "payment.rejected", paymentId, { paymentId, reason: input.reason!.trim() }, `pay.rej:${paymentId}`);
        recordAudit(db, {
          organizationId: pay.organization_id,
          actorUserId: claims.sub,
          actorRole: claims.role,
          action: "payment.rejected",
          resourceType: "payment",
          resourceId: paymentId,
          reason: input.reason!.trim(),
          requestId,
        });
        db.exec("COMMIT");
        return { status: 200, body: { id: paymentId, status: "rejected", invoiceStatus: inv.status } };
      }

      const newPaid = inv.verified_paid_pkr + pay.amount_pkr;
      if (newPaid > inv.total_pkr) {
        db.exec("ROLLBACK");
        return { status: 422, body: { code: "OVERPAYMENT", message: "Verified amount exceeds invoice balance due", requestId } };
      }
      const nextInvStatus = newPaid === inv.total_pkr ? "paid" : "partially_paid";

      db.prepare("UPDATE os_payments SET status = 'verified', reviewed_by = ?, review_reason = ?, reviewed_at = ? WHERE id = ?").run(
        claims.sub,
        input.reason?.trim() ?? "Reconciled against bank statement",
        now,
        paymentId
      );
      db.prepare("UPDATE os_invoices SET verified_paid_pkr = ?, status = ? WHERE id = ?").run(newPaid, nextInvStatus, inv.id);

      // Append-only ledger posting (exactly once per payment)
      db.prepare(
        `INSERT INTO os_ledger_entries (id, organization_id, entry_ym, account_code, direction, amount_pkr, reference_type, reference_id, posted_by, created_at)
         VALUES (?, ?, ?, 'bank_cleared', 'debit', ?, 'payment', ?, ?, ?)`
      ).run(newId(), pay.organization_id, ym, pay.amount_pkr, paymentId, claims.sub, now);
      db.prepare(
        `INSERT INTO os_ledger_entries (id, organization_id, entry_ym, account_code, direction, amount_pkr, reference_type, reference_id, posted_by, created_at)
         VALUES (?, ?, ?, 'receivable', 'credit', ?, 'payment', ?, ?, ?)`
      ).run(newId(), pay.organization_id, ym, pay.amount_pkr, paymentId, claims.sub, now);

      enqueueOutboxEvent(db, "payment.verified", paymentId, { paymentId, invoiceId: inv.id, invoiceStatus: nextInvStatus }, `pay.ver:${paymentId}`);
      recordAudit(db, {
        organizationId: pay.organization_id,
        actorUserId: claims.sub,
        actorRole: claims.role,
        action: "payment.verified",
        resourceType: "payment",
        resourceId: paymentId,
        after: { amountPkr: pay.amount_pkr, invoiceStatus: nextInvStatus },
        requestId,
      });

      db.exec("COMMIT");
      return { status: 200, body: { id: paymentId, status: "verified", invoiceStatus: nextInvStatus, verifiedPaidPkr: newPaid } };
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  });
}

export function getInvoiceDetail(db: DatabaseSync, claims: SessionClaims, invoiceId: string, requestId: string): HttpResult {
  const inv = db
    .prepare("SELECT i.*, c.user_id as cust_user_id, c.partner_id as cust_partner_id FROM os_invoices i JOIN os_customers c ON c.id = i.customer_id WHERE i.id = ?")
    .get(invoiceId) as { id: string; cust_user_id: string | null; cust_partner_id: string | null } | undefined;
  if (!inv) return { status: 404, body: { code: "NOT_FOUND", message: "Invoice not found", requestId } };
  if (claims.role === "customer" && inv.cust_user_id !== claims.sub) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Cross-customer invoice access denied", requestId } };
  }
  if (claims.role === "partner" && inv.cust_partner_id !== claims.partnerId) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Cross-partner invoice access denied", requestId } };
  }
  const payments = db.prepare("SELECT id, amount_pkr, bank_name, bank_reference, status, review_reason, created_at FROM os_payments WHERE invoice_id = ?").all(invoiceId);
  return { status: 200, body: { invoice: inv, payments } };
}

export function readLedgerAndExport(db: DatabaseSync, claims: SessionClaims, exportCsv: boolean, requestId: string): HttpResult {
  const perm = hasPermission(claims, "ledger:read");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const entries = db.prepare("SELECT * FROM os_ledger_entries WHERE organization_id = ? ORDER BY created_at DESC LIMIT 200").all(claims.orgId) as Array<{
    id: string;
    entry_ym: string;
    account_code: string;
    direction: string;
    amount_pkr: number;
    reference_type: string;
    reference_id: string;
    created_at: string;
  }>;

  if (exportCsv) {
    const csv = toCsv(
      ["Entry ID", "Period", "Account", "Direction", "Amount PKR", "Ref Type", "Ref ID", "Created At"],
      entries.map((e) => [e.id, e.entry_ym, e.account_code, e.direction, e.amount_pkr, e.reference_type, e.reference_id, e.created_at])
    );
    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "ledger.export_csv",
      resourceType: "ledger",
      resourceId: claims.orgId,
      requestId,
    });
    return { status: 200, body: { csv, watermark: `FINANCE_EXPORT_${claims.sub}` } };
  }

  return { status: 200, body: { items: entries } };
}

// --- BOOKINGS & MY TRIPS (Supplier Evidence Required + Customer Isolation) ---

export function createBookingAndConfirmSupplier(
  db: DatabaseSync,
  claims: SessionClaims,
  input: {
    caseId: string;
    customerId: string;
    quoteId?: string;
    invoiceId?: string;
    supplierId?: string;
    packageSnapshot?: Record<string, unknown>;
    travelerFullName: string;
  },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "booking:create");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const bookingId = newId();
  const bookingNumber = nextSequence(db, "booking", "BK");
  const travelerId = newId();
  const now = new Date().toISOString();
  const cust = db.prepare("SELECT partner_id FROM os_customers WHERE id = ?").get(input.customerId) as { partner_id: string | null } | undefined;

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO os_bookings (
        id, organization_id, booking_number, case_id, quote_id, invoice_id, customer_id, partner_id,
        supplier_id, package_snapshot_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'supplier_pending', ?)`
    ).run(
      bookingId, claims.orgId, bookingNumber, input.caseId, input.quoteId ?? null, input.invoiceId ?? null,
      input.customerId, cust?.partner_id ?? null, input.supplierId ?? null,
      input.packageSnapshot ? JSON.stringify(input.packageSnapshot) : null, now
    );
    db.prepare("INSERT INTO os_travelers (id, booking_id, full_name, created_at) VALUES (?, ?, ?, ?)").run(
      travelerId,
      bookingId,
      input.travelerFullName,
      now
    );
    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "booking.created",
      resourceType: "booking",
      resourceId: bookingId,
      after: { bookingNumber },
      requestId,
    });
    db.exec("COMMIT");
    return { status: 201, body: { id: bookingId, bookingNumber, travelerId, status: "supplier_pending" } };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function confirmSupplierBooking(
  db: DatabaseSync,
  claims: SessionClaims,
  bookingId: string,
  input: { supplierPnrRef: string; voucherDocumentId: string; travelerId?: string },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "booking:confirm_supplier");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
  if (!input.supplierPnrRef?.trim() || !input.voucherDocumentId) {
    return { status: 422, body: { code: "EVIDENCE_REQUIRED", message: "Real supplier reference and uploaded voucher PDF are mandatory", requestId } };
  }

  const doc = db.prepare("SELECT id FROM os_documents WHERE id = ? AND archived_at IS NULL").get(input.voucherDocumentId);
  if (!doc) return { status: 404, body: { code: "DOC_NOT_FOUND", message: "Voucher document not found", requestId } };

  const now = new Date().toISOString();
  db.prepare("UPDATE os_bookings SET supplier_pnr_ref = ?, status = 'confirmed', confirmed_by = ?, confirmed_at = ? WHERE id = ?").run(
    input.supplierPnrRef.trim(),
    claims.sub,
    now,
    bookingId
  );
  if (input.travelerId) {
    db.prepare("UPDATE os_travelers SET voucher_document_id = ? WHERE id = ? AND booking_id = ?").run(
      input.voucherDocumentId,
      input.travelerId,
      bookingId
    );
  }
  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "booking.supplier_confirmed",
    resourceType: "booking",
    resourceId: bookingId,
    after: { supplierPnrRef: input.supplierPnrRef.trim() },
    requestId,
  });
  return { status: 200, body: { id: bookingId, status: "confirmed", supplierPnrRef: input.supplierPnrRef.trim() } };
}

export function getMyTrips(db: DatabaseSync, claims: SessionClaims, requestId: string): HttpResult {
  if (claims.role === "customer") {
    const cust = db.prepare("SELECT id FROM os_customers WHERE user_id = ? AND archived_at IS NULL").get(claims.sub) as { id: string } | undefined;
    if (!cust) return { status: 200, body: { items: [] } };
    const items = db
      .prepare(
        `SELECT b.id, b.booking_number, b.status, b.supplier_pnr_ref, b.package_snapshot_json, b.confirmed_at, b.created_at
         FROM os_bookings b WHERE b.customer_id = ? ORDER BY b.created_at DESC`
      )
      .all(cust.id);
    return { status: 200, body: { items } };
  }
  if (claims.role === "partner") {
    const items = db
      .prepare(
        `SELECT b.id, b.booking_number, b.status, b.supplier_pnr_ref, b.package_snapshot_json, b.confirmed_at, b.created_at
         FROM os_bookings b WHERE b.partner_id = ? ORDER BY b.created_at DESC`
      )
      .all(claims.partnerId ?? "__none__");
    return { status: 200, body: { items } };
  }
  if (!["ceo", "manager", "employee"].includes(claims.role)) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Unauthorized to view trip wallet", requestId } };
  }
  const items = db.prepare("SELECT * FROM os_bookings WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100").all(claims.orgId);
  return { status: 200, body: { items } };
}
