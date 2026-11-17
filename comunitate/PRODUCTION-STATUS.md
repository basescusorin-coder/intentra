# INTENTRA Comunitate — verificare PROD (2026-11-18)

## Proiect creat și verificat

- Supabase **production**: `intentra-comunitate-prod`
- Project reference: `jvtpmsabjjrvfuwnsckd`
- API origin: `https://jvtpmsabjjrvfuwnsckd.supabase.co`
- Organization: `INTENTRA` (`xfmfqfmjcmjuqizdpvix`)
- Region: `eu-west-1` (Ireland)
- Verified status: `ACTIVE_HEALTHY`
- Supabase quoted cost: **USD 0/month**, confirmed before creation
- Security and health advisors: **no findings** on the empty project
- Publishable and legacy anon keys exist; **no keys committed**
- Public tables: **zero**; migrations: **zero**; Edge Functions: **zero**
- No DEV user accounts, listings, comments, photos or sessions copied
- Existing DEV: `wnmtrkheznrhrtpbenxh`, separate and `ACTIVE_HEALTHY`

## Gate: NO LIVE RELEASE

Do **not** deploy this project publicly yet. This is a healthy empty backend, not an installed application.

The repository's original historical migrations explicitly describe themselves as development-only or draft. Several migrations that exist in the DEV migration history are **not present as SQL files in GitHub**. Running only the available migrations would create an incomplete backend. Before any production schema installation:

1. Build and review a single reconciled baseline representing current DEV structure, RLS, views, RPCs, triggers, storage bucket and Edge Functions **without copying member data**.
2. Confirm per-user RLS and MFA moderation, server-side image validation/deletion and automatic publishing for safe content.
3. Apply reviewed schema to the new production project, then run security/performance advisors and dedicated permission tests.
4. Configure SMTP, OTP, project redirects, a dedicated Cloudflare Turnstile site/secret and exact origin CORS at `https://intentra.ch`. Secrets must never be put in `VITE_` fields.
5. Finish approved legal terms and privacy pages, data retention, backup and restore validation, incident procedures and contact details.
6. Prepare a verified production GitHub Pages bundle targeting the distinct backend and public domain. Only publish `/comunitate/` after acceptance.

## Vercel warning

The existing Vercel Preview project contains environment variable entries targeting `production` and `preview`. Do not assume the production entries point to the new Supabase PROD; they have not been verified as safe. The Vercel project reports `live: false`. Never promote that environment without inspecting and replacing configuration and running release checks.

## Current change policy

- Continue development exclusively in `feature/comunitate-mvp`.
- Do not modify `main`, `intentra.ch` or DNS.
- Do not add costs without explicit consent; user approved only USD 0/month.
- Do not copy private DEV member content into production.
