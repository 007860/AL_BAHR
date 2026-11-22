# AL-BAHR HORIZON OS (`HORIZON ONE`)

**Business:** AL-BAHR HORIZON TRAVELS & CONSULTANTS  
**Public Website (Preserved):** `https://www.albahrtravels.com/`  
**Proposed Staff / Client OS Portal:** `https://os.albahrtravels.com/`  
**Edition:** Private single-organization edition (`organization_id` preserved for future migration; zero public signup or billing in Release 1)  
**Runtime Architecture:** **Zero-AI Deterministic Operations OS** (no LLM calls, vector DBs, or model inference in production).

---

## Repository Structure

```text
AL_BAHR/
├── apps/
│   └── horizon_one/            # Cross-platform Flutter client (Android APK, Web, Desktop)
├── services/
│   └── api/                    # TypeScript Modular Monolith API, Rule Engine, Smart Assignment & Tests
├── db/
│   ├── migrations/             # PostgreSQL + RLS + immutable trigger migrations (0001–0006)
│   └── seeds/                  # Synthetic non-production seed data (zero real PII)
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   ├── api/openapi.yaml        # OpenAPI 3.1 service specification
│   ├── discovery/              # Read-only Milestone 0 audit of global-wayfinder-40
│   ├── runbooks/               # Incident playbooks, backup/restore drills, security & deployment gates
│   └── traceability/           # Screen & button traceability matrix
└── .github/workflows/ci.yml    # Automated CI checks
```

## Quick Start (Backend API + Tests)

```bash
cd services/api
npm test                        # Runs Unit, Integration (E2E-01..E2E-10), and Security tests
OS_DEV_SEED=1 npm start         # Starts local HTTP API on 127.0.0.1:4000 (development sandbox only)
```

## Quick Start (Flutter Client & Android APK)

```bash
cd apps/horizon_one
flutter pub get
flutter analyze
flutter test
flutter build apk --release
```

> **Note on Unconfirmed Brand/Legal Items (Blueprint Sec. 76):**
> - Official master SVG/PNG logo upload is pending from owner (text wordmark placeholder active; never redrawn).
> - `(PRIVATE) LIMITED` corporate suffix and WhatsApp Business CTA remain disabled/gated until SECP & phone verification.
> - Production deployment and `www.albahrtravels.com` / Supabase bridge writes require explicit owner sign-off.
