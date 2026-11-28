# INTENTRA Community — release and rollback runbook

**Target release:** 28 November 2026  
**Current posture:** preparation only. PR #10 remains draft; staging is not production. Only the owner authorizes the final GO and publication.

## 1. Preconditions

Do not merge or publish until all items are recorded as PASS on the exact release candidate:

- Infomaniak device record for the already-saved SMTP credential is active and permitted to send as contact@intentra.ch; a real PROD OTP is delivered and verified.
- Turnstile works on the intended public hostname; no bypass or reduced rate limit is used.
- Moderator TOTP enrollment and AAL2-gated moderation pass.
- Controlled PROD lifecycle passes: signup/OTP, profile and unique pseudonym, post create/edit, image upload/display, comments, reports/moderation, cross-user denial, deletion, sign-out/sign-in, export/account deletion. Delete only synthetic records and verify database/storage cleanup.
- Legal RO/DE/EN pages identify Sorin Băsescu and contact@intentra.ch, disclose processing/recipients and use retention criteria. FADP Art. 19 requires identity and contact details; it does not expressly require a postal address in every case. Reassess other address obligations if the service starts concluding electronic contracts or charging. Do not publish a private home address or personal phone without explicit approval.
- Community DEV checks, staging package, regression, RLS WASM, Edge checks, Jobs tests and dependency audit pass on the release head. The owner authorized execution in the 28 November 2026 instruction. The release workflow still requires the owner actor/input; that authorization does not substitute for evidence of the technical and legal gates. Jobs remains an external-source search and redirection directory; do not copy listings or collect CVs.

Record the exact PR head SHA, current main SHA, run URLs, artifact digest, and decision time before merging. Stop if the branch changes after tests; rerun checks on the new head.

## 2. Build and inspect

1. Last fully validated implementation candidate is `9c799bcac407ef03f8378701c2bd7e4c31036fd7`; this documentation-only synchronization is being validated as a new commit; automated tests and CI are green, but server-side PROD acceptance and the public correspondence-address legal question are still open. Keep PR #10 open until those gates pass. Use the workflow **INTENTRA Community staging package** to check out the branch, run tests, build Vite, assemble the full static package, verify paths, and upload a non-deployed artifact.
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
5. Inspect the artifact contents: root site files plus `comunitate/`, `comunitate/joburi/`, legal pages, contact page, images and CNAME. Confirm all static HTML/CSS asset paths resolve, the production build selects only the distinct PROD Supabase URL at `intentra.ch`, and the staging workflow passes no production credentials and the built bundle contains no PROD endpoint. The runtime key validator rejects service-role/secret-key prefixes. The staging build intentionally retains a public DEV project-ref constant for its runtime-origin guard; that identifier is not a credential, and the staging bundle has no DEV credentials or active backend configuration. Keep DEV data isolated from PROD. Verify the GitHub Pages target path is `/comunitate/`. Retain the artifact digest and a copy of the pre-release main tree.
6. GitHub Settings → Pages was checked on 25 November: source is **Deploy from a branch**, branch `main`, directory `/` (root), custom domain `intentra.ch`, **Enforce HTTPS** enabled, and DNS check successful. The public `https://intentra.ch/` serves the existing main site; `/comunitate/` still serves the launch-preparation page. The staging Vite package is not automatically copied into the Pages root by merging PR #10.
7. A manual-only workflow is prepared at `.github/workflows/pages-production-publish.yml`. It runs only from `main`, only when `github.actor` is `basescusorin-coder`, requires the owner’s `owner_go=true`, and checks through GitHub’s Pages API that the source is `workflow` before building or deploying. The production build also requires legal pages without placeholders and distinct PROD Supabase configuration. Repository Actions variables `COMMUNITY_PROD_PROJECT_REF`, `COMMUNITY_PROD_SUPABASE_URL`, `COMMUNITY_PROD_ANON_KEY`, and `COMMUNITY_PROD_TURNSTILE_SITE_KEY` were added and verified on 28 November 2026 from existing PROD and public Turnstile configuration. The anon and site keys are public client values. No service-role key, SMTP credential, or private Turnstile secret is stored in these variables. The workflow has not been merged or triggered.
8. At the approved cutover only: switch Pages source to **GitHub Actions**, populate the four public/configuration variables, review the production inputs, then dispatch the workflow on `main` with the owner GO. It assembles the full static site to preserve existing root pages and publish the Vite app under `/comunitate/`. Run the post-publication checks and rollback procedure. Do not change the live Pages source, merge, or publish before all final checks and owner GO. DNS currently checks successfully; do not change DNS unless a later check proves a correction is necessary.

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


## Candidate evidence recorded on 28 November 2026

On candidate `9c799bcac407ef03f8378701c2bd7e4c31036fd7`, `npm test` passed 29 tests, Jobs 9 tests, RLS WASM 1 test, build and explicit production assembly passed locally. GitHub Actions passed Jobs, DEV/Edge, staging package (including 320/390/mobile and desktop Chromium checks), and JavaScript checks. The isolated MASTER BACKUP clone restored this exact SHA, `npm ci` succeeded in `comunitate/`, and RLS WASM passed without contacting PROD. The archive SHA-256 is `ba8d6a48482aa66acc009a965066521fe91881ce291a5cc7bbd3f3653fcda7dd` and all 38 internal manifest entries verified. The production package was generated locally only and was not deployed.

Server logs reviewed in this session did not show successful OTP/Turnstile/AAL2 or CRUD lifecycle evidence; the latest visible OTP failure was SMTP 535 on 24 November. Do not treat an empty log query as proof. No PROD synthetic rows were created. The legal audit is `docs/legal-audit-2026-11-28.md`; the open owner decision is whether to supply a correspondence address approved for publication or obtain advice on the UWG e-commerce disclosure requirement. Do not expose a home address without explicit consent.
