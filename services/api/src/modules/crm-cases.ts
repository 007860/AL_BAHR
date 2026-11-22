import type { DatabaseSync } from "node:sqlite";
import { newId, nextSequence } from "../db/database.ts";
import { recordAudit, runWithIdempotency } from "../core/audit-idempotency.ts";
import { evaluateActiveRules } from "../core/rules-engine.ts";
import { assignSubjectLeastLoaded } from "../core/smart-assignment.ts";
import { enqueueOutboxEvent } from "../core/outbox.ts";
import { createSignedDocumentToken, toCsv, validateUploadBytes, verifySignedDocumentToken, type SessionClaims } from "../core/security.ts";
import { hasPermission } from "../core/rbac.ts";

export interface HttpResult<T = unknown> {
  status: number;
  body: T;
  headers?: Record<string, string>;
}

const VALID_CASE_TRANSITIONS: Record<string, Set<string>> = {
  draft: new Set(["submitted", "assigned", "cancelled"]),
  submitted: new Set(["assigned", "processing", "cancelled"]),
  assigned: new Set(["processing", "waiting_customer", "waiting_supplier", "cancelled"]),
  processing: new Set(["waiting_customer", "waiting_supplier", "completed", "cancelled"]),
  waiting_customer: new Set(["processing", "completed", "cancelled"]),
  waiting_supplier: new Set(["processing", "completed", "cancelled"]),
  completed: new Set([]),
  cancelled: new Set([]),
};

export function createLead(
  db: DatabaseSync,
  claims: SessionClaims | null,
  orgId: string,
  input: {
    fullName: string;
    phone: string;
    email?: string;
    serviceType: string;
    sourceChannel: string;
    externalSourceId?: string;
    consentGiven: boolean;
    partnerId?: string;
  },
  idemKey: string | undefined,
  requestId: string
): HttpResult {
  if (!input.fullName?.trim() || !input.phone?.trim() || !input.serviceType) {
    return { status: 400, body: { code: "VALIDATION_ERROR", message: "fullName, phone, and serviceType are required", requestId } };
  }
  if (!input.consentGiven) {
    return { status: 400, body: { code: "CONSENT_REQUIRED", message: "Explicit consent is required before submitting inquiry", requestId } };
  }

  return runWithIdempotency(db, idemKey, claims?.sub ?? `public:${input.phone}`, "POST:/api/v1/leads", input, () => {
    const now = new Date().toISOString();
    const leadId = newId();
    const partnerId = claims?.role === "partner" ? claims.partnerId ?? null : input.partnerId ?? null;

    db.exec("BEGIN IMMEDIATE");
    try {
      // Deduplicate by externalSourceId if present
      if (input.externalSourceId) {
        const dup = db
          .prepare("SELECT id, status, assigned_employee_id FROM os_leads WHERE organization_id = ? AND source_channel = ? AND external_source_id = ?")
          .get(orgId, input.sourceChannel, input.externalSourceId) as { id: string; status: string; assigned_employee_id: string | null } | undefined;
        if (dup) {
          db.exec("COMMIT");
          return { status: 200, body: { id: dup.id, status: dup.status, assignedEmployeeId: dup.assigned_employee_id, deduplicated: true } };
        }
      }

      const ruleMatch = evaluateActiveRules(db, orgId, "lead.created", "lead", leadId, {
        service_type: input.serviceType,
        source_channel: input.sourceChannel,
      });

      const assignOutcome = ruleMatch.paused
        ? { assignedEmployeeId: null, queue: "manager_triage" as const, reasonCode: "EMERGENCY_PAUSE", decisionLogId: ruleMatch.decisionLogId }
        : assignSubjectLeastLoaded(db, {
            orgId,
            subjectType: "lead",
            subjectId: leadId,
            serviceType: input.serviceType,
            ruleVersionId: ruleMatch.matchedRuleVersionId,
          });

      const initialStatus = assignOutcome.assignedEmployeeId ? "assigned" : "triaged";

      db.prepare(
        `INSERT INTO os_leads (
          id, organization_id, partner_id, full_name, phone, email, service_type,
          source_channel, external_source_id, assigned_employee_id, status, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      ).run(
        leadId, orgId, partnerId, input.fullName.trim(), input.phone.trim(), input.email ?? null,
        input.serviceType, input.sourceChannel, input.externalSourceId ?? null,
        assignOutcome.assignedEmployeeId, initialStatus, now, now
      );

      db.prepare(
        `INSERT INTO os_consent_events (id, organization_id, subject_type, subject_id, channel, consented, source, created_at)
         VALUES (?, ?, 'lead', ?, 'portal', 1, ?, ?)`
      ).run(newId(), orgId, leadId, input.sourceChannel, now);

      recordAudit(db, {
        organizationId: orgId,
        actorUserId: claims?.sub ?? null,
        actorRole: claims?.role ?? "public",
        action: "lead.create",
        resourceType: "lead",
        resourceId: leadId,
        after: { status: initialStatus, assignedEmployeeId: assignOutcome.assignedEmployeeId, reasonCode: assignOutcome.reasonCode },
        requestId,
        ruleVersionId: ruleMatch.matchedRuleVersionId,
      });

      db.exec("COMMIT");
      return {
        status: 201,
        body: {
          id: leadId,
          status: initialStatus,
          assignedEmployeeId: assignOutcome.assignedEmployeeId,
          queue: assignOutcome.queue,
          reasonCode: assignOutcome.reasonCode,
        },
      };
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  });
}

export function listLeads(db: DatabaseSync, claims: SessionClaims, query: { q?: string; status?: string }, requestId: string): HttpResult {
  const perm = hasPermission(claims, "lead:read");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  let sql = "SELECT id, full_name, phone, email, service_type, source_channel, assigned_employee_id, partner_id, status, created_at FROM os_leads WHERE organization_id = ? AND archived_at IS NULL";
  const params: Array<string> = [claims.orgId];

  if (claims.role === "employee") {
    sql += " AND assigned_employee_id = ?";
    params.push(claims.sub);
  } else if (claims.role === "partner") {
    sql += " AND partner_id = ?";
    params.push(claims.partnerId ?? "__none__");
  }
  if (query.status) {
    sql += " AND status = ?";
    params.push(query.status);
  }
  if (query.q?.trim()) {
    sql += " AND (LOWER(full_name) LIKE ? OR phone LIKE ?)";
    const pattern = `%${query.q.trim().toLowerCase()}%`;
    params.push(pattern, pattern);
  }
  sql += " ORDER BY created_at DESC LIMIT 100";

  const rows = db.prepare(sql).all(...params);
  return { status: 200, body: { items: rows } };
}

export function overrideAssignLead(
  db: DatabaseSync,
  claims: SessionClaims,
  leadId: string,
  input: { employeeUserId: string; reason: string },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "lead:assign");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
  if (!input.reason?.trim()) {
    return { status: 400, body: { code: "REASON_REQUIRED", message: "Override reason is mandatory", requestId } };
  }

  const lead = db.prepare("SELECT id, assigned_employee_id, status FROM os_leads WHERE id = ?").get(leadId) as
    | { id: string; assigned_employee_id: string | null; status: string }
    | undefined;
  if (!lead) return { status: 404, body: { code: "NOT_FOUND", message: "Lead not found", requestId } };

  const targetEmp = db.prepare("SELECT user_id FROM os_employees WHERE user_id = ?").get(input.employeeUserId) as { user_id: string } | undefined;
  if (!targetEmp) return { status: 404, body: { code: "NOT_FOUND", message: "Target employee not found", requestId } };

  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (lead.assigned_employee_id) {
      db.prepare("UPDATE os_employees SET active_weighted_load = MAX(0, active_weighted_load - 1) WHERE user_id = ?").run(lead.assigned_employee_id);
    }
    db.prepare("UPDATE os_employees SET active_weighted_load = active_weighted_load + 1, last_assigned_at = ? WHERE user_id = ?").run(
      now,
      input.employeeUserId
    );
    db.prepare("UPDATE os_leads SET assigned_employee_id = ?, status = 'assigned', updated_at = ? WHERE id = ?").run(
      input.employeeUserId,
      now,
      leadId
    );
    db.prepare(
      `INSERT INTO os_assignment_events (id, subject_type, subject_id, employee_user_id, override_reason, assigned_by, created_at)
       VALUES (?, 'lead', ?, ?, ?, ?, ?)`
    ).run(newId(), leadId, input.employeeUserId, input.reason.trim(), claims.sub, now);

    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "lead.override_assign",
      resourceType: "lead",
      resourceId: leadId,
      before: { assignedEmployeeId: lead.assigned_employee_id },
      after: { assignedEmployeeId: input.employeeUserId },
      reason: input.reason.trim(),
      requestId,
    });
    db.exec("COMMIT");
    return { status: 200, body: { id: leadId, assignedEmployeeId: input.employeeUserId, status: "assigned" } };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function convertLeadToCase(
  db: DatabaseSync,
  claims: SessionClaims,
  leadId: string,
  idemKey: string | undefined,
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "lead:convert");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  return runWithIdempotency(db, idemKey, claims.sub, `POST:/api/v1/leads/${leadId}/convert`, { leadId }, () => {
    const lead = db.prepare("SELECT * FROM os_leads WHERE id = ?").get(leadId) as
      | {
          id: string;
          organization_id: string;
          customer_id: string | null;
          partner_id: string | null;
          full_name: string;
          phone: string;
          email: string | null;
          service_type: string;
          assigned_employee_id: string | null;
          status: string;
        }
      | undefined;

    if (!lead) return { status: 404, body: { code: "NOT_FOUND", message: "Lead not found", requestId } };
    if (claims.role === "employee" && lead.assigned_employee_id !== claims.sub) {
      return { status: 403, body: { code: "FORBIDDEN", message: "Only assigned employee or manager can convert this lead", requestId } };
    }
    if (lead.status === "converted") {
      const existingCase = db.prepare("SELECT id, case_number, customer_id FROM os_cases WHERE lead_id = ?").get(leadId);
      return { status: 200, body: { ...(existingCase as object), alreadyConverted: true } };
    }

    const now = new Date().toISOString();
    db.exec("BEGIN IMMEDIATE");
    try {
      // Reuse authoritative customer profile by phone (never duplicate!)
      let customer = db
        .prepare("SELECT id FROM os_customers WHERE organization_id = ? AND primary_phone = ? AND archived_at IS NULL")
        .get(lead.organization_id, lead.phone) as { id: string } | undefined;

      let customerId: string;
      if (customer) {
        customerId = customer.id;
      } else {
        customerId = newId();
        db.prepare(
          `INSERT INTO os_customers (id, organization_id, partner_id, full_name, primary_phone, primary_email, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(customerId, lead.organization_id, lead.partner_id, lead.full_name, lead.phone, lead.email, now, now);
      }

      const caseId = newId();
      const caseNumber = nextSequence(db, "case", "CASE");
      const service = ["umrah", "flight", "visa", "appointment", "hotel", "study"].includes(lead.service_type) ? lead.service_type : "visa";
      db.prepare(
        `INSERT INTO os_cases (
          id, organization_id, case_number, customer_id, lead_id, partner_id, service_type,
          title, assigned_employee_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned', ?, ?)`
      ).run(
        caseId, lead.organization_id, caseNumber, customerId, leadId, lead.partner_id, service,
        `${service.toUpperCase()} — ${lead.full_name}`, lead.assigned_employee_id, now, now
      );

      db.prepare("UPDATE os_leads SET customer_id = ?, status = 'converted', updated_at = ? WHERE id = ?").run(customerId, now, leadId);
      db.prepare(
        `INSERT INTO os_case_events (id, case_id, actor_user_id, visibility, to_status, summary, created_at)
         VALUES (?, ?, ?, 'customer_safe', 'assigned', 'Inquiry converted to active case', ?)`
      ).run(newId(), caseId, claims.sub, now);

      recordAudit(db, {
        organizationId: lead.organization_id,
        actorUserId: claims.sub,
        actorRole: claims.role,
        action: "lead.convert",
        resourceType: "case",
        resourceId: caseId,
        after: { leadId, customerId, caseNumber },
        requestId,
      });

      db.exec("COMMIT");
      return { status: 201, body: { id: caseId, caseNumber, customerId, leadId } };
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  });
}

export function getCustomerProfile(db: DatabaseSync, claims: SessionClaims, customerId: string, requestId: string): HttpResult {
  const perm = hasPermission(claims, "customer:read");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const cust = db.prepare("SELECT * FROM os_customers WHERE id = ? AND archived_at IS NULL").get(customerId) as
    | { id: string; user_id: string | null; partner_id: string | null; full_name: string; primary_phone: string; primary_email: string | null; city: string | null; kyc_verified: number }
    | undefined;
  if (!cust) return { status: 404, body: { code: "NOT_FOUND", message: "Customer not found", requestId } };

  if (claims.role === "customer" && cust.user_id !== claims.sub) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Cannot access another customer's profile", requestId } };
  }
  if (claims.role === "partner" && cust.partner_id !== claims.partnerId) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Cannot access another agency's customer", requestId } };
  }

  const eventsSql =
    claims.role === "customer" || claims.role === "partner"
      ? "SELECT id, event_type, note, created_at FROM os_customer_events WHERE customer_id = ? AND visibility = 'customer_safe' ORDER BY created_at DESC"
      : "SELECT id, visibility, event_type, note, created_at FROM os_customer_events WHERE customer_id = ? ORDER BY created_at DESC";
  const timeline = db.prepare(eventsSql).all(customerId);
  const cases = db.prepare("SELECT id, case_number, service_type, title, status, created_at FROM os_cases WHERE customer_id = ?").all(customerId);

  return { status: 200, body: { customer: cust, timeline, cases } };
}

export function addCustomerNote(
  db: DatabaseSync,
  claims: SessionClaims,
  customerId: string,
  note: string,
  requestId: string
): HttpResult {
  if (!["ceo", "manager", "employee", "support", "finance"].includes(claims.role)) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Only internal staff may add internal customer notes", requestId } };
  }
  if (!note?.trim()) return { status: 400, body: { code: "VALIDATION_ERROR", message: "Note is required", requestId } };
  const id = newId();
  db.prepare(
    `INSERT INTO os_customer_events (id, customer_id, actor_user_id, visibility, event_type, note, created_at)
     VALUES (?, ?, ?, 'internal', 'staff_note', ?, ?)`
  ).run(id, customerId, claims.sub, note.trim(), new Date().toISOString());
  return { status: 201, body: { id, visibility: "internal" } };
}

export function transitionCaseState(
  db: DatabaseSync,
  claims: SessionClaims,
  caseId: string,
  input: { toStatus: string; version: number; reason?: string },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "case:update");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const c = db.prepare("SELECT id, status, version, assigned_employee_id FROM os_cases WHERE id = ?").get(caseId) as
    | { id: string; status: string; version: number; assigned_employee_id: string | null }
    | undefined;
  if (!c) return { status: 404, body: { code: "NOT_FOUND", message: "Case not found", requestId } };
  if (claims.role === "employee" && c.assigned_employee_id !== claims.sub) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Not assigned to this case", requestId } };
  }
  if (c.version !== input.version) {
    return { status: 409, body: { code: "CONFLICT", message: "Case was updated concurrently; reload and retry", requestId } };
  }
  if (!VALID_CASE_TRANSITIONS[c.status]?.has(input.toStatus)) {
    return { status: 422, body: { code: "INVALID_TRANSITION", message: `Cannot transition case from '${c.status}' to '${input.toStatus}'`, requestId } };
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE os_cases SET status = ?, version = version + 1, updated_at = ? WHERE id = ?").run(input.toStatus, now, caseId);
  db.prepare(
    `INSERT INTO os_case_events (id, case_id, actor_user_id, visibility, from_status, to_status, summary, created_at)
     VALUES (?, ?, ?, 'customer_safe', ?, ?, ?, ?)`
  ).run(newId(), caseId, claims.sub, c.status, input.toStatus, input.reason?.trim() || `Status updated to ${input.toStatus}`, now);

  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "case.state_transition",
    resourceType: "case",
    resourceId: caseId,
    before: { status: c.status },
    after: { status: input.toStatus },
    reason: input.reason ?? null,
    requestId,
  });

  return { status: 200, body: { id: caseId, status: input.toStatus, version: c.version + 1 } };
}

export function completeTask(db: DatabaseSync, claims: SessionClaims, taskId: string, requestId: string): HttpResult {
  const perm = hasPermission(claims, "task:complete");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const task = db.prepare("SELECT * FROM os_tasks WHERE id = ?").get(taskId) as
    | { id: string; assigned_employee_id: string | null; depends_on_task_id: string | null; priority_weight: number; status: string }
    | undefined;
  if (!task) return { status: 404, body: { code: "NOT_FOUND", message: "Task not found", requestId } };
  if (claims.role === "employee" && task.assigned_employee_id !== claims.sub) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Only assignee can complete task", requestId } };
  }
  if (task.depends_on_task_id) {
    const dep = db.prepare("SELECT status FROM os_tasks WHERE id = ?").get(task.depends_on_task_id) as { status: string } | undefined;
    if (dep && dep.status !== "completed") {
      return { status: 422, body: { code: "DEPENDENCY_UNMET", message: "Blocking dependency task is not completed yet", requestId } };
    }
  }
  if (task.status === "completed") {
    return { status: 200, body: { id: taskId, status: "completed", alreadyCompleted: true } };
  }

  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE os_tasks SET status = 'completed', completed_at = ? WHERE id = ?").run(now, taskId);
    if (task.assigned_employee_id) {
      db.prepare("UPDATE os_employees SET active_weighted_load = MAX(0, active_weighted_load - ?) WHERE user_id = ?").run(
        task.priority_weight,
        task.assigned_employee_id
      );
    }
    enqueueOutboxEvent(db, "task.completed", taskId, { taskId }, `task.completed:${taskId}`);
    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "task.complete",
      resourceType: "task",
      resourceId: taskId,
      after: { status: "completed" },
      requestId,
    });
    db.exec("COMMIT");
    return { status: 200, body: { id: taskId, status: "completed" } };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function uploadPrivateDocument(
  db: DatabaseSync,
  claims: SessionClaims,
  input: {
    customerId?: string;
    caseId?: string;
    bookingId?: string;
    docCategory: string;
    fileName: string;
    mimeType: string;
    contentBase64: string;
    parentDocumentId?: string;
  },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "document:upload");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const bytes = Buffer.from(input.contentBase64 || "", "base64");
  const check = validateUploadBytes(input.fileName, input.mimeType, bytes);
  if (!check.ok) {
    return { status: 400, body: { code: "INVALID_UPLOAD", message: check.reason, requestId } };
  }

  // Verify customer ownership if customer role
  let resolvedCustomerId = input.customerId ?? null;
  if (claims.role === "customer") {
    const cust = db.prepare("SELECT id FROM os_customers WHERE user_id = ? AND archived_at IS NULL").get(claims.sub) as { id: string } | undefined;
    if (!cust || (resolvedCustomerId && resolvedCustomerId !== cust.id)) {
      return { status: 403, body: { code: "FORBIDDEN", message: "Customers can only upload documents to their own profile", requestId } };
    }
    resolvedCustomerId = cust.id;
  }

  const docId = newId();
  let versionNo = 1;
  if (input.parentDocumentId) {
    const prev = db.prepare("SELECT version_no FROM os_documents WHERE id = ?").get(input.parentDocumentId) as { version_no: number } | undefined;
    if (prev) versionNo = prev.version_no + 1;
  }
  const storageKey = `private/${claims.orgId}/${docId}/${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO os_documents (
      id, organization_id, customer_id, case_id, booking_id, doc_category, file_name,
      mime_type, size_bytes, storage_key, content_b64, scan_status, review_status,
      version_no, parent_document_id, uploaded_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'clean', 'received', ?, ?, ?, ?)`
  ).run(
    docId, claims.orgId, resolvedCustomerId, input.caseId ?? null, input.bookingId ?? null,
    input.docCategory, input.fileName, input.mimeType, bytes.length, storageKey,
    input.contentBase64, versionNo, input.parentDocumentId ?? null, claims.sub, now
  );

  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "document.upload",
    resourceType: "document",
    resourceId: docId,
    after: { fileName: input.fileName, mimeType: input.mimeType, sizeBytes: bytes.length, versionNo },
    requestId,
  });

  return { status: 201, body: { id: docId, scanStatus: "clean", reviewStatus: "received", versionNo } };
}

export function reviewDocument(
  db: DatabaseSync,
  claims: SessionClaims,
  docId: string,
  input: { decision: "approved" | "rejected"; reason?: string },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "document:review");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
  if (input.decision === "rejected" && !input.reason?.trim()) {
    return { status: 400, body: { code: "REASON_REQUIRED", message: "Rejection reason is required to request replacement", requestId } };
  }

  const doc = db.prepare("SELECT id, customer_id, review_status FROM os_documents WHERE id = ?").get(docId) as
    | { id: string; customer_id: string | null; review_status: string }
    | undefined;
  if (!doc) return { status: 404, body: { code: "NOT_FOUND", message: "Document not found", requestId } };

  db.prepare("UPDATE os_documents SET review_status = ?, review_reason = ?, reviewed_by = ? WHERE id = ?").run(
    input.decision,
    input.reason?.trim() ?? null,
    claims.sub,
    docId
  );

  if (input.decision === "rejected" && doc.customer_id) {
    enqueueOutboxEvent(
      db,
      "document.replacement_requested",
      docId,
      { docId, customerId: doc.customer_id, reason: input.reason?.trim() },
      `doc.reject:${docId}:${doc.review_status}`
    );
  }

  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: `document.${input.decision}`,
    resourceType: "document",
    resourceId: docId,
    reason: input.reason ?? null,
    requestId,
  });

  return { status: 200, body: { id: docId, reviewStatus: input.decision } };
}

export function getDocumentSignedUrl(
  db: DatabaseSync,
  claims: SessionClaims,
  docId: string,
  signedUrlSecret: string,
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "document:download");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const doc = db
    .prepare(
      `SELECT d.*, c.user_id as owner_user_id, c.partner_id as owner_partner_id, ca.assigned_employee_id
       FROM os_documents d
       LEFT JOIN os_customers c ON c.id = d.customer_id
       LEFT JOIN os_cases ca ON ca.id = d.case_id
       WHERE d.id = ? AND d.archived_at IS NULL`
    )
    .get(docId) as
    | { id: string; owner_user_id: string | null; owner_partner_id: string | null; assigned_employee_id: string | null; uploaded_by: string }
    | undefined;

  if (!doc) return { status: 404, body: { code: "NOT_FOUND", message: "Document not found", requestId } };

  if (claims.role === "customer" && doc.owner_user_id !== claims.sub && doc.uploaded_by !== claims.sub) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Cross-customer document download denied", requestId } };
  }
  if (claims.role === "partner" && doc.owner_partner_id !== claims.partnerId) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Cross-partner document download denied", requestId } };
  }
  if (claims.role === "employee" && doc.assigned_employee_id && doc.assigned_employee_id !== claims.sub && doc.uploaded_by !== claims.sub) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Document belongs to unassigned case", requestId } };
  }

  const signed = createSignedDocumentToken(docId, claims.sub, signedUrlSecret, 120);
  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "document.signed_url_issued",
    resourceType: "document",
    resourceId: docId,
    requestId,
  });

  return {
    status: 200,
    body: {
      signedUrl: `/api/v1/documents/${docId}/content?token=${encodeURIComponent(signed.token)}`,
      expiresAt: signed.expiresAt,
    },
  };
}

export function downloadSignedDocumentContent(
  db: DatabaseSync,
  docId: string,
  token: string | undefined,
  signedUrlSecret: string,
  requestId: string
): HttpResult {
  if (!token) return { status: 401, body: { code: "UNAUTHORIZED", message: "Missing signed token", requestId } };
  const verified = verifySignedDocumentToken(token, docId, signedUrlSecret);
  if (!verified) return { status: 403, body: { code: "TOKEN_INVALID_OR_EXPIRED", message: "Signed download URL expired or invalid", requestId } };

  const doc = db.prepare("SELECT file_name, mime_type, content_b64 FROM os_documents WHERE id = ? AND archived_at IS NULL").get(docId) as
    | { file_name: string; mime_type: string; content_b64: string }
    | undefined;
  if (!doc) return { status: 404, body: { code: "NOT_FOUND", message: "Document not found", requestId } };

  return {
    status: 200,
    body: { fileName: doc.file_name, mimeType: doc.mime_type, contentBase64: doc.content_b64 },
  };
}

export function exportCustomersCsv(db: DatabaseSync, claims: SessionClaims, requestId: string): HttpResult {
  const perm = hasPermission(claims, "customer:export");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const rows = db
    .prepare("SELECT id, full_name, primary_phone, primary_email, city, kyc_verified FROM os_customers WHERE organization_id = ? AND archived_at IS NULL")
    .all(claims.orgId) as Array<{ id: string; full_name: string; primary_phone: string; primary_email: string | null; city: string | null; kyc_verified: number }>;

  const csv = toCsv(
    ["ID", "Full Name", "Phone", "Email", "City", "KYC Verified"],
    rows.map((r) => [r.id, r.full_name, r.primary_phone, r.primary_email ?? "", r.city ?? "", r.kyc_verified ? "YES" : "NO"])
  );

  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "customer.export_csv",
    resourceType: "customer_export",
    resourceId: claims.orgId,
    after: { rowCount: rows.length },
    requestId,
  });

  return { status: 200, body: { csv, watermark: `EXPORTED_BY_${claims.sub}_${new Date().toISOString()}` } };
}
