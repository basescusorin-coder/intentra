# INTENTRA Comunitate — release gate for /comunitate/

Status: **STAGING ONLY — DO NOT MERGE INTO main YET.**

## Verified hosting boundary

- Public `intentra.ch`: GitHub Pages, repository `basescusorin-coder/intentra`, main branch, root directory.
- Community DEV: Vercel Preview built from `feature/comunitate-mvp`, Supabase DEV `wnmtrkheznrhrtpbenxh`.
- The repository contains `comunitate/index.html` as **Vite source**, not as a deployable GitHub Pages artifact. A direct merge into main would expose a broken app because imports and `import.meta.env` require a build.
- Staging-only navigation has been prepared in root `index.html` and points to `/comunitate/`. Do not merge or expose this navigation before that route is ready.

## Required release architecture

1. Choose a **separate production Supabase project** (not `wnmtrkheznrhrtpbenxh`) and production Turnstile site/secret with authorized `intentra.ch` hostname.
2. Implement production runtime configuration that validates the explicit production project URL and permits `https://intentra.ch`, without weakening DEV-only runtime restrictions.
3. Set up verified CORS origins for production Edge Functions. Do not wildcard `*.vercel.app` or remove JWT checks.
4. Produce a static Vite build for GitHub Pages with `base: '/comunitate/'`; deploy only the built `dist` output at `/comunitate/`. Keep development source out of the published directory.
5. Ensure links from both desktop and mobile navigation lead to the route, with working back-navigation to INTENTRA search.
6. Complete privacy information and operating identity; the current `PRIVACY-AND-RULES-DRAFT.md` has placeholders and outdated factual statements. Publish approved RO/DE/EN versions instead of linking to a GitHub draft.
7. Remove identified synthetic DEV content before any migration; do not migrate DEV user accounts/OTP sessions into production. Never delete genuine profiles or posts during cleanup without identifying each row and explicit scoped authorization.
8. Verify backup/restore, admin MFA, report handling, separate-user RLS denial, image upload/delete (JPEG/PNG/WebP), email OTP, automatic post/comment publication, account export/deletion, abuse controls and rollback.
9. Stage release, review the resulting build and its exact runtime configuration, then approve the main-branch release. Add the `/comunitate/` URL to `sitemap.xml` only **after** launch is successful.

## Current evidence

- DEV: basic sign-in, posting, comment creation, image display and owner-post deletion observed through manual user tests.
- DEV: DB RLS enabled on all nine tables; selected policies reviewed; performance indexes added.
- Not yet verified: full multi-user authorization, admin MFA, abuse review, backup restore, compliance sign-off.
- No production deployment or DNS modification authorized by this checklist.

## Rollback

If the new route fails, remove/hide the Community navigation and restore the previous GitHub Pages release. Preserve the database, isolate write activity during a recovery and do not roll back schema without analyzing migrations.
