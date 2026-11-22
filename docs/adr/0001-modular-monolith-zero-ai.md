# ADR-0001: Modular Monolith & Zero-AI Deterministic Runtime

- **Status:** Accepted
- **Date:** 2026-11-22
- **Context:** AL-BAHR HORIZON OS (`HORIZON ONE`) requires 35 integrated travel, CRM, finance, HR, B2B, and CMS modules sharing one authoritative record per customer, lead, quote, invoice, booking, and package, with strict transactional integrity and zero production LLM/AI API dependency.
- **Decision:**
  1. Build the backend as a **TypeScript Modular Monolith** (`services/api`) with strict domain module boundaries (`identity-auth`, `crm-leads`, `cases-workflows`, `travel-ops`, `commercial-finance`, `documents-storage`, `cms-bridge`, `marketing-comms`, `hr-partners-suppliers`, `rules-engine`, `audit-observability`).
  2. Enforce a **Zero-AI Production Runtime**: all automation uses declarative, versioned IF/THEN rules with allowlisted fields/operators (`rules-engine`), atomic transactional outbox events (`outbox_events`), timezone-aware scheduling (`Asia/Karachi` display / UTC persisted), and deterministic least-loaded round-robin assignment (`smart-assignment`).
  3. Keep `www.albahrtravels.com` separate and preserved; integrate via restricted server-side bridge APIs.
- **Consequences:** Single deployable process, ACID transactions across lead->case->quote->invoice->ledger, full replayability/explainability via `decision_logs`, zero AI inference cost or hallucination risk.
