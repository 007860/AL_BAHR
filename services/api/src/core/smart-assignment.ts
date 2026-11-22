import type { DatabaseSync } from "node:sqlite";
import { newId } from "../db/database.ts";
import { enqueueOutboxEvent } from "./outbox.ts";

export interface AssignmentCandidate {
  user_id: string;
  full_name: string;
  team_id: string;
  active_weighted_load: number;
  max_active_tasks: number;
  last_assigned_at: string | null;
}

export interface AssignmentOutcome {
  assignedEmployeeId: string | null;
  queue: "assigned_employee" | "manager_triage";
  reasonCode: string;
  decisionLogId: string;
}

// Deterministic Smart Assignment Algorithm (Blueprint Sec. 20)
export function findEligibleCandidates(db: DatabaseSync, orgId: string, serviceType: string): AssignmentCandidate[] {
  return db
    .prepare(
      `SELECT e.user_id, u.full_name, e.team_id, e.active_weighted_load, e.max_active_tasks, e.last_assigned_at
       FROM os_employees e
       JOIN os_users u ON u.id = e.user_id
       JOIN os_staff_skills s ON s.employee_user_id = e.user_id
       WHERE e.organization_id = ?
         AND u.status = 'active'
         AND e.auto_assign_enabled = 1
         AND e.leave_status = 'available'
         AND e.max_active_tasks > 0
         AND e.active_weighted_load < e.max_active_tasks
         AND s.active = 1
         AND (s.service_code = ? OR s.service_code = 'general')
       ORDER BY (CAST(e.active_weighted_load AS REAL) / e.max_active_tasks) ASC,
                e.active_weighted_load ASC,
                CASE WHEN e.last_assigned_at IS NULL THEN 0 ELSE 1 END ASC,
                e.last_assigned_at ASC,
                e.user_id ASC`
    )
    .all(orgId, serviceType) as unknown as AssignmentCandidate[];
}

export function assignSubjectLeastLoaded(
  db: DatabaseSync,
  params: {
    orgId: string;
    subjectType: "lead" | "case" | "task" | "ticket";
    subjectId: string;
    serviceType: string;
    taskWeight?: number;
    ruleVersionId?: string | null;
  }
): AssignmentOutcome {
  const now = new Date().toISOString();
  const weight = params.taskWeight ?? 1;
  const candidates = findEligibleCandidates(db, params.orgId, params.serviceType);

  if (candidates.length === 0) {
    const decisionId = newId();
    db.prepare(
      `INSERT INTO os_decision_logs (id, event_id, rule_version_id, subject_type, subject_id, result, reason_code, redacted_context_json, created_at)
       VALUES (?, ?, ?, ?, ?, 'manager_triage', 'NO_ELIGIBLE_EMPLOYEE', ?, ?)`
    ).run(
      decisionId,
      `${params.subjectType}.assign:${params.subjectId}`,
      params.ruleVersionId ?? null,
      params.subjectType,
      params.subjectId,
      JSON.stringify({ serviceType: params.serviceType }),
      now
    );
    db.prepare(
      `INSERT INTO os_assignment_events (id, subject_type, subject_id, employee_user_id, decision_log_id, created_at)
       VALUES (?, ?, ?, NULL, ?, ?)`
    ).run(newId(), params.subjectType, params.subjectId, decisionId, now);

    enqueueOutboxEvent(
      db,
      "triage.sla_alert",
      params.subjectId,
      { subjectType: params.subjectType, serviceType: params.serviceType, reason: "NO_ELIGIBLE_EMPLOYEE" },
      `triage:${params.subjectType}:${params.subjectId}`
    );

    return {
      assignedEmployeeId: null,
      queue: "manager_triage",
      reasonCode: "NO_ELIGIBLE_EMPLOYEE",
      decisionLogId: decisionId,
    };
  }

  const chosen = candidates[0];
  db.prepare(
    `UPDATE os_employees
     SET active_weighted_load = active_weighted_load + ?, last_assigned_at = ?, updated_at = ?
     WHERE user_id = ?`
  ).run(weight, now, now, chosen.user_id);

  const decisionId = newId();
  db.prepare(
    `INSERT INTO os_decision_logs (id, event_id, rule_version_id, subject_type, subject_id, result, reason_code, redacted_context_json, created_at)
     VALUES (?, ?, ?, ?, ?, 'assigned', 'LEAST_LOAD_ROUND_ROBIN', ?, ?)`
  ).run(
    decisionId,
    `${params.subjectType}.assign:${params.subjectId}`,
    params.ruleVersionId ?? null,
    params.subjectType,
    params.subjectId,
    JSON.stringify({ serviceType: params.serviceType, chosenLoadBefore: chosen.active_weighted_load, candidateCount: candidates.length }),
    now
  );

  db.prepare(
    `INSERT INTO os_assignment_events (id, subject_type, subject_id, employee_user_id, decision_log_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(newId(), params.subjectType, params.subjectId, chosen.user_id, decisionId, now);

  enqueueOutboxEvent(
    db,
    "assignment.notified",
    params.subjectId,
    { subjectType: params.subjectType, employeeUserId: chosen.user_id },
    `assign:${params.subjectType}:${params.subjectId}:${chosen.user_id}`
  );

  return {
    assignedEmployeeId: chosen.user_id,
    queue: "assigned_employee",
    reasonCode: "LEAST_LOAD_ROUND_ROBIN",
    decisionLogId: decisionId,
  };
}
