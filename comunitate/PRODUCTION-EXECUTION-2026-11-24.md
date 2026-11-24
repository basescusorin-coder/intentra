# INTENTRA Comunitate — production execution record

**Date:** 24 November 2026 (Europe/Zurich)

**Release decision:** NO-GO for public launch until the listed blockers pass.

## Verified and changed

- GitHub PR #10 remains a draft. The reviewed fixes and this execution record
  are on `feature/comunitate-mvp` at
  `eca0e1cff2cbb17cf17c9dec040b64102579d9b2`; `main` remains the public
  baseline at `8127bd22…`. The Vercel preview for this commit is READY at
  deployment `dpl_9bjbPxzUkweKXtr7QgLNUJaTJFYw`. No public deployment or merge
  was performed.
- Supabase DEV is `ACTIVE_HEALTHY`, with 21 migrations. PROD is
  `ACTIVE_HEALTHY`, with 13 migrations and nine core Community tables. The
  two DEV-only jobs registry tables remain absent from PROD, consistent with
  the restricted Joburi category.
- The core table columns match except `posts.author_username` and
  `comments.author_username`: PROD allowed NULL and had no attribution
  triggers. Both tables currently contain zero rows. Applied migration
  `20261124100850_community_author_username_guards`: it fails closed if null
  rows exist, adds a private SECURITY DEFINER trigger function with an empty
  search path, installs author-name triggers, and enforces NOT NULL. No user
  rows were copied or changed.
- PROD Storage uses a private `community-images` bucket, 5 MiB limit, and
  JPEG/PNG/WebP allowlist. Object read policies expose only images tied to
  published posts; authenticated reads use post access checks.
- PROD's original upload function checked post visibility/status but did not
  verify ownership before its service-role Storage write. Updated all three
  PROD Edge Functions from the reviewed branch code, retained JWT verification,
  and restricted production CORS/Turnstile hostnames to `intentra.ch` and
  `www.intentra.ch`. All are ACTIVE at version 2:
  - `community-image-upload`: `239bbbd53dada45078cbeaef3d302f84d1232775e23ecb08679dc57cd212fb67`
  - `delete-community-post`: `baea5cac4810810113f88d939f0d5468801d0b811edea8fc12bb44775f481436`
  - `delete-community-account`: `92befc228edc014a4b6d529c7ba7b77688dfe9a05ba39c269b750d175161cb00`
- Checked production Vercel variables without displaying their values: mode is
  `production`, project ref and URL point to PROD, the client key is not a
  service-role/secret key, and a Turnstile site key is present.
- In Supabase Auth, email signup and email OTP are enabled; OTP is six digits
  and expires after 600 seconds. Custom SMTP is enabled with Infomaniak host
  and port 587; sender, username, and stored password are masked in the
  dashboard. CAPTCHA protection is enabled with Turnstile and a saved secret.
  TOTP MFA is enabled and AAL1 sessions are limited to 15 minutes.
- The staging Vite build and `assemble-site.mjs` passed. The resulting
  `site-release/` contains the original homepage, category pages, contact page,
  compiled `/comunitate/` assets, and both legal routes. The bundle contains no
  DEV Supabase URL.
- Automated tests passed: 4 image-sanitizer, 22 app/config/legal, 9 Joburi, and
  1 RLS/WASM test (36 total). Vite production build passed.
- GitHub Actions for commit `eca0e1c` passed: Joburi DEV tests, Community
  staging package, and Community DEV checks. The latter includes the CI edge
  checks; a local Deno type-check is still blocked by the runtime's registry
  connection failure noted below.

## Remaining launch blockers

- Auth URL configuration is now corrected in PROD: Site URL is
  `https://intentra.ch`; Redirect URLs are restricted to
  `https://intentra.ch/comunitate` and `https://intentra.ch/comunitate/`.
  Dashboard save confirmations were observed. No OTP delivery/receipt was
  tested. SMTP settings are present, but successful email delivery is not
  established.
- Production Turnstile challenge and authorized hostname were not exercised.
  The application CAPTCHA requires a human challenge; no challenge was solved
  or bypassed.
- There are zero PROD Community administrators and zero verified administrator
  TOTP factors; moderator MFA cannot be exercised until an authorized test
  moderator exists.
- No authorized PROD test account/email was available for the full real-user
  workflow (registration, profile, post, image, comments, edit, deletion,
  isolation, reconnect, and account deletion). No test account or real user
  content was created or deleted.
- Public legal pages still identify the operator only as a natural person and
  contain incomplete identity/address, appeals, and retention language in all
  three languages. They explicitly call themselves preliminary. They are not
  approved for launch. The personal home address and phone remain unpublished.
- Supabase security advisories report three RLS-enabled, no-policy tables:
  `community_admins`, `community_rate_limits`, and `community_settings`.
  These are currently inaccessible by default and had no anon/authenticated
  table grants; record as intentional deny-by-default, not as a PASS from a
  user-role integration test.
- `npm run test:edge` could not finish type-checking: Deno could not reach
  `registry.npmjs.org/@supabase/supabase-js` from this runtime (connection
  refused). Function deployment succeeded, but this is not a Deno type-check
  PASS.

## Rollback and publication

No GitHub Pages deployment was performed. If a future `/comunitate/` smoke test
fails after publication, restore only the previous static site artifact or
remove the Community route; do not roll back the PROD database schema without
review.
