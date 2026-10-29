# MVP Store Cloud deployment and verification

## Status and scope
- The existing `public.user_profiles` table is reused. No duplicate `profiles` table or browser Supabase client was created.
- Migrations 001–005 were applied through the OnSpace SQL tool. Read-only SQL assertions confirmed RLS on every public table, no browser execution of privileged RPC, no role/XP write grants, no anonymous license-hash read grant, and private archive/proof/feedback/contact buckets.
- Application source now uses Cloud sessions and server-validated actions. No mock accounts, seeded catalog, browser redemption, fake reviews or local financial data are imported.
- **Not yet verified:** frontend type-check/lint/build, deployed Edge Function invocations, email delivery, Google browser OAuth, uploads, order fulfillment, concurrent redemption/XP tests and mobile browser flows. The editor has no shell/build runner; do not describe this release as production-ready until those checks pass.
- Discord authentication is unsupported by this project's backend. Its existing secrets were left untouched and are not exposed in frontend code.
- Backend live subscriptions are unavailable. Authorized data is refreshed by React Query polling every 15 seconds, with listener cleanup and cache invalidation. No Realtime publication or subscription is claimed.

## Deployment order
1. Export existing database records before deploying migrations to another environment.
2. Apply `202610290001_schema.sql`, `002_operations.sql`, `003_reads.sql`, `004_security.sql`, `005_entitlements.sql` in ascending order. They create schema and server functions; no demo products or users are inserted.
3. Deploy `supabase/functions/mvp-api` and `supabase/functions/reseller-chat`, including shared dependencies and `supabase/config.toml`. Both functions explicitly validate user JWTs through `auth.getUser()`. Public operations are limited to sanitized catalog, published feedback and team profiles. CORS applies to every response and preflight.
4. Required existing server secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`. Chat additionally uses the already-configured `XAI_API_KEY`. Never put service-role, xAI or Discord secrets in `VITE_*` variables. The two browser environment variables are provisioned by OnSpace; do not edit them.
5. Create and email-verify `mvp-cheats@admin.com`. An operator must inspect the exact account UUID in Cloud > Users, replace the sentinel UUID in `supabase/setup/assign-admin.sql`, then execute that script using trusted SQL. It is intentionally **not** an automatic migration. No admin candidate existed during inspection, so no administrator was assigned.
6. The administrator must explicitly publish products/plans, configure payment destinations, upload private archives, add setup links and grant reseller access. Nothing auto-publishes in the background.

## Email authentication
- Hybrid email OTP + password registration, with 4-digit OTP and minimum password length 6 (current Cloud settings).
- Ensure the verification email template includes `{{ .Token }}` so the OTP is visible. No SMTP or provider settings were changed or verified by the editor.
- Password reset uses a PKCE email callback at `${app-origin}/auth/callback?next=reset` and then `/reset-password`.
- Browser auth uses one persistent PKCE client. Route guards wait for both the restored session and server permission snapshot. Profile metadata never sets a role.

## Google configuration and callback URLs
Google was **disabled** in the inspected Cloud Auth Settings; code does not mean the provider is enabled.
1. Cloud > Users > Auth Settings: enable Google and copy the exact provider Callback URL shown there.
2. Google Cloud Console: configure OAuth credentials and authorize that callback. For this Supabase-compatible endpoint the expected URL is `https://zlrhuvsyiyrnltdfzlrh.backend.onspace.ai/auth/v1/callback`; confirm it matches the Cloud dashboard before configuring Google.
3. Return to Cloud Auth Settings and input the provider credentials securely.
4. Canonical application callback is `${window.location.origin}/auth/callback`. Preview/default publish redirect URLs are automatically allowed by OnSpace; login can work after provider credentials are configured. Custom public links and personal domains require manually adding `https://your-domain/**` in Cloud Auth Settings.
5. Live Preview reserves a popup synchronously with name `onspace-oauth`. Only that popup relays a one-time authorization code with `postMessage(..., '*')` and closes. The opener exchanges that code once using its PKCE verifier. There is no token messaging, implicit flow, origin equality check or iframe fallback navigation.
6. Test standalone redirect and cross-origin Preview popup separately. Verify cancellation, blocked popup, disabled credentials, duplicate callback events, recovery links and refresh restoration.

## License and reseller policies
- Full license keys contain 128 bits of server-generated randomness. Only SHA-256 hashes and masked references are retained. Full keys are shown once; orders reserve a license ID instead of storing its secret.
- Redemption locks the license row. Activation counts, ownership, product availability, redemption deadlines and status are checked in the same database transaction that inserts activation and subscription records.
- Duration units use seconds; months are exactly 30 days. Lifetime has no fixed license expiry, but is still subject to bans and reseller grace policy. Resellers can issue only one-time keys for approved products, within grant quota, batch and duration limits.
- Manual order approval locks the order and eligible license. The administrator must verify receipt in PayPal/Cash App before approval. No provider API, automatic payment verification or webhook is configured or claimed.
- **15-day grace:** reseller management stops immediately at end/suspension/revocation. Previously issued licenses remain eligible for at most 15 days, or until their own expiry if sooner. Natural expiry starts grace at `ends_at`; manual suspension/revocation starts it at the first status change. Repeated suspensions do not extend grace. Explicit administrator restoration/renewal re-enables eligible access.
- Entitlement functions check status and server time on every redemption/download, so access does not depend on browser clocks or maintenance scheduling.
- `mvp_maintain()` performs lazy expiry notification and audit maintenance during authenticated snapshot requests. Physical reseller-license revocation audit records are produced when the reseller or admin next loads a snapshot. There is **no scheduled background job** configured. An operator may schedule maintenance separately after testing; do not claim immediate scheduled audit execution.

## File privacy and content
- `mvp-private`: private product archives, up to 100 MB; issued through 60-second signed URLs after server entitlement checks. Public responses never contain storage paths.
- `mvp-proofs`, `mvp-feedback`, `mvp-contact`: private images, up to 5 MB. Images use expiring signed read URLs. Profiles/feedback authors expose only display name and avatar in public feeds.
- `mvp-avatars`: intentionally public avatars, up to 2 MB.
- Signed upload tickets are limited to validated destinations and a generated authenticated-user prefix. Images undergo server-side PNG/JPEG/WebP signature validation before profile/proof/feedback/contact publication. Only administrators receive archive upload tickets.
- Setup files have only name/image/HTTPS download link, no product association. These are non-secret utility links; **do not put a private product link in a setup entry**.
- Upload progress is actual XMLHttpRequest upload progress. Product executable safety/malware scanning is not provided; upload only trusted archives.
- Chat is available only to active resellers/admins, uses the configured xAI secret and `grok-4.3`, supports streaming, cancellation and screenshot analysis, and cannot alter account/license state. Messages and selected screenshots are sent to xAI; the UI discloses that transfer.

## Verification commands (run outside the editor)
```sh
npx tsc -p tsconfig.app.json --noEmit
npx vite build
npx eslint src
# Staging only; use dedicated accounts, never real customer fixture tokens:
deno test --allow-env --allow-net tests/backend_integration.test.ts
```
The package manifest was not readable through this editor, so installed script names were not assumed and no scripts or dependencies were manually changed.

Run `supabase/tests/security.sql` for read-only database assertions. For integration tests set `TEST_BACKEND_URL`, `TEST_ANON_KEY`, `TEST_USER_TOKEN`, `TEST_ADMIN_TOKEN`, `TEST_PRODUCT_ID` and optionally `TEST_DAILY_ELIGIBLE=yes` on an unused eligible staging account. Tests that lack their required fixtures are skipped, not counted as verified.

Before launch test: concurrent same/different-user key redemption; invalid and duplicate XP claims; expired/banned/revoked product access; direct RPC escalation; unauthorized directory queries; wrong-user uploads; private URL exposure; duplicate manual order review; expired reseller requests; 15-day boundary conditions; file notifications; feedback/replies/likes; pagination; image failures; Google callback replay; password recovery; desktop/mobile keyboard and touch navigation.

## Remaining operational requirements
- The signed-in admin setup, Google credentials, SMTP/email delivery, xAI quota/model availability and Edge deployment must be verified by the operator.
- Dashboard snapshots show the latest 100 records; public feed and rankings are paginated. Large admin inventory pagination, audit retention/export, full feedback reply pagination, advanced feedback editing/report queues, contact attachment inspection, product archive scanning and a scheduled expiry audit job require further implementation before a high-volume launch.
- Existing language selection is preserved; new page copy currently uses English. Complete translated strings and review jurisdiction-specific legal/refund/data-retention policies before launch.
- Loader credential provisioning and external HWID resets are not configured and are explicitly unavailable, not simulated.
