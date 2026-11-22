# ADR-0003: Human-Verified Finance, Supplier Evidence & Private Documents

- **Status:** Accepted
- **Date:** 2026-11-22
- **Context:** Travel operations carry severe fraud, financial, and privacy risks if unverified payment slips auto-confirm bookings, tickets are fabricated, or customer passport scans are publicly accessible.
- **Decision:**
  1. Bank slip upload ALWAYS creates `payments.status = 'pending_review'` and a Finance verification task; invoices NEVER auto-transition to `paid` on upload.
  2. Finance/CEO verification atomically appends immutable `ledger_entries` (DB trigger prevents `UPDATE`/`DELETE` on `ledger_entries` and `audit_events`) using `Idempotency-Key`.
  3. Ticket issuance, booking confirmation, visa/appointment confirmations, and study offers require non-empty external supplier references + uploaded real private document evidence; server blocks ticket issuance before payment verification.
  4. All sensitive documents live in private storage accessed only via short-lived server-authorized signed URLs after ownership/role checks.
- **Consequences:** Eliminates fake confirmations and double-ledger posting; preserves immutable financial and security audit trails.
