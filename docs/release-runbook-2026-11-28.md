# INTENTRA Community — release and rollback runbook

**Target release:** 28 November 2026  
**Current posture:** preparation only. PR #10 remains draft; staging is not production. Only the owner authorizes the final GO and publication.

## 1. Preconditions

Do not merge or publish until all items are recorded as PASS on the exact release candidate:

- Infomaniak device record for the already-saved SMTP credential is active and permitted to send as contact@intentra.ch; a real PROD OTP is delivered and verified.
- Turnstile works on the intended public hostname; no bypass or reduced rate limit is used.
- Moderator TOTP enrollment and AAL2-gated moderation pass.
- Controlled PROD lifecycle passes: signup/OTP, profile and unique pseudonym, post create/edit, image upload/display, comments, reports/moderation, cross-user denial, deletion, sign-out/sign-in, export/account deletion. Delete only synthetic records and verify database/storage cleanup.
- Legal RO/DE/EN pages have the approved operator identity, valid service/correspondence address, accurate processors/retention, and no placeholders. Do not publish a private home address or personal phone without explicit approval.
- Community DEV checks, staging package, regression, RLS WASM, Edge checks, Jobs tests and dependency audit pass on the release head. The owner reviews the evidence and gives the final GO.

Record the exact PR head SHA, current main SHA, run URLs, artifact digest, and decision time before merging. Stop if the branch changes after tests; rerun checks on the new head.

## 2. Build and inspect

1. Keep PR #10 as Draft until the gates above pass. Use the workflow **INTENTRA Community staging package** to check out the branch, run tests, build Vite, assemble the full static package, verify paths, and upload a non-deployed artifact.
2. Before publication, build with the production-only environment values from Supabase PROD and the public Turnstile site key. The browser bundle may contain only the public/publishable Supabase key; never include the service-role or secret key. Keep the staging configuration isolated from PROD.
3. The production assembler requires explicit `VITE_COMMUNITY_MODE=production`, a valid PROD Supabase URL/key/site key, and `COMMUNITY_RELEASE_APPROVED=yes`. Set that approval only after the owner’s GO. The assembler must reject legal placeholders and any DEV production origin.
4. Run:
   - `npm ci`
   - `npm test`
   - `npm run test:jobs`
   - `npm run test:rls:wasm`
   - `npm run test:edge`
   - `npm run build`
   - `node comunitate/scripts/assemble-site.mjs --production`
5. Inspect the artifact contents: root site files plus `comunitate/`, `comunitate/joburi/`, legal pages, contact page, images and CNAME. Confirm every internal asset path resolves, the production bundle contains no DEV Supabase URL, and the GitHub Pages target path is `/comunitate/`. Retain the artifact digest and a copy of the pre-release main tree.
6. Merge PR #10 only after the final checks and owner GO. GitHub Pages publication follows the repository’s configured main-branch source; monitor its deployment result. Do not change DNS unless the hosting check proves a DNS correction is necessary and the owner approves it.

## 3. Post-publication checks

From an external browser and HTTP client, check `https://intentra.ch/` and `https://intentra.ch/comunitate/` return the expected page and assets. Verify RO/DE/EN switching, 320/390 px mobile and desktop widths, no console errors, no DEV endpoint, correct canonical links and legal pages. Then run the authorized real-user acceptance journey and verify that only synthetic data is removed. Deployment READY alone is not acceptance.

## 4. Rollback

### Before merge

No public rollback is needed. Discard or expire the staging artifact; leave main and GitHub Pages unchanged.

### After merge, before real user data exists

1. Stop further promotion and record the failing URL, release SHA, Pages deployment and logs.
2. Use GitHub’s **Revert** operation for the release PR (or create a revert commit on main that reverses exactly that merge). Do not force-push or reset main.
3. Wait for the revert commit’s GitHub Pages deployment to complete; verify the previous main site and the previous Community launch gate are restored.
4. Keep the Supabase schema and Edge Functions intact unless a separate, reviewed database rollback plan exists. Do not delete Auth users, tables, or storage objects as part of a frontend rollback.

### After real user data exists

Prefer a forward fix or a controlled maintenance page. A frontend revert must preserve Supabase user data, uploaded files, audit trails and export/deletion access. Do not roll back or restore the database from an untested backup. If writes must be paused, keep JWT/RLS protections enabled and use a reviewed application-level maintenance gate; verify data integrity before reopening.

## 5. Current baseline

- Public baseline main SHA at the 25 November review: `8127bd22cb1fe8f12ab12318d97209936d32f04f`.
- PR #10 is open and Draft. Community PROD is isolated and contains no user content.
- No deployment, merge, DNS change, or database rollback has been performed by this runbook preparation.
