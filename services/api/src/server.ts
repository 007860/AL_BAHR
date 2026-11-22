import crypto from "node:crypto";
import http from "node:http";
import type { DatabaseSync } from "node:sqlite";
import type { AppConfig } from "./config.ts";
import { newId, nextSequence } from "./db/database.ts";
import { recordAudit } from "./core/audit-idempotency.ts";
import { hasPermission } from "./core/rbac.ts";
import {
  SlidingRateLimiter,
  redactPii,
  signToken,
  verifyPassword,
  verifyToken,
  verifyTotpCode,
  type SessionClaims,
} from "./core/security.ts";
import {
  addCustomerNote,
  completeTask,
  convertLeadToCase,
  createLead,
  downloadSignedDocumentContent,
  exportCustomersCsv,
  getCustomerProfile,
  getDocumentSignedUrl,
  listLeads,
  overrideAssignLead,
  reviewDocument,
  transitionCaseState,
  uploadPrivateDocument,
  type HttpResult,
} from "./modules/crm-cases.ts";
import {
  acceptQuoteAndDraftInvoice,
  addVerifiedFlightFare,
  confirmAppointment,
  confirmSupplierBooking,
  createBookingAndConfirmSupplier,
  createFlightRequest,
  createQuote,
  createUmrahPackage,
  getInvoiceDetail,
  getMyTrips,
  issueFlightTicket,
  listPublicActiveUmrahPackages,
  publishOrExpireUmrahPackage,
  readLedgerAndExport,
  sendQuote,
  uploadPaymentEvidence,
  verifyOrRejectPayment,
} from "./modules/travel-commercial.ts";
import {
  activateOrRollbackRule,
  changeStaffRole,
  checkInOutAttendance,
  createCampaignAndSend,
  createRuleDraft,
  deactivateStaffAndRevokeSessions,
  decideLeaveRequest,
  emergencyPauseAutomation,
  inviteEmployee,
  redeemEmployeeInvitation,
  sendCampaignIdempotent,
  simulateRulesAndQueue,
  submitReview,
} from "./modules/hr-cms-ops.ts";

export interface OsAppContext {
  db: DatabaseSync;
  config: AppConfig;
  limiter: SlidingRateLimiter;
}

export function createOsRequestHandler(ctx: OsAppContext) {
  return async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
    const requestId = `req_${crypto.randomBytes(6).toString("hex")}`;
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname;
    const method = (req.method ?? "GET").toUpperCase();

    // Security headers
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");

    try {
      const ip = req.socket.remoteAddress ?? "unknown";
      if (!ctx.limiter.allow(`ip:${ip}`, 120, 60_000)) {
        sendJson(res, 429, { code: "RATE_LIMITED", message: "Too many requests; please retry shortly", requestId });
        return;
      }

      const body = method === "POST" || method === "PATCH" || method === "PUT" ? await readJsonBody(req) : {};
      const claims = authenticateRequest(ctx.db, ctx.config.jwtSigningSecret, req.headers.authorization);
      const idemKey = typeof req.headers["idempotency-key"] === "string" ? req.headers["idempotency-key"] : undefined;

      const result = dispatchRoute(ctx, { method, pathname, url, body, claims, idemKey, requestId, ip });
      sendJson(res, result.status, result.body, result.headers);
    } catch (err) {
      // Never leak stack traces, SQL, or PII in HTTP errors
      const safeMsg = err instanceof SyntaxError ? "Invalid JSON payload" : "Internal processing error";
      sendJson(res, err instanceof SyntaxError ? 400 : 500, { code: "SERVER_ERROR", message: safeMsg, requestId });
    }
  };
}

function dispatchRoute(
  ctx: OsAppContext,
  req: {
    method: string;
    pathname: string;
    url: URL;
    body: Record<string, unknown>;
    claims: SessionClaims | null;
    idemKey?: string;
    requestId: string;
    ip: string;
  }
): HttpResult {
  const { db, config } = ctx;
  const { method, pathname, body, claims, idemKey, requestId } = req;

  // --- PUBLIC / HEALTH / AUTH ---
  if (method === "GET" && pathname === "/api/v1/health") {
    return { status: 200, body: { status: "ok", service: "al-bahr-horizon-os", zeroAiRuntime: true, timestamp: new Date().toISOString() } };
  }
  if (method === "GET" && pathname === "/api/v1/company/branding") {
    const s = db.prepare("SELECT * FROM os_company_settings WHERE organization_id = ?").get(config.defaultOrgId);
    return { status: 200, body: { branding: s } };
  }
  if (method === "GET" && pathname === "/api/v1/public/umrah-packages") {
    return listPublicActiveUmrahPackages(db, config.defaultOrgId);
  }

  // Public signup explicitly disabled in Release 1 private company edition (Sec. 63)
  if (pathname.startsWith("/api/v1/public/signup") || pathname.startsWith("/api/v1/billing")) {
    return { status: 404, body: { code: "NOT_AVAILABLE", message: "Private company edition only", requestId } };
  }

  if (method === "POST" && pathname === "/api/v1/auth/login") {
    if (!ctx.limiter.allow(`login:${req.ip}`, 10, 60_000)) {
      return { status: 429, body: { code: "RATE_LIMITED", message: "Too many login attempts", requestId } };
    }
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const user = db
      .prepare(
        `SELECT u.*, m.role_id, m.team_id, m.partner_id
         FROM os_users u JOIN os_memberships m ON m.user_id = u.id
         WHERE u.email = ?`
      )
      .get(email) as
      | {
          id: string;
          organization_id: string;
          password_hash: string;
          full_name: string;
          mfa_enabled: number;
          status: string;
          role_id: string;
          team_id: string | null;
          partner_id: string | null;
        }
      | undefined;

    if (!user || user.status !== "active" || !verifyPassword(password, user.password_hash)) {
      return { status: 401, body: { code: "INVALID_CREDENTIALS", message: "Invalid email or password", requestId } };
    }

    const sessionId = newId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 12 * 3600 * 1000);
    db.prepare("INSERT INTO os_sessions (id, user_id, aal_level, expires_at, created_at) VALUES (?, ?, 'aal1', ?, ?)").run(
      sessionId,
      user.id,
      expiresAt.toISOString(),
      now.toISOString()
    );
    const token = signToken(
      {
        sub: user.id,
        sid: sessionId,
        role: user.role_id,
        orgId: user.organization_id,
        teamId: user.team_id,
        partnerId: user.partner_id,
        aal: "aal1",
        exp: Math.floor(expiresAt.getTime() / 1000),
      },
      config.jwtSigningSecret
    );
    recordAudit(db, {
      organizationId: user.organization_id,
      actorUserId: user.id,
      actorRole: user.role_id,
      action: "auth.login",
      resourceType: "session",
      resourceId: sessionId,
      requestId,
    });
    return {
      status: 200,
      body: {
        token,
        aal: "aal1",
        mfaRequired: user.mfa_enabled === 1,
        user: { id: user.id, fullName: user.full_name, role: user.role_id, partnerId: user.partner_id },
      },
    };
  }

  if (method === "POST" && pathname === "/api/v1/auth/activate") {
    return redeemEmployeeInvitation(db, body as { activationToken: string; password: string; acceptTerms: boolean }, requestId);
  }

  // Public lead ingestion (rate-limited + consent required)
  if (method === "POST" && pathname === "/api/v1/leads") {
    if (!ctx.limiter.allow(`leads:${req.ip}`, 20, 60_000)) {
      return { status: 429, body: { code: "RATE_LIMITED", message: "Lead submission rate limit exceeded", requestId } };
    }
    return createLead(db, claims, config.defaultOrgId, body as Parameters<typeof createLead>[3], idemKey, requestId);
  }

  // Signed document download (authorizes via short-lived token)
  const docContentMatch = pathname.match(/^\/api\/v1\/documents\/([^/]+)\/content$/);
  if (method === "GET" && docContentMatch) {
    return downloadSignedDocumentContent(db, docContentMatch[1], req.url.searchParams.get("token") ?? undefined, config.signedUrlSecret, requestId);
  }

  // One-click subscriber unsubscribe
  if (method === "POST" && pathname === "/api/v1/subscribers/unsubscribe") {
    const token = String(body.unsubscribeToken ?? "");
    const res = db.prepare("UPDATE os_subscribers SET status = 'unsubscribed' WHERE unsubscribe_token = ?").run(token);
    return Number(res.changes) > 0
      ? { status: 200, body: { status: "unsubscribed" } }
      : { status: 404, body: { code: "NOT_FOUND", message: "Invalid unsubscribe token", requestId } };
  }

  // --- AUTHENTICATED ROUTES BELOW ---
  if (!claims) {
    return { status: 401, body: { code: "UNAUTHORIZED", message: "Valid authenticated session required", requestId } };
  }

  if (method === "POST" && pathname === "/api/v1/auth/mfa/verify") {
    const user = db.prepare("SELECT mfa_secret FROM os_users WHERE id = ?").get(claims.sub) as { mfa_secret: string | null } | undefined;
    if (!user?.mfa_secret || !verifyTotpCode(user.mfa_secret, String(body.code ?? ""))) {
      return { status: 401, body: { code: "INVALID_MFA", message: "Invalid MFA verification code", requestId } };
    }
    db.prepare("UPDATE os_sessions SET aal_level = 'aal2' WHERE id = ?").run(claims.sid);
    const upgraded = signToken({ ...claims, aal: "aal2" }, config.jwtSigningSecret);
    return { status: 200, body: { token: upgraded, aal: "aal2" } };
  }

  if (method === "POST" && pathname === "/api/v1/auth/logout") {
    db.prepare("UPDATE os_sessions SET revoked_at = ? WHERE id = ?").run(new Date().toISOString(), claims.sid);
    return { status: 200, body: { loggedOut: true } };
  }

  if (method === "POST" && pathname === "/api/v1/sessions/revoke-all") {
    const perm = hasPermission(claims, "session:revoke_all");
    if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
    db.prepare("UPDATE os_sessions SET revoked_at = ? WHERE revoked_at IS NULL").run(new Date().toISOString());
    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "sessions.revoke_all",
      resourceType: "session",
      resourceId: "all",
      requestId,
    });
    return { status: 200, body: { allSessionsRevoked: true } };
  }

  // --- DASHBOARD ---
  if (method === "GET" && pathname === "/api/v1/dashboard") {
    const pendingPayments =
      claims.role === "ceo" || claims.role === "finance"
        ? (db.prepare("SELECT COUNT(*) as c FROM os_payments WHERE status = 'pending_review'").get() as { c: number }).c
        : undefined;
    const leadsCount =
      claims.role === "customer"
        ? 0
        : claims.role === "employee"
          ? (db.prepare("SELECT COUNT(*) as c FROM os_leads WHERE assigned_employee_id = ?").get(claims.sub) as { c: number }).c
          : claims.role === "partner"
            ? (db.prepare("SELECT COUNT(*) as c FROM os_leads WHERE partner_id = ?").get(claims.partnerId ?? "__none__") as { c: number }).c
            : (db.prepare("SELECT COUNT(*) as c FROM os_leads").get() as { c: number }).c;
    const openCases =
      claims.role === "customer"
        ? (db.prepare("SELECT COUNT(*) as c FROM os_cases c JOIN os_customers cu ON cu.id = c.customer_id WHERE cu.user_id = ?").get(claims.sub) as { c: number }).c
        : claims.role === "employee"
          ? (db.prepare("SELECT COUNT(*) as c FROM os_cases WHERE assigned_employee_id = ?").get(claims.sub) as { c: number }).c
          : (db.prepare("SELECT COUNT(*) as c FROM os_cases").get() as { c: number }).c;
    return { status: 200, body: { role: claims.role, leadsCount, openCases, pendingPayments } };
  }

  // --- LEADS, CUSTOMERS, CASES, TASKS, DOCUMENTS ---
  if (method === "GET" && pathname === "/api/v1/leads") {
    return listLeads(db, claims, { q: req.url.searchParams.get("q") ?? undefined, status: req.url.searchParams.get("status") ?? undefined }, requestId);
  }
  const leadAssignMatch = pathname.match(/^\/api\/v1\/leads\/([^/]+)\/assign$/);
  if (method === "POST" && leadAssignMatch) {
    return overrideAssignLead(db, claims, leadAssignMatch[1], body as { employeeUserId: string; reason: string }, requestId);
  }
  const leadConvertMatch = pathname.match(/^\/api\/v1\/leads\/([^/]+)\/convert$/);
  if (method === "POST" && leadConvertMatch) {
    return convertLeadToCase(db, claims, leadConvertMatch[1], idemKey, requestId);
  }
  if (method === "GET" && pathname === "/api/v1/customers/export") {
    return exportCustomersCsv(db, claims, requestId);
  }
  const custMatch = pathname.match(/^\/api\/v1\/customers\/([^/]+)$/);
  if (method === "GET" && custMatch) {
    return getCustomerProfile(db, claims, custMatch[1], requestId);
  }
  const custNoteMatch = pathname.match(/^\/api\/v1\/customers\/([^/]+)\/notes$/);
  if (method === "POST" && custNoteMatch) {
    return addCustomerNote(db, claims, custNoteMatch[1], String(body.note ?? ""), requestId);
  }
  const caseStateMatch = pathname.match(/^\/api\/v1\/cases\/([^/]+)\/state$/);
  if (method === "PATCH" && caseStateMatch) {
    return transitionCaseState(db, claims, caseStateMatch[1], body as { toStatus: string; version: number; reason?: string }, requestId);
  }
  const taskDoneMatch = pathname.match(/^\/api\/v1\/tasks\/([^/]+)\/complete$/);
  if (method === "POST" && taskDoneMatch) {
    return completeTask(db, claims, taskDoneMatch[1], requestId);
  }
  if (method === "POST" && pathname === "/api/v1/documents") {
    return uploadPrivateDocument(db, claims, body as Parameters<typeof uploadPrivateDocument>[2], requestId);
  }
  const docReviewMatch = pathname.match(/^\/api\/v1\/documents\/([^/]+)\/review$/);
  if (method === "POST" && docReviewMatch) {
    return reviewDocument(db, claims, docReviewMatch[1], body as { decision: "approved" | "rejected"; reason?: string }, requestId);
  }
  const docSignedMatch = pathname.match(/^\/api\/v1\/documents\/([^/]+)\/signed-url$/);
  if (method === "GET" && docSignedMatch) {
    return getDocumentSignedUrl(db, claims, docSignedMatch[1], config.signedUrlSecret, requestId);
  }

  // --- TRAVEL VERTICALS & COMMERCIAL ---
  if (method === "POST" && pathname === "/api/v1/flight-requests") {
    return createFlightRequest(db, claims, body as Parameters<typeof createFlightRequest>[2], requestId);
  }
  const flightFareMatch = pathname.match(/^\/api\/v1\/flight-requests\/([^/]+)\/fares$/);
  if (method === "POST" && flightFareMatch) {
    return addVerifiedFlightFare(db, claims, flightFareMatch[1], body as Parameters<typeof addVerifiedFlightFare>[3], requestId);
  }
  const flightIssueMatch = pathname.match(/^\/api\/v1\/flight-bookings\/([^/]+)\/issue-ticket$/);
  if (method === "POST" && flightIssueMatch) {
    return issueFlightTicket(db, claims, flightIssueMatch[1], body as Parameters<typeof issueFlightTicket>[3], requestId);
  }
  if (method === "POST" && pathname === "/api/v1/umrah/packages") {
    return createUmrahPackage(db, claims, body as Parameters<typeof createUmrahPackage>[2], requestId);
  }
  const umrahPubMatch = pathname.match(/^\/api\/v1\/umrah\/packages\/([^/]+)\/(publish|unpublish|expire)$/);
  if (method === "POST" && umrahPubMatch) {
    return publishOrExpireUmrahPackage(db, claims, umrahPubMatch[1], umrahPubMatch[2] as "publish" | "unpublish" | "expire", requestId);
  }
  const apptConfirmMatch = pathname.match(/^\/api\/v1\/appointments\/([^/]+)\/confirm$/);
  if (method === "POST" && apptConfirmMatch) {
    return confirmAppointment(db, claims, apptConfirmMatch[1], body as Parameters<typeof confirmAppointment>[3], requestId);
  }
  if (method === "POST" && pathname === "/api/v1/quotes") {
    return createQuote(db, claims, body as Parameters<typeof createQuote>[2], requestId);
  }
  const quoteSendMatch = pathname.match(/^\/api\/v1\/quotes\/([^/]+)\/send$/);
  if (method === "POST" && quoteSendMatch) {
    return sendQuote(db, claims, quoteSendMatch[1], requestId);
  }
  const quoteAcceptMatch = pathname.match(/^\/api\/v1\/quotes\/([^/]+)\/accept$/);
  if (method === "POST" && quoteAcceptMatch) {
    return acceptQuoteAndDraftInvoice(db, claims, quoteAcceptMatch[1], idemKey, requestId);
  }
  const invGetMatch = pathname.match(/^\/api\/v1\/invoices\/([^/]+)$/);
  if (method === "GET" && invGetMatch) {
    return getInvoiceDetail(db, claims, invGetMatch[1], requestId);
  }
  if (method === "POST" && pathname === "/api/v1/payments/evidence") {
    return uploadPaymentEvidence(db, claims, body as Parameters<typeof uploadPaymentEvidence>[2], requestId);
  }
  const payDecideMatch = pathname.match(/^\/api\/v1\/payments\/([^/]+)\/(verify|reject)$/);
  if (method === "POST" && payDecideMatch) {
    return verifyOrRejectPayment(
      db,
      claims,
      payDecideMatch[1],
      { decision: payDecideMatch[2] === "verify" ? "verified" : "rejected", reason: body.reason as string | undefined },
      idemKey,
      requestId
    );
  }
  if (method === "GET" && pathname === "/api/v1/ledger") {
    return readLedgerAndExport(db, claims, req.url.searchParams.get("export") === "csv", requestId);
  }
  if (method === "POST" && pathname === "/api/v1/bookings") {
    return createBookingAndConfirmSupplier(db, claims, body as Parameters<typeof createBookingAndConfirmSupplier>[2], requestId);
  }
  const bookingConfirmMatch = pathname.match(/^\/api\/v1\/bookings\/([^/]+)\/confirm$/);
  if (method === "POST" && bookingConfirmMatch) {
    return confirmSupplierBooking(db, claims, bookingConfirmMatch[1], body as Parameters<typeof confirmSupplierBooking>[3], requestId);
  }
  if (method === "GET" && pathname === "/api/v1/my-trips") {
    return getMyTrips(db, claims, requestId);
  }

  // --- HR, PARTNERS, CAMPAIGNS, REVIEWS, RULES, AUDIT, SETTINGS ---
  if (method === "POST" && pathname === "/api/v1/staff/invite") {
    return inviteEmployee(db, claims, body as Parameters<typeof inviteEmployee>[2], requestId);
  }
  const staffRoleMatch = pathname.match(/^\/api\/v1\/staff\/([^/]+)\/role$/);
  if (method === "PATCH" && staffRoleMatch) {
    return changeStaffRole(db, claims, staffRoleMatch[1], body.role as Parameters<typeof changeStaffRole>[3], requestId);
  }
  const staffDeactMatch = pathname.match(/^\/api\/v1\/staff\/([^/]+)\/deactivate$/);
  if (method === "POST" && staffDeactMatch) {
    return deactivateStaffAndRevokeSessions(db, claims, staffDeactMatch[1], String(body.reason ?? ""), requestId);
  }
  if (method === "POST" && pathname === "/api/v1/attendance/check-in") {
    return checkInOutAttendance(db, claims, "check_in", requestId);
  }
  if (method === "POST" && pathname === "/api/v1/attendance/check-out") {
    return checkInOutAttendance(db, claims, "check_out", requestId);
  }
  const leaveDecideMatch = pathname.match(/^\/api\/v1\/leave-requests\/([^/]+)\/decide$/);
  if (method === "POST" && leaveDecideMatch) {
    return decideLeaveRequest(db, claims, leaveDecideMatch[1], body.decision as "approved" | "rejected", requestId);
  }
  if (method === "POST" && pathname === "/api/v1/campaigns") {
    return createCampaignAndSend(db, claims, body as Parameters<typeof createCampaignAndSend>[2], requestId);
  }
  const campSendMatch = pathname.match(/^\/api\/v1\/campaigns\/([^/]+)\/send$/);
  if (method === "POST" && campSendMatch) {
    return sendCampaignIdempotent(db, claims, campSendMatch[1], idemKey, requestId);
  }
  if (method === "POST" && pathname === "/api/v1/reviews") {
    return submitReview(db, claims, body as Parameters<typeof submitReview>[2], requestId);
  }
  if (method === "POST" && pathname === "/api/v1/rules") {
    return createRuleDraft(db, claims, body as Parameters<typeof createRuleDraft>[2], requestId);
  }
  const ruleActMatch = pathname.match(/^\/api\/v1\/rules\/([^/]+)\/(activate|rollback)$/);
  if (method === "POST" && ruleActMatch) {
    return activateOrRollbackRule(
      db,
      claims,
      ruleActMatch[1],
      ruleActMatch[2] === "rollback" ? String(body.targetVersionId ?? "") : undefined,
      requestId
    );
  }
  if (method === "POST" && pathname === "/api/v1/rules/simulate") {
    return simulateRulesAndQueue(db, claims, body as Parameters<typeof simulateRulesAndQueue>[2], requestId);
  }
  if (method === "POST" && pathname === "/api/v1/rules/emergency-pause") {
    return emergencyPauseAutomation(db, claims, (body.categories as string[]) ?? ["*"], requestId);
  }
  if (method === "GET" && pathname === "/api/v1/audit") {
    const perm = hasPermission(claims, "audit:read");
    if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
    const sql =
      claims.role === "ceo" || claims.role === "manager"
        ? "SELECT * FROM os_audit_events WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100"
        : "SELECT * FROM os_audit_events WHERE organization_id = ? AND actor_user_id = ? ORDER BY created_at DESC LIMIT 100";
    const items =
      claims.role === "ceo" || claims.role === "manager" ? db.prepare(sql).all(claims.orgId) : db.prepare(sql).all(claims.orgId, claims.sub);
    return { status: 200, body: { items: redactPii(items) } };
  }
  if (method === "PATCH" && pathname === "/api/v1/settings/company") {
    const perm = hasPermission(claims, "settings:write");
    if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
    if (body.defaultFlightMarkupPkr !== undefined) {
      db.prepare("UPDATE os_company_settings SET default_flight_markup_pkr = ?, updated_at = ? WHERE organization_id = ?").run(
        Number(body.defaultFlightMarkupPkr),
        new Date().toISOString(),
        claims.orgId
      );
    }
    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "settings.updated",
      resourceType: "company_settings",
      resourceId: claims.orgId,
      after: body,
      requestId,
    });
    return { status: 200, body: { updated: true } };
  }
  if (method === "POST" && pathname === "/api/v1/support/tickets") {
    const id = newId();
    const num = nextSequence(db, "case", "SUP");
    db.prepare(
      `INSERT INTO os_support_tickets (id, organization_id, ticket_number, partner_id, category, subject, description, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?)`
    ).run(
      id,
      claims.orgId,
      num,
      claims.partnerId ?? null,
      String(body.category ?? "general"),
      String(body.subject ?? "Support Request"),
      String(body.description ?? ""),
      new Date().toISOString()
    );
    return { status: 201, body: { id, ticketNumber: num, status: "submitted" } };
  }

  return { status: 404, body: { code: "NOT_FOUND", message: `No route for ${method} ${pathname}`, requestId } };
}

function authenticateRequest(db: DatabaseSync, secret: string, authHeader?: string): SessionClaims | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  const claims = verifyToken(token, secret);
  if (!claims) return null;

  // Verify session is not revoked and user is still active! (E2E-07)
  const row = db
    .prepare(
      `SELECT s.revoked_at, s.expires_at, s.aal_level, u.status
       FROM os_sessions s JOIN os_users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .get(claims.sid) as { revoked_at: string | null; expires_at: string; aal_level: "aal1" | "aal2"; status: string } | undefined;

  if (!row || row.revoked_at !== null || row.status !== "active" || new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }
  return { ...claims, aal: row.aal_level };
}

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > 15 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown, headers?: Record<string, string>): void {
  if (headers) {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function createOsServer(ctx: OsAppContext): http.Server {
  return http.createServer(createOsRequestHandler(ctx));
}
