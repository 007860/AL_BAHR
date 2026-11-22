import type { DatabaseSync } from "node:sqlite";
import { newId } from "../db/database.ts";
import { redactPii, sha256Hex } from "./security.ts";

export interface AuditInput {
  organizationId: string;
  actorUserId: string | null;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  requestId: string;
  ruleVersionId?: string | null;
}

export function recordAudit(db: DatabaseSync, entry: AuditInput): string {
  const id = newId();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO os_audit_events (
      id, organization_id, actor_user_id, actor_role, action,
      resource_type, resource_id, before_redacted, after_redacted,
      reason, request_id, rule_version_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    entry.organizationId,
    entry.actorUserId,
    entry.actorRole,
    entry.action,
    entry.resourceType,
    entry.resourceId,
    entry.before !== undefined ? JSON.stringify(redactPii(entry.before)) : null,
    entry.after !== undefined ? JSON.stringify(redactPii(entry.after)) : null,
    entry.reason ?? null,
    entry.requestId,
    entry.ruleVersionId ?? null,
    now
  );
  return id;
}

export function runWithIdempotency<T>(
  db: DatabaseSync,
  idemKey: string | undefined,
  actorScope: string,
  endpoint: string,
  payloadForHash: unknown,
  fn: () => { status: number; body: T }
): { status: number; body: T; replayed: boolean } {
  if (!idemKey) {
    const res = fn();
    return { ...res, replayed: false };
  }

  const reqHash = sha256Hex(JSON.stringify(payloadForHash ?? {}));
  const existing = db
    .prepare("SELECT request_hash, status_code, response_json FROM os_idempotency_keys WHERE idem_key = ? AND actor_scope = ? AND endpoint = ?")
    .get(idemKey, actorScope, endpoint) as { request_hash: string; status_code: number; response_json: string } | undefined;

  if (existing) {
    if (existing.request_hash !== reqHash) {
      return {
        status: 409,
        body: { code: "IDEMPOTENCY_CONFLICT", message: "Idempotency-Key reused with different payload" } as unknown as T,
        replayed: true,
      };
    }
    return {
      status: existing.status_code,
      body: JSON.parse(existing.response_json) as T,
      replayed: true,
    };
  }

  const res = fn();
  if (res.status < 500) {
    db.prepare(
      `INSERT INTO os_idempotency_keys (idem_key, actor_scope, endpoint, request_hash, status_code, response_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(idemKey, actorScope, endpoint, reqHash, res.status, JSON.stringify(res.body), new Date().toISOString());
  }
  return { ...res, replayed: false };
}
