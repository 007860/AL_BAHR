import type { DatabaseSync } from "node:sqlite";
import { newId } from "../db/database.ts";
import { redactPii } from "./security.ts";

// Strictly Zero-AI Deterministic Rules Engine (Blueprint Sec. 22 & 67)
const ALLOWED_TRIGGERS = new Set([
  "lead.created",
  "task.completed",
  "quote.accepted",
  "payment.evidence_received",
  "payment.verified",
  "package.expired",
  "sla.expired",
]);

const ALLOWED_FIELDS = new Set([
  "service_type",
  "source_channel",
  "priority",
  "amount_pkr",
  "country",
  "partner_id",
]);

const ALLOWED_OPERATORS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains"]);

const ALLOWED_ACTIONS = new Set([
  "assign_least_loaded",
  "route_manager_triage",
  "notify_manager",
  "create_review_task",
  "escalate_sla",
  "unpublish_package",
]);

export interface RuleCondition {
  field: string;
  op: string;
  value: unknown;
}

export interface RuleAction {
  type: string;
  params?: Record<string, unknown>;
}

export function validateRuleDefinition(trigger: string, conditions: RuleCondition[], actions: RuleAction[]): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED_TRIGGERS.has(trigger)) {
    return { ok: false, reason: `Unsupported trigger '${trigger}'` };
  }
  if (!Array.isArray(conditions) || !Array.isArray(actions) || actions.length === 0) {
    return { ok: false, reason: "Conditions array and at least one action are required" };
  }
  for (const cond of conditions) {
    if (!ALLOWED_FIELDS.has(cond.field)) {
      return { ok: false, reason: `Disallowed condition field '${cond.field}'` };
    }
    if (!ALLOWED_OPERATORS.has(cond.op)) {
      return { ok: false, reason: `Disallowed operator '${cond.op}'` };
    }
  }
  for (const act of actions) {
    if (!ALLOWED_ACTIONS.has(act.type)) {
      return { ok: false, reason: `Disallowed action '${act.type}'` };
    }
  }
  return { ok: true };
}

export function evaluateConditions(conditions: RuleCondition[], eventPayload: Record<string, unknown>): boolean {
  for (const c of conditions) {
    const actual = eventPayload[c.field];
    switch (c.op) {
      case "eq":
        if (actual !== c.value) return false;
        break;
      case "neq":
        if (actual === c.value) return false;
        break;
      case "gt":
        if (typeof actual !== "number" || typeof c.value !== "number" || !(actual > c.value)) return false;
        break;
      case "gte":
        if (typeof actual !== "number" || typeof c.value !== "number" || !(actual >= c.value)) return false;
        break;
      case "lt":
        if (typeof actual !== "number" || typeof c.value !== "number" || !(actual < c.value)) return false;
        break;
      case "lte":
        if (typeof actual !== "number" || typeof c.value !== "number" || !(actual <= c.value)) return false;
        break;
      case "in":
        if (!Array.isArray(c.value) || !c.value.includes(actual)) return false;
        break;
      case "contains":
        if (typeof actual !== "string" || typeof c.value !== "string" || !actual.toLowerCase().includes(c.value.toLowerCase())) return false;
        break;
      default:
        return false;
    }
  }
  return true;
}

export function isCategoryPaused(db: DatabaseSync, orgId: string, triggerEvent: string): boolean {
  const row = db
    .prepare("SELECT automation_paused_categories_json FROM os_company_settings WHERE organization_id = ?")
    .get(orgId) as { automation_paused_categories_json: string } | undefined;
  if (!row) return false;
  const paused = JSON.parse(row.automation_paused_categories_json) as string[];
  return paused.includes("*") || paused.includes(triggerEvent);
}

export function evaluateActiveRules(
  db: DatabaseSync,
  orgId: string,
  triggerEvent: string,
  subjectType: string,
  subjectId: string,
  payload: Record<string, unknown>,
  dryRun = false
): {
  paused: boolean;
  matchedRuleId: string | null;
  matchedRuleVersionId: string | null;
  actions: RuleAction[];
  decisionLogId: string | null;
} {
  if (isCategoryPaused(db, orgId, triggerEvent)) {
    let logId: string | null = null;
    if (!dryRun) {
      logId = newId();
      db.prepare(
        `INSERT INTO os_decision_logs (id, event_id, rule_version_id, subject_type, subject_id, result, reason_code, redacted_context_json, created_at)
         VALUES (?, ?, NULL, ?, ?, 'paused', 'EMERGENCY_PAUSE_ACTIVE', ?, ?)`
      ).run(logId, `${triggerEvent}:${subjectId}`, subjectType, subjectId, JSON.stringify(redactPii(payload)), new Date().toISOString());
    }
    return { paused: true, matchedRuleId: null, matchedRuleVersionId: null, actions: [], decisionLogId: logId };
  }

  const rules = db
    .prepare(
      `SELECT r.id as rule_id, r.current_version_id, rv.conditions_json, rv.actions_json
       FROM os_automation_rules r
       JOIN os_rule_versions rv ON rv.id = r.current_version_id
       WHERE r.organization_id = ? AND r.trigger_event = ? AND r.status = 'active'
       ORDER BY r.priority ASC, r.created_at ASC`
    )
    .all(orgId, triggerEvent) as Array<{
      rule_id: string;
      current_version_id: string;
      conditions_json: string;
      actions_json: string;
    }>;

  for (const r of rules) {
    const conditions = JSON.parse(r.conditions_json) as RuleCondition[];
    const actions = JSON.parse(r.actions_json) as RuleAction[];
    if (evaluateConditions(conditions, payload)) {
      let logId: string | null = null;
      if (!dryRun) {
        logId = newId();
        db.prepare(
          `INSERT INTO os_decision_logs (id, event_id, rule_version_id, subject_type, subject_id, result, reason_code, redacted_context_json, created_at)
           VALUES (?, ?, ?, ?, ?, 'matched', 'RULE_MATCHED', ?, ?)`
        ).run(
          logId,
          `${triggerEvent}:${subjectId}`,
          r.current_version_id,
          subjectType,
          subjectId,
          JSON.stringify(redactPii(payload)),
          new Date().toISOString()
        );
      }
      return {
        paused: false,
        matchedRuleId: r.rule_id,
        matchedRuleVersionId: r.current_version_id,
        actions,
        decisionLogId: logId,
      };
    }
  }

  return { paused: false, matchedRuleId: null, matchedRuleVersionId: null, actions: [], decisionLogId: null };
}
