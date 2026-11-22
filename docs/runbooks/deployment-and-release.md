# Deployment, Signing & Release Checklist (Blueprint Sec. 14 & 73)

## 1. Environments & Domain Separation
- **Existing Public Site:** `https://www.albahrtravels.com/` (separate repo `global-wayfinder-40`; preserved untouched during OS build).
- **Proposed OS Portal:** `https://os.albahrtravels.com/` (separate backend API + OS web/app deployment; DNS & TLS configured only on owner authorization).
- **Strict Boundary:** Zero production deploys, live DB writes, or DNS changes without explicit owner sign-off.

## 2. Standard Release Pipeline
1. **Automated CI Gate:** Formatter, ESLint/TypeScript `tsc --noEmit`, Flutter `analyze`, Unit + Integration + Security + Widget tests, secret scanning (zero secrets in repo/APK/web bundle).
2. **Pre-Migration Backup:** Take verified encrypted backup and confirm `Test Restore` checksum before running additive `db/migrations/*.sql`.
3. **Preview Deployment:** Deploy to staging/preview environment; run synthetic smoke tests (`E2E-01`–`E2E-10`).
4. **Owner Approval & Production Rollout:** Manual approval gate for production migrations & cutover.
5. **Post-Deploy Verification & Rollback:** Monitor `GET /api/v1/health` (liveness/readiness), error rates, and outbox queue lag; trigger instant release rollback if thresholds breach.

## 3. Cross-Platform Packaging Notes
- **Android `.apk` / `.aab`:** Built from `apps/horizon_one` via `flutter build apk --release` (sign with release keystore before Play Store distribution; never commit `.jks` or `key.properties`).
- **Windows / macOS / Linux / iOS / Web:** Built from identical `apps/horizon_one` source after respective signing certificates and OS keychain entitlements are provisioned.
