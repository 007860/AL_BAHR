# Release Checklist, Known Gaps & Unresolved Owner Decisions (Blueprint Sec. 29 & 76)

## 1. Pre-Production Release Checklist
- [x] Read-only discovery audit of `global-wayfinder-40` completed (`docs/discovery/global-wayfinder-40-audit.md`)
- [x] Zero-AI deterministic runtime verified (`services/api/` + `apps/horizon_one/`)
- [x] PostgreSQL + RLS + append-only triggers written (`db/migrations/0001..0006`)
- [x] Unit, Integration (`E2E-01`..`E2E-10`), Security, and Flutter Widget tests passing
- [x] Release Android `.apk` compiled & verified
- [ ] Owner confirms official master logo SVG/PNG asset (currently text wordmark + `OFFICIAL LOGO ASSET PENDING`)
- [ ] Owner confirms SECP `(PRIVATE) LIMITED` corporate suffix verification (`legal_suffix_verified`)
- [ ] Owner confirms WhatsApp availability on `+92 325 7938125` (`whatsapp_verified`) & business hours
- [ ] Owner confirms outbound SMTP/email provider (`SPF`/`DKIM`/`DMARC`) for `albahrtravelconsultants@gmail.com`
- [ ] Owner confirms historical `.env` secret rotation & Lovable Cloud RLS inspection on `global-wayfinder-40`
- [ ] Production DB backup + staging restore rehearsal + owner deployment sign-off for `os.albahrtravels.com`

## 2. Known Current Boundaries (Intentional By Design)
- **Live Server Connection:** `apps/horizon_one` defaults to **Local Evaluation Sandbox Mode** until `os.albahrtravels.com` (or custom backend URL) is deployed and configured in **Login → Server URL**.
- **Debug Signing Key on Initial APK:** Initial `.apk` uses Gradle's debug signing config for test installation (`flutter build apk --release`). Play Store distribution requires generating an owner-held `.jks` release keystore outside git.
- **Linux Desktop Native Build:** Local host lacks `clang++`/`cmake`/`ninja`, so native Linux desktop compilation is handled in CI or after installing build tools; Android APK & Web targets are verified locally.
