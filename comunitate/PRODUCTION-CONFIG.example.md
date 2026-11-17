# INTENTRA Community: production deployment contract

This is **documentation**, not an environment file. Never paste credentials into a public commit.

The public site `https://intentra.ch/comunitate/` is served through GitHub Pages, while its data/auth backend must be a dedicated Supabase **production** project. The DEV project `wnmtrkheznrhrtpbenxh` is intentionally rejected in production.

## Required build-time environment names

- `VITE_COMMUNITY_MODE=production` — mandatory for a production bundle.
- `VITE_COMMUNITY_PRODUCTION_PROJECT_REF` — the separate, new 20-character Supabase production project ID.
- `VITE_SUPABASE_URL` — exactly `https://<production-project-ref>.supabase.co`.
- `VITE_SUPABASE_ANON_KEY` — the project's **publishable** public browser key, never a `service_role` or `sb_secret_` key.
- `VITE_TURNSTILE_SITE_KEY` — production Cloudflare Turnstile **public** site key authorized for `intentra.ch`.
- `COMMUNITY_RELEASE_APPROVED=yes` — explicit release gate. Leave unset during development.

All `VITE_` variables become visible in client assets; do not set any secret here.

## Release command

From the repository root after `npm ci` in `comunitate/` and successful unit/security tests, run:

```bash
node comunitate/scripts/assemble-site.mjs --production
```

The script rejects invalid production configuration, missing reviewed `comunitate/public/privacy.html` and `comunitate/public/rules.html`, or missing explicit release approval. It builds `site-release/index.html` and `site-release/comunitate/index.html` together, plus assets and CNAME. This **does not** deploy to GitHub Pages.

For a credential-free test artifact (safe and deliberately unable to connect to DEV on `intentra.ch`):

```bash
node comunitate/scripts/assemble-site.mjs
```

## Before public deployment

1. Provision a distinct production Supabase project, schema migrations, RLS, auth SMTP, Turnstile CAPTCHA and Edge Functions. Define exact CORS origin `https://intentra.ch`.
2. Configure the production project's allowed auth redirect URLs and test OTP without rate-limit bypass.
3. Obtain an approved privacy policy with legally responsible operator, contact, data-retention, processing locations and incident response. Replace the DEV draft; add both required reviewed HTML pages.
4. Complete two-user RLS, MFA admin, image, reporting, deletion/export, backup/restore and rollback tests; document results.
5. Deploy only the verified `site-release/` contents via reviewed Pages release, after explicit approval. Do **not** merge Vite source directly into GitHub Pages root or publish DEV tokens/accounts.
6. Confirm `https://intentra.ch/comunitate/` is correct before adding it to `sitemap.xml`.

The staging workflow `.github/workflows/community-staging.yml` builds an **artifact only**, not a public deployment.
