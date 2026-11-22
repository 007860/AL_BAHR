# ADR-0004: Existing Website (`global-wayfinder-40`) Preservation & Database Bridge

- **Status:** Accepted
- **Date:** 2026-11-22
- **Context:** The live public site `https://www.albahrtravels.com/` (`global-wayfinder-40`) runs on React/TypeScript + TanStack Start + Vercel + Supabase (`umrah_packages`, `tour_packages`, `tourist_visas`, `work_demands`, `country_leads`, `blogs`, `analytics_counters`, `business_invitations`).
- **Decision:**
  1. Never drop, reset, or overwrite existing website tables or deployed Vercel code from the OS app.
  2. Prefix all new OS-native PostgreSQL tables cleanly (`os_*`) via additive migrations (`db/migrations/0001..0006`).
  3. Map `umrah_packages` (`pkg_no`, `makkah_distance`, `madinah_distance`, room prices) and `country_leads` (`external_source_id` dedupe index) through restricted, rate-limited, idempotent server-side bridge endpoints — never shipping `SUPABASE_SERVICE_ROLE_KEY` in client bundles or the Android APK.
  4. Defer sensitive passport fields out of initial public marketing inquiry forms (`country_leads`) until active visa/booking processing inside the private OS.
- **Consequences:** Zero disruption to live website traffic/SEO while establishing a single authoritative OS source of truth after owner-approved cutover.
