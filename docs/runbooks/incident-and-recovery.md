# Operational Runbooks & Disaster Recovery (Blueprint Sec. 15 & 64)

## 1. Recovery Targets (Proposed Pending Owner Confirmation)
- **RPO (Recovery Point Objective):** `<= 24 hours` (daily automated encrypted PostgreSQL snapshot + WAL archiving where supported).
- **RTO (Recovery Time Objective):** `<= 4 hours` for OS API & Database restoration.
- **Production Restore Rule:** Two-person approval (`os_approval_requests.requires_dual_control = true`) required before overwriting production state.

## 2. Incident Playbooks
1. **Lead Ingestion Failure (`E2E-09`):**
   - Preserve incoming form submission in safe quarantine/outbox retry queue (`os_outbox_events`).
   - Emit critical alert (`os_health_incidents`) to CEO & Ops Manager; NEVER show fake success to user when enqueue failed.
   - Replay idempotently via `POST /api/v1/health/incidents/:id/retry` once bridge restores.
2. **Supplier Rate Expired:**
   - Block quote acceptance (`422 QUOTE_EXPIRED`).
   - Require fresh supplier rate lookup/entry and revised `quote_versions` (`v(N+1)`). Never silently honor expired fare.
3. **Bank Receipt Mismatch:**
   - Keep `os_payments.status = 'pending_review'` or transition to `'rejected'` with explicit discrepancy reason.
   - Open reconciliation investigation task; **hard-block** ticket issuance & voucher release.
4. **Email / SMTP Service Down:**
   - Persist communication in DB first (`os_messages` / `os_outbox_events`), schedule bounded exponential backoff retries, transition to `'dead_letter'` after max attempts, and surface honest `"Delivery Failed — Retry"` state.
5. **Website CMS Publish Error:**
   - Keep prior live `www.albahrtravels.com` public projection intact.
   - Mark `publishing_jobs` failed, log incident, notify CEO/Publisher.
6. **Credential / `.env` Exposure:**
   - Immediately revoke & rotate affected keys in Supabase / Vercel / Mail / Supplier providers.
   - Audit `os_audit_events` & git history; update server-only secret manager; confirm `VITE_*` / APK bundles remain clean.
7. **Database Incident / Corruption:**
   - Enable read-only degraded guard on risky financial/booking mutations.
   - Obtain dual-person approval, verify encrypted backup checksum, run sandbox **Test Restore** first, restore production, then reconcile `os_ledger_entries` & customer communications.
8. **Lost / Compromised Employee Device:**
   - CEO/Manager triggers `POST /api/v1/staff/:id/deactivate` or `POST /api/v1/sessions/revoke-all` (MFA required).
   - Inspect recent `os_audit_events` & document downloads for that user; reassign open cases via Manager queue.

## 3. Quarterly Backup Restore Rehearsal Procedure
1. Create staging sandbox DB from latest encrypted backup (`POST /api/v1/backups/:id/test-restore`).
2. Verify row counts, `trg_audit_immutable` & `trg_ledger_immutable` triggers, and run smoke queries across `os_customers`, `os_invoices`, `os_bookings`, `os_umrah_packages`.
3. Record pass/fail + duration in `os_restore_tests`.
