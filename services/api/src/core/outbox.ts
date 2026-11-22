import type { DatabaseSync } from "node:sqlite";
import { newId } from "../db/database.ts";

export function enqueueOutboxEvent(
  db: DatabaseSync,
  eventType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  dedupeKey: string
): { queued: boolean; id: string | null } {
  const existing = db.prepare("SELECT id FROM os_outbox_events WHERE dedupe_key = ?").get(dedupeKey) as { id: string } | undefined;
  if (existing) {
    return { queued: false, id: existing.id };
  }
  const id = newId();
  db.prepare(
    `INSERT INTO os_outbox_events (id, event_type, aggregate_id, payload_json, dedupe_key, status, attempt_count, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`
  ).run(id, eventType, aggregateId, JSON.stringify(payload), dedupeKey, new Date().toISOString());
  return { queued: true, id };
}

export function processOutboxBatch(
  db: DatabaseSync,
  handler: (event: { id: string; event_type: string; aggregate_id: string; payload: Record<string, unknown> }) => void,
  maxAttempts = 3
): { processed: number; deadLettered: number } {
  const pending = db
    .prepare("SELECT id, event_type, aggregate_id, payload_json, attempt_count FROM os_outbox_events WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50")
    .all() as Array<{ id: string; event_type: string; aggregate_id: string; payload_json: string; attempt_count: number }>;

  let processed = 0;
  let deadLettered = 0;

  for (const row of pending) {
    try {
      handler({
        id: row.id,
        event_type: row.event_type,
        aggregate_id: row.aggregate_id,
        payload: JSON.parse(row.payload_json) as Record<string, unknown>,
      });
      db.prepare("UPDATE os_outbox_events SET status = 'completed', attempt_count = attempt_count + 1 WHERE id = ?").run(row.id);
      processed++;
    } catch (err) {
      const nextAttempt = row.attempt_count + 1;
      const nextStatus = nextAttempt >= maxAttempts ? "dead_letter" : "pending";
      if (nextStatus === "dead_letter") deadLettered++;
      db.prepare("UPDATE os_outbox_events SET status = ?, attempt_count = ?, last_error = ? WHERE id = ?").run(
        nextStatus,
        nextAttempt,
        err instanceof Error ? err.message : "Outbox processing error",
        row.id
      );
    }
  }
  return { processed, deadLettered };
}
