# ADR-0002: Cross-Platform Flutter Client & Typed Contracts

- **Status:** Accepted
- **Date:** 2026-11-22
- **Context:** The owner requires a single cohesive HORIZON ONE experience supporting Android APK delivery now, plus Web, Windows, macOS, Linux, and iOS targets (Blueprint Sec. 28 & 74), with Navy/Gold branding, 3D-inspired splash with reduced-motion/skip fallback, English + Urdu RTL support, and offline non-sensitive draft autosave.
- **Decision:**
  1. Build the client in **Flutter** (`apps/horizon_one`) targeting Android APK (`flutter build apk --release`), Web, and Desktop from one codebase.
  2. Define OpenAPI 3.1 contracts (`docs/api/openapi.yaml`) as the server boundary; never embed `service_role` keys or server secrets in the APK/Web bundle.
  3. Provide dual connection support in the app: **Live OS HTTPS Server** (`os.albahrtravels.com` / custom API endpoint) and an explicit **Local Sandbox Mode** (clearly badged `LOCAL EVALUATION SANDBOX` with non-production synthetic data) so the APK is fully testable on-device before server deployment without fabricating live production status.
- **Consequences:** Single client codebase produces the deliverable `.apk` while remaining compatible with Windows/iOS/macOS/Linux/Web expansion.
