import crypto from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { newId } from "../db/database.ts";
import { recordAudit, runWithIdempotency } from "../core/audit-idempotency.ts";
import { enqueueOutboxEvent } from "../core/outbox.ts";
import { canChangeRole, hasPermission, type RoleId } from "../core/rbac.ts";
import { evaluateActiveRules, validateRuleDefinition, type RuleAction, type RuleCondition } from "../core/rules-engine.ts";
import { findEligibleCandidates } from "../core/smart-assignment.ts";
import { hashPassword, sha256Hex, type SessionClaims } from "../core/security.ts";
import type { HttpResult } from "./crm-cases.ts";

// --- EMPLOYEES & HR ---

export function inviteEmployee(
  db: DatabaseSync,
  claims: SessionClaims,
  input: { email: string; fullName: string; targetRole: RoleId; teamId?: string; skills?: string[]; maxActive?: number },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "staff:invite");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
  if (!input.email?.includes("@") || !input.fullName?.trim()) {
    return { status: 400, body: { code: "VALIDATION_ERROR", message: "Valid work email and full name required", requestId } };
  }
  if (input.targetRole === "ceo" && claims.role !== "ceo") {
    return { status: 403, body: { code: "FORBIDDEN", message: "Only CEO can invite CEO-level accounts", requestId } };
  }

  const rawToken = crypto.randomBytes(24).toString("base64url");
  const tokenHash = sha256Hex(rawToken);
  const inviteId = newId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();

  db.prepare(
    `INSERT INTO os_invitations (
      id, organization_id, email, full_name, target_role, team_id, skill_codes_json,
      max_active, token_hash, invited_by, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    inviteId,
    claims.orgId,
    input.email.trim().toLowerCase(),
    input.fullName.trim(),
    input.targetRole,
    input.teamId ?? "general",
    JSON.stringify(input.skills ?? ["general"]),
    input.maxActive ?? 10,
    tokenHash,
    claims.sub,
    expiresAt,
    now.toISOString()
  );

  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "staff.invited",
    resourceType: "invitation",
    resourceId: inviteId,
    after: { email: input.email.trim().toLowerCase(), targetRole: input.targetRole },
    requestId,
  });

  // Return one-time token ONLY in invite creation response (stored hashed in DB)
  return { status: 201, body: { id: inviteId, expiresAt, activationToken: rawToken } };
}

export function redeemEmployeeInvitation(
  db: DatabaseSync,
  input: { activationToken: string; password: string; acceptTerms: boolean },
  requestId: string
): HttpResult {
  if (!input.activationToken || !input.password || input.password.length < 10 || !input.acceptTerms) {
    return { status: 400, body: { code: "VALIDATION_ERROR", message: "Valid token, strong password (>=10 chars), and terms consent required", requestId } };
  }

  const tokenHash = sha256Hex(input.activationToken);
  const inv = db.prepare("SELECT * FROM os_invitations WHERE token_hash = ?").get(tokenHash) as
    | {
        id: string;
        organization_id: string;
        email: string;
        full_name: string;
        target_role: string;
        team_id: string | null;
        skill_codes_json: string;
        max_active: number;
        expires_at: string;
        redeemed_at: string | null;
        revoked_at: string | null;
      }
    | undefined;

  if (!inv || inv.revoked_at || inv.redeemed_at || new Date(inv.expires_at).getTime() <= Date.now()) {
    return { status: 410, body: { code: "INVITE_INVALID_OR_EXPIRED", message: "Invitation is invalid, redeemed, revoked, or expired", requestId } };
  }

  const now = new Date().toISOString();
  const userId = newId();
  const skills = JSON.parse(inv.skill_codes_json) as string[];

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO os_users (id, organization_id, email, password_hash, full_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    ).run(userId, inv.organization_id, inv.email, hashPassword(input.password), inv.full_name, now, now);

    db.prepare(
      `INSERT INTO os_memberships (id, organization_id, user_id, role_id, team_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(newId(), inv.organization_id, userId, inv.target_role, inv.team_id, now);

    if (["employee", "manager", "support", "finance"].includes(inv.target_role)) {
      db.prepare(
        `INSERT INTO os_employees (user_id, organization_id, team_id, max_active_tasks, active_weighted_load, auto_assign_enabled, leave_status, updated_at)
         VALUES (?, ?, ?, ?, 0, 1, 'available', ?)`
      ).run(userId, inv.organization_id, inv.team_id ?? "general", inv.max_active, now);

      for (const sk of skills) {
        db.prepare("INSERT OR IGNORE INTO os_staff_skills (employee_user_id, service_code, active) VALUES (?, ?, 1)").run(userId, sk);
      }
    }

    db.prepare("UPDATE os_invitations SET redeemed_at = ? WHERE id = ?").run(now, inv.id);
    db.prepare(
      `INSERT INTO os_consent_events (id, organization_id, subject_type, subject_id, channel, consented, source, created_at)
       VALUES (?, ?, 'employee', ?, 'terms', 1, 'activation_portal', ?)`
    ).run(newId(), inv.organization_id, userId, now);

    recordAudit(db, {
      organizationId: inv.organization_id,
      actorUserId: userId,
      actorRole: inv.target_role,
      action: "staff.activated",
      resourceType: "user",
      resourceId: userId,
      requestId,
    });
    db.exec("COMMIT");
    return { status: 201, body: { userId, email: inv.email, role: inv.target_role, status: "active" } };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function changeStaffRole(
  db: DatabaseSync,
  claims: SessionClaims,
  targetUserId: string,
  newRole: RoleId,
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "staff:change_role");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const check = canChangeRole(claims, targetUserId, newRole);
  if (!check.ok) return { status: 403, body: { code: "FORBIDDEN", message: check.reason, requestId } };

  const membership = db.prepare("SELECT role_id FROM os_memberships WHERE user_id = ?").get(targetUserId) as { role_id: string } | undefined;
  if (!membership) return { status: 404, body: { code: "NOT_FOUND", message: "Target membership not found", requestId } };

  db.prepare("UPDATE os_memberships SET role_id = ?, granted_by = ? WHERE user_id = ?").run(newRole, claims.sub, targetUserId);
  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "staff.role_changed",
    resourceType: "user",
    resourceId: targetUserId,
    before: { role: membership.role_id },
    after: { role: newRole },
    requestId,
  });
  return { status: 200, body: { userId: targetUserId, role: newRole } };
}

export function deactivateStaffAndRevokeSessions(
  db: DatabaseSync,
  claims: SessionClaims,
  targetUserId: string,
  reason: string,
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "staff:deactivate");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
  if (targetUserId === claims.sub) {
    return { status: 400, body: { code: "INVALID_ACTION", message: "Cannot deactivate own active session", requestId } };
  }

  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE os_users SET status = 'deactivated', updated_at = ? WHERE id = ?").run(now, targetUserId);
    db.prepare("UPDATE os_employees SET auto_assign_enabled = 0, updated_at = ? WHERE user_id = ?").run(now, targetUserId);
    db.prepare("UPDATE os_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(now, targetUserId);

    // Move open leads/cases to manager triage review queue (E2E-07)
    const openCases = db
      .prepare("SELECT id FROM os_cases WHERE assigned_employee_id = ? AND status NOT IN ('completed', 'cancelled')")
      .all(targetUserId) as Array<{ id: string }>;
    db.prepare("UPDATE os_leads SET assigned_employee_id = NULL, status = 'triaged' WHERE assigned_employee_id = ? AND status NOT IN ('converted', 'closed', 'spam')").run(
      targetUserId
    );
    db.prepare("UPDATE os_cases SET assigned_employee_id = NULL, status = 'submitted' WHERE assigned_employee_id = ? AND status NOT IN ('completed', 'cancelled')").run(
      targetUserId
    );

    if (openCases.length > 0) {
      enqueueOutboxEvent(
        db,
        "staff.deactivated_reassignment_needed",
        targetUserId,
        { targetUserId, openCaseCount: openCases.length },
        `deact:${targetUserId}:${now}`
      );
    }

    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "staff.deactivated",
      resourceType: "user",
      resourceId: targetUserId,
      reason: reason || "Deactivated by administrator",
      after: { openCasesRequeued: openCases.length, sessionsRevoked: true },
      requestId,
    });
    db.exec("COMMIT");
    return { status: 200, body: { userId: targetUserId, status: "deactivated", openCasesRequeued: openCases.length } };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// --- ATTENDANCE & LEAVE ---

export function checkInOutAttendance(db: DatabaseSync, claims: SessionClaims, mode: "check_in" | "check_out", requestId: string): HttpResult {
  const perm = hasPermission(claims, "staff:attendance_self");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  // Asia/Karachi local date
  const pktDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT * FROM os_attendance_events WHERE employee_user_id = ? AND work_date = ?").get(claims.sub, pktDate) as
    | { id: string; checked_out_at: string | null }
    | undefined;

  if (mode === "check_in") {
    if (existing) return { status: 409, body: { code: "ALREADY_CHECKED_IN", message: "Duplicate check-in prevented for today", requestId } };
    const id = newId();
    db.prepare("INSERT INTO os_attendance_events (id, employee_user_id, work_date, checked_in_at) VALUES (?, ?, ?, ?)").run(
      id,
      claims.sub,
      pktDate,
      now
    );
    return { status: 201, body: { id, workDate: pktDate, checkedInAt: now } };
  }

  if (!existing) return { status: 404, body: { code: "NOT_CHECKED_IN", message: "Must check in before checking out", requestId } };
  if (existing.checked_out_at) return { status: 409, body: { code: "ALREADY_CHECKED_OUT", message: "Already checked out today", requestId } };
  db.prepare("UPDATE os_attendance_events SET checked_out_at = ? WHERE id = ?").run(now, existing.id);
  return { status: 200, body: { id: existing.id, workDate: pktDate, checkedOutAt: now } };
}

export function decideLeaveRequest(
  db: DatabaseSync,
  claims: SessionClaims,
  leaveId: string,
  decision: "approved" | "rejected",
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "staff:approve_leave");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const leave = db.prepare("SELECT * FROM os_leave_requests WHERE id = ?").get(leaveId) as
    | { id: string; employee_user_id: string; status: string }
    | undefined;
  if (!leave) return { status: 404, body: { code: "NOT_FOUND", message: "Leave request not found", requestId } };

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE os_leave_requests SET status = ?, decided_by = ? WHERE id = ?").run(decision, claims.sub, leaveId);
    if (decision === "approved") {
      db.prepare("UPDATE os_employees SET leave_status = 'on_leave', updated_at = ? WHERE user_id = ?").run(
        new Date().toISOString(),
        leave.employee_user_id
      );
    }
    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: `leave.${decision}`,
      resourceType: "leave_request",
      resourceId: leaveId,
      requestId,
    });
    db.exec("COMMIT");
    return { status: 200, body: { id: leaveId, status: decision } };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// --- WEBSITE CMS, CAMPAIGNS & SUBSCRIBERS ---

export function createCampaignAndSend(
  db: DatabaseSync,
  claims: SessionClaims,
  input: { title: string; subject: string; bodyTemplate: string },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "campaign:draft");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };
  if (!input.bodyTemplate.toLowerCase().includes("unsubscribe")) {
    return { status: 400, body: { code: "UNSUBSCRIBE_REQUIRED", message: "Campaign template must contain an unsubscribe link", requestId } };
  }
  const id = newId();
  db.prepare(
    `INSERT INTO os_campaigns (id, organization_id, title, subject, body_template, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'approved', ?)`
  ).run(id, claims.orgId, input.title, input.subject, input.bodyTemplate, new Date().toISOString());
  return { status: 201, body: { id, status: "approved" } };
}

export function sendCampaignIdempotent(
  db: DatabaseSync,
  claims: SessionClaims,
  campaignId: string,
  idemKey: string | undefined,
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "campaign:send");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  return runWithIdempotency(db, idemKey, claims.sub, `POST:/api/v1/campaigns/${campaignId}/send`, { campaignId }, () => {
    const subs = db
      .prepare("SELECT id, email FROM os_subscribers WHERE organization_id = ? AND status = 'subscribed'")
      .all(claims.orgId) as Array<{ id: string; email: string }>;

    const now = new Date().toISOString();
    let enqueued = 0;
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const s of subs) {
        const res = db
          .prepare("INSERT OR IGNORE INTO os_campaign_deliveries (id, campaign_id, subscriber_id, status, created_at) VALUES (?, ?, ?, 'queued', ?)")
          .run(newId(), campaignId, s.id, now);
        if (Number(res.changes) > 0) enqueued++;
      }
      db.prepare("UPDATE os_campaigns SET status = 'completed' WHERE id = ?").run(campaignId);
      recordAudit(db, {
        organizationId: claims.orgId,
        actorUserId: claims.sub,
        actorRole: claims.role,
        action: "campaign.sent",
        resourceType: "campaign",
        resourceId: campaignId,
        after: { recipientCount: subs.length, newlyQueued: enqueued },
        requestId,
      });
      db.exec("COMMIT");
      return { status: 200, body: { campaignId, eligibleSubscribers: subs.length, newlyQueued: enqueued } };
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  });
}

// --- VERIFIED-ONLY REVIEWS ---

export function submitReview(
  db: DatabaseSync,
  claims: SessionClaims,
  input: { bookingId: string; rating: number; comment: string },
  requestId: string
): HttpResult {
  const booking = db
    .prepare("SELECT b.id, b.customer_id, b.status, c.user_id FROM os_bookings b JOIN os_customers c ON c.id = b.customer_id WHERE b.id = ?")
    .get(input.bookingId) as { id: string; customer_id: string; status: string; user_id: string | null } | undefined;

  if (!booking) return { status: 404, body: { code: "NOT_FOUND", message: "Booking not found", requestId } };
  if (claims.role === "customer" && booking.user_id !== claims.sub) {
    return { status: 403, body: { code: "FORBIDDEN", message: "Can only review your own completed booking", requestId } };
  }
  if (!["confirmed", "documents_issued", "completed"].includes(booking.status)) {
    return { status: 422, body: { code: "UNVERIFIED_BOOKING", message: "Reviews allowed only for genuine confirmed/completed bookings", requestId } };
  }

  const id = newId();
  db.prepare("INSERT INTO os_reviews (id, customer_id, booking_id, rating, comment, status, created_at) VALUES (?, ?, ?, ?, ?, 'submitted', ?)").run(
    id,
    booking.customer_id,
    booking.id,
    input.rating,
    input.comment,
    new Date().toISOString()
  );
  return { status: 201, body: { id, status: "submitted" } };
}

// --- RULES STUDIO & SIMULATION (ZERO-AI) ---

export function createRuleDraft(
  db: DatabaseSync,
  claims: SessionClaims,
  input: { name: string; triggerEvent: string; priority?: number; conditions: RuleCondition[]; actions: RuleAction[] },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "rules:draft");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const valid = validateRuleDefinition(input.triggerEvent, input.conditions, input.actions);
  if (!valid.ok) return { status: 400, body: { code: "INVALID_RULE", message: valid.reason, requestId } };

  const ruleId = newId();
  const versionId = newId();
  const now = new Date().toISOString();

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `INSERT INTO os_automation_rules (id, organization_id, name, trigger_event, priority, status, current_version_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)`
    ).run(ruleId, claims.orgId, input.name, input.triggerEvent, input.priority ?? 100, versionId, now);

    db.prepare(
      `INSERT INTO os_rule_versions (id, rule_id, version_no, conditions_json, actions_json, created_by, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?)`
    ).run(versionId, ruleId, JSON.stringify(input.conditions), JSON.stringify(input.actions), claims.sub, now);

    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "rule.draft_created",
      resourceType: "automation_rule",
      resourceId: ruleId,
      requestId,
    });
    db.exec("COMMIT");
    return { status: 201, body: { id: ruleId, versionId, versionNo: 1, status: "draft" } };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function activateOrRollbackRule(
  db: DatabaseSync,
  claims: SessionClaims,
  ruleId: string,
  targetVersionId: string | undefined,
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "rules:activate");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  const rule = db.prepare("SELECT * FROM os_automation_rules WHERE id = ?").get(ruleId) as { id: string; current_version_id: string } | undefined;
  if (!rule) return { status: 404, body: { code: "NOT_FOUND", message: "Rule not found", requestId } };

  const now = new Date().toISOString();
  if (targetVersionId) {
    // Rollback creates a NEW version snapshot preserving historical decision evidence (E2E-08)
    const oldVer = db.prepare("SELECT * FROM os_rule_versions WHERE id = ? AND rule_id = ?").get(targetVersionId, ruleId) as
      | { conditions_json: string; actions_json: string }
      | undefined;
    if (!oldVer) return { status: 404, body: { code: "VERSION_NOT_FOUND", message: "Target rule version not found", requestId } };

    const maxRow = db.prepare("SELECT MAX(version_no) as m FROM os_rule_versions WHERE rule_id = ?").get(ruleId) as { m: number };
    const newVerId = newId();
    const newVerNo = (maxRow.m ?? 0) + 1;
    db.prepare(
      `INSERT INTO os_rule_versions (id, rule_id, version_no, conditions_json, actions_json, created_by, approved_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(newVerId, ruleId, newVerNo, oldVer.conditions_json, oldVer.actions_json, claims.sub, claims.sub, now);
    db.prepare("UPDATE os_automation_rules SET current_version_id = ?, status = 'active' WHERE id = ?").run(newVerId, ruleId);

    recordAudit(db, {
      organizationId: claims.orgId,
      actorUserId: claims.sub,
      actorRole: claims.role,
      action: "rule.rolled_back",
      resourceType: "automation_rule",
      resourceId: ruleId,
      after: { newVersionId: newVerId, newVersionNo: newVerNo, restoredFrom: targetVersionId },
      requestId,
    });
    return { status: 200, body: { id: ruleId, currentVersionId: newVerId, versionNo: newVerNo, status: "active" } };
  }

  db.prepare("UPDATE os_rule_versions SET approved_by = ? WHERE id = ?").run(claims.sub, rule.current_version_id);
  db.prepare("UPDATE os_automation_rules SET status = 'active' WHERE id = ?").run(ruleId);
  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "rule.activated",
    resourceType: "automation_rule",
    resourceId: ruleId,
    requestId,
  });
  return { status: 200, body: { id: ruleId, currentVersionId: rule.current_version_id, status: "active" } };
}

export function simulateRulesAndQueue(
  db: DatabaseSync,
  claims: SessionClaims,
  input: { triggerEvent: string; serviceType: string; payload: Record<string, unknown> },
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "rules:read");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  // Strictly dryRun=true — zero DB mutations!
  const ruleEval = evaluateActiveRules(db, claims.orgId, input.triggerEvent, "simulation", "sim-001", input.payload, true);
  const candidates = findEligibleCandidates(db, claims.orgId, input.serviceType);

  return {
    status: 200,
    body: {
      dryRun: true,
      paused: ruleEval.paused,
      matchedRuleId: ruleEval.matchedRuleId,
      matchedRuleVersionId: ruleEval.matchedRuleVersionId,
      expectedActions: ruleEval.actions,
      eligibleCandidates: candidates,
      wouldAssignTo: ruleEval.paused ? null : candidates[0]?.user_id ?? null,
    },
  };
}

export function emergencyPauseAutomation(
  db: DatabaseSync,
  claims: SessionClaims,
  categories: string[],
  requestId: string
): HttpResult {
  const perm = hasPermission(claims, "rules:emergency_pause");
  if (!perm.ok) return { status: perm.status, body: { code: "FORBIDDEN", message: perm.reason, requestId } };

  db.prepare("UPDATE os_company_settings SET automation_paused_categories_json = ?, updated_at = ? WHERE organization_id = ?").run(
    JSON.stringify(categories),
    new Date().toISOString(),
    claims.orgId
  );
  recordAudit(db, {
    organizationId: claims.orgId,
    actorUserId: claims.sub,
    actorRole: claims.role,
    action: "rules.emergency_pause",
    resourceType: "company_settings",
    resourceId: claims.orgId,
    after: { pausedCategories: categories },
    requestId,
  });
  return { status: 200, body: { pausedCategories: categories } };
}
