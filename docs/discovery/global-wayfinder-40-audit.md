# Milestone 0 — Read-Only Discovery Audit (`global-wayfinder-40`)

**Inspection Date:** 2026-11-22  
**Inspected Source:** `https://github.com/007860/global-wayfinder-40` (read-only shallow inspection)  
**Production Website (Preserved):** `https://www.albahrtravels.com/`

## 1. Architecture & Stack Found in Public Website
- **Framework:** React 19 + TypeScript + TanStack Start (`@tanstack/react-start`, `@tanstack/react-router`) + Vite 7 + Nitro + Tailwind CSS v4.
- **Deployment Config (`vercel.json`):** `framework: "tanstack-start"`, `installCommand: "bun install --frozen-lockfile"`, `buildCommand: "bun run build"`.
- **Database Integration (`src/integrations/supabase/`):** `@supabase/supabase-js` with SSR auth middleware (`client.server.ts`, `auth-middleware.ts`).

## 2. Environment Variable Names Found (Zero Secret Values Exposed)
- **Browser-exposed (`VITE_*`):**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - *(Verified: `SUPABASE_SERVICE_ROLE_KEY` is NOT referenced under `VITE_*` in `HEAD`.)*
- **Server-only (`process.env.*`):**
  - `SUPABASE_URL`
  - `SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GOOGLE_MAIL_API_KEY`
  - `LOVABLE_API_KEY`

## 3. Existing Database Schema & RLS Findings (`supabase/migrations` + `types.ts`)
| Table / Routine | Purpose in Website | Observed RLS / Access Status | OS Bridge Consequence |
|---|---|---|---|
| `umrah_packages` | Existing Umrah offers (`pkg_no`, `poster_no`, `airline`, `route`, `departure_city`, `makkah_hotel`, `makkah_distance`, `madinah_hotel`, `madinah_distance`, `price_sharing/quad/triple/double`, `flights` JSON) | Live counts/RLS policies in Lovable Cloud still require authenticated DB inspection | Reuse as authoritative package fields; never duplicate into separate CMS schema |
| `tour_packages` | International tour itineraries & inclusions | Needs authenticated Supabase RLS verification | Map to OS Packages & CMS projection |
| `tourist_visas` | Visa charges, processing time, docs | Needs authenticated Supabase RLS verification | Sync approved visa catalog via CMS |
| `work_demands` | Overseas job/work permit demands | Needs authenticated Supabase RLS verification | Preserve intact; bridge read/publish |
| `country_leads` | Website inquiry leads (`first_name`, `last_name`, `phone`, `passport_number`, `target_country`, `source_type`) | Migration `20260608082327` revokes `anon`/`authenticated` and sets `RESTRICTIVE` deny-all; server inserts via `service_role` | Replace direct DB coupling with idempotent OS Lead Ingestion API + defer sensitive `passport_number` from initial marketing inquiry |
| `blogs` | Published articles (`is_published` column added) | Public `SELECT` only where `is_published = true` | Governed by OS Website CMS approval + rollback |
| `business_invitations` | B2B invitations table in Supabase types | Migration SQL not in repo (`lovable` managed?) — verify live RLS | Map into `partners` / `invitations` after backup |
| `user_roles` & `has_role` | Role enum (`admin`, `moderator`, `user`) | Verify live assignments in Lovable Cloud | Map carefully without exposing OS admin privileges broadly |
| `analytics_counters` & `increment_counter` | Traffic & consultation counters | Migration `20260608082353` restricts `EXECUTE` to `service_role` | Read-only display in OS Analytics |
| `ai_gen_events` | Rate-limit tracking table | `RLS` enabled, `service_role` only | Not needed in Zero-AI OS runtime |

## 4. Brand, Contact & Security Findings
1. **Logo Asset Gap:** `public/` contains `favicon.ico`, `robots.txt`, `llms.txt`, and `google9dc53b28ea9e3eda.html`; `src/assets/` contains job flyers, portraits, and destination photos — **no high-res master SVG/PNG brand logo file exists in the website repo**. OS must use a clean text wordmark (`AL-BAHR HORIZON`) + `"OFFICIAL LOGO ASSET PENDING"` and allow CEO SVG/PNG upload in Settings without redrawing the emblem.
2. **Contact Discrepancies Found in Website Code:**
   - Website code currently publishes `al.bahr.medical.appointments@gmail.com` (`LEAD_EMAIL`), phone `+92 343 4762264` (Office) and `923257938125` (CEO), plus `SECP Registered Private Limited Company`.
   - Per Blueprint Section 18: OS uses `+92 325 7938125`, `albahrtravelconsultants@gmail.com`, and `78 E Block, Architect Engineering Housing Society, Lahore, Pakistan`; legacy email must NOT be published as official support, WhatsApp CTA remains disabled until confirmed, and `(PRIVATE) LIMITED` remains gated until SECP certificate verification.
3. **Pending Live Checks (Require Owner Credentials):**
   - Confirm historical `.env` secret rotation (`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_MAIL_API_KEY`, `LOVABLE_API_KEY`).
   - Dump live row counts and verify backup restore on Lovable Cloud before any bridge write is enabled.
