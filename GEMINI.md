# AL-BAHR HORIZON OS (`HORIZON ONE`) Workspace Rules

1. **UI/UX Design Workflow (Mandatory):**
   - Whenever designing, implementing, refactoring, or reviewing UI or UX screens/components in this repository (especially under `apps/horizon_one/`), ALWAYS read and follow `.agents/skills/ui-ux-pro-max/SKILL.md` first, running `python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack react` and `--stack html-tailwind` (plus `--design-system` / `--domain ux`) as needed.
   - Preserve the official AL-BAHR HORIZON design tokens (`Navy #0A192F`, `Gold #D9AD32`, `Teal #0A8C98` loading accent, `Surface #FFFFFF`, `Background #F6F8FB`) and do NOT redraw the official logo emblem (keep the pending-asset wordmark until owner supplies master SVG/PNG).
2. **Zero-AI Production Runtime & Safety:**
   - Never add production LLM/AI API calls or expose server secrets (`SUPABASE_SERVICE_ROLE_KEY`, SMTP keys) in client code.
   - Keep `apps/horizon_one` (`npm run typecheck`, `npm test`, `npm run build`) and `services/api` (`npm test`) passing after changes.
3. **GitHub Releases APK Distribution:**
   - Every push to `main` or version tag (`v*`) triggers `.github/workflows/ci.yml` to build the React bundle + Android release `.apk` and publish `HORIZON-ONE-latest.apk` + `SHA256SUMS.txt` to the GitHub Releases section (`https://github.com/007860/AL_BAHR/releases`).
   - Whenever new Android APK changes are ready, commit and push to `main` (and tag `v*` for milestone releases) so the user can download the latest `.apk` directly from GitHub Releases.
