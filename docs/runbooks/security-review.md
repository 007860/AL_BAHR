# Security Architecture & OWASP ASVS Checklist (Blueprint Sec. 27, 68, 69)

## 1. Non-Negotiable Security Invariants Enforced in Code & Tests
- **Default-Deny RBAC + Object Ownership:** Every endpoint validates JWT/session, role permission (`os_role_permissions`), record ownership/team/partner scope, and MFA `aal2` on CEO/Finance/Security mutations.
- **Tenant / Customer Isolation:** Customer A receives `403` on Customer B invoices, trips, chats, or documents. Partner A receives `403` on Partner B inquiries, cases, or commissions.
- **Anti-Self-Escalation:** No user can modify their own role or grant permissions they do not possess.
- **Secrets Hygiene:** Zero `SUPABASE_SERVICE_ROLE_KEY`, SMTP keys, or HMAC secrets in Flutter APK, Dart code, or web bundles.
- **Financial & Supplier Integrity:** Bank slip upload sets `pending_review` only; Finance verification posts append-only `ledger_entries`; tickets/bookings/visas/appointments require external references + real evidence documents.
- **Upload & Export Safety:** Magic-byte MIME verification + size limits on uploads; private bucket + short-lived signed URLs; CSV export neutralizes leading `= + - @ \t \r` formula injection.
- **Deterministic Automation Safety:** Rules Engine allows only pre-registered fields, operators, and actions (`no eval()`, `no LLM/AI calls`), prevents cyclic triggers, logs every decision in `os_decision_logs`, and supports CEO MFA `Emergency Pause`.
- **Logging & Privacy:** Request IDs on all errors; redacts passwords, tokens, bank account secrets, and passport strings in logs/error payloads.
