import type { SessionClaims } from "./security.ts";

export type RoleId = "ceo" | "manager" | "employee" | "finance" | "support" | "customer" | "partner";

export type ActionCode =
  | "dashboard:read"
  | "lead:create"
  | "lead:read"
  | "lead:assign"
  | "lead:convert"
  | "customer:create"
  | "customer:read"
  | "customer:export"
  | "case:create"
  | "case:read"
  | "case:update"
  | "case:escalate"
  | "task:complete"
  | "quote:create"
  | "quote:send"
  | "quote:accept"
  | "quote:override_markup"
  | "invoice:generate"
  | "payment:upload_slip"
  | "payment:verify"
  | "payment:refund_approve"
  | "ledger:read"
  | "ledger:write"
  | "ledger:lock_period"
  | "booking:create"
  | "booking:confirm_supplier"
  | "flight:issue_ticket"
  | "document:upload"
  | "document:review"
  | "document:download"
  | "staff:invite"
  | "staff:change_role"
  | "staff:deactivate"
  | "staff:attendance_self"
  | "staff:approve_leave"
  | "partner:invite"
  | "partner:terms"
  | "partner:commission_approve"
  | "supplier:manage"
  | "cms:draft"
  | "cms:publish"
  | "campaign:draft"
  | "campaign:send"
  | "support:create"
  | "support:manage"
  | "rules:read"
  | "rules:draft"
  | "rules:activate"
  | "rules:emergency_pause"
  | "audit:read"
  | "settings:write"
  | "backup:test_restore"
  | "backup:prod_restore"
  | "session:revoke_all";

const ROLE_GRANTS: Record<RoleId, Set<ActionCode>> = {
  ceo: new Set([
    "dashboard:read", "lead:create", "lead:read", "lead:assign", "lead:convert",
    "customer:create", "customer:read", "customer:export",
    "case:create", "case:read", "case:update", "case:escalate", "task:complete",
    "quote:create", "quote:send", "quote:accept", "quote:override_markup",
    "invoice:generate", "payment:upload_slip", "payment:verify", "payment:refund_approve",
    "ledger:read", "ledger:write", "ledger:lock_period",
    "booking:create", "booking:confirm_supplier", "flight:issue_ticket",
    "document:upload", "document:review", "document:download",
    "staff:invite", "staff:change_role", "staff:deactivate", "staff:attendance_self", "staff:approve_leave",
    "partner:invite", "partner:terms", "partner:commission_approve", "supplier:manage",
    "cms:draft", "cms:publish", "campaign:draft", "campaign:send",
    "support:create", "support:manage",
    "rules:read", "rules:draft", "rules:activate", "rules:emergency_pause",
    "audit:read", "settings:write", "backup:test_restore", "backup:prod_restore", "session:revoke_all",
  ]),
  manager: new Set([
    "dashboard:read", "lead:create", "lead:read", "lead:assign", "lead:convert",
    "customer:create", "customer:read",
    "case:create", "case:read", "case:update", "case:escalate", "task:complete",
    "quote:create", "quote:send",
    "invoice:generate", "booking:create", "booking:confirm_supplier", "flight:issue_ticket",
    "document:upload", "document:review", "document:download",
    "staff:invite", "staff:deactivate", "staff:attendance_self", "staff:approve_leave",
    "supplier:manage", "cms:draft", "campaign:draft",
    "support:create", "support:manage", "rules:read", "rules:draft", "audit:read",
  ]),
  employee: new Set([
    "dashboard:read", "lead:create", "lead:read", "lead:convert",
    "customer:create", "customer:read",
    "case:create", "case:read", "case:update", "case:escalate", "task:complete",
    "quote:create", "invoice:generate",
    "booking:create", "booking:confirm_supplier", "flight:issue_ticket",
    "document:upload", "document:review", "document:download",
    "staff:attendance_self", "cms:draft", "campaign:draft", "support:create", "audit:read",
  ]),
  finance: new Set([
    "dashboard:read", "customer:read", "case:read",
    "invoice:generate", "payment:verify", "payment:refund_approve",
    "ledger:read", "ledger:write", "ledger:lock_period",
    "partner:commission_approve", "document:download", "staff:attendance_self",
    "support:create", "audit:read",
  ]),
  support: new Set([
    "dashboard:read", "lead:create", "lead:read", "customer:read",
    "case:read", "case:escalate", "document:upload", "document:download",
    "staff:attendance_self", "support:create", "support:manage", "audit:read",
  ]),
  customer: new Set([
    "dashboard:read", "lead:create", "customer:read", "case:create", "case:read",
    "quote:accept", "payment:upload_slip", "document:upload", "document:download",
    "support:create", "audit:read",
  ]),
  partner: new Set([
    "dashboard:read", "lead:create", "lead:read", "customer:create", "customer:read",
    "case:create", "case:read", "quote:accept", "document:upload", "document:download",
    "support:create", "audit:read",
  ]),
};

const AAL2_REQUIRED_ACTIONS = new Set<ActionCode>([
  "staff:change_role",
  "rules:activate",
  "rules:emergency_pause",
  "settings:write",
  "backup:prod_restore",
  "session:revoke_all",
  "ledger:lock_period",
]);

export function hasPermission(claims: SessionClaims, action: ActionCode): { ok: true } | { ok: false; status: number; reason: string } {
  const role = claims.role as RoleId;
  const set = ROLE_GRANTS[role];
  if (!set || !set.has(action)) {
    return { ok: false, status: 403, reason: `Role '${claims.role}' is not authorized for '${action}'` };
  }
  if (AAL2_REQUIRED_ACTIONS.has(action) && claims.aal !== "aal2") {
    return { ok: false, status: 403, reason: `MFA (aal2) re-authentication required for '${action}'` };
  }
  return { ok: true };
}

export function canChangeRole(actor: SessionClaims, targetUserId: string, newRole: RoleId): { ok: true } | { ok: false; reason: string } {
  if (actor.role !== "ceo") {
    return { ok: false, reason: "Only CEO may assign or change user roles" };
  }
  if (actor.sub === targetUserId && newRole !== "ceo") {
    return { ok: false, reason: "CEO cannot demote own sole admin session directly" };
  }
  if (actor.sub === targetUserId) {
    return { ok: false, reason: "Self-role modification is blocked" };
  }
  if (!ROLE_GRANTS[newRole]) {
    return { ok: false, reason: `Unknown role '${newRole}'` };
  }
  return { ok: true };
}
