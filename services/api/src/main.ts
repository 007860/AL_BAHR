import { loadConfig } from "./config.ts";
import { createDatabase, newId } from "./db/database.ts";
import { SlidingRateLimiter, hashPassword } from "./core/security.ts";
import { createOsServer } from "./server.ts";

const config = loadConfig();
const db = createDatabase(config.dbPath);

// Seed synthetic non-production dev operator if explicitly requested via OS_DEV_SEED=1
if (process.env.OS_DEV_SEED === "1") {
  const existing = db.prepare("SELECT id FROM os_users WHERE email = 'ceo.dev@albahr.local'").get();
  if (!existing) {
    const now = new Date().toISOString();
    const devPass = process.env.OS_DEV_PASSWORD ?? "HorizonDev!2026";
    const ceoId = newId();
    db.prepare(
      `INSERT INTO os_users (id, organization_id, email, password_hash, full_name, mfa_enabled, status, created_at, updated_at)
       VALUES (?, ?, 'ceo.dev@albahr.local', ?, 'CEO (Synthetic Dev)', 0, 'active', ?, ?)`
    ).run(ceoId, config.defaultOrgId, hashPassword(devPass), now, now);
    db.prepare(
      `INSERT INTO os_memberships (id, organization_id, user_id, role_id, created_at)
       VALUES (?, ?, ?, 'ceo', ?)`
    ).run(newId(), config.defaultOrgId, ceoId, now);
  }
}

const server = createOsServer({
  db,
  config,
  limiter: new SlidingRateLimiter(),
});

server.listen(config.port, config.host, () => {
  console.log(`AL-BAHR HORIZON OS API listening on http://${config.host}:${config.port} (Zero-AI deterministic runtime)`);
});
