# INTENTRA Comunitate — proiect de securitate și informare juridică

Stare actualizată la 2026-11-20: backend-ul DEV și Supabase PROD există separat; PROD are schema Comunității și funcțiile Edge active. Hardening RPC PROD a fost aplicat fără copiere de date DEV. Paginile legale multilingve sunt proiecte preliminare, nu aprobate pentru lansare. Adresa aprobată este **contact@intentra.ch**. Operatorul este persoană fizică; numele public, adresa de domiciliu și telefonul personal nu sunt incluse.

Nu publica documentele ca versiuni finale și nu colecta date reale prin Comunitatea publică până la completarea identității operatorului, contactului juridic, retenției, furnizorilor/transferurilor și aprobării legale. Supabase PROD este în Ireland; setările SMTP/OTP și Turnstile de producție trebuie validate end-to-end.

## Product
- Categories: **Ofer gratuit**, **Vând**, **Întrebări**. Job publication is disabled in UI, request validation, and a database trigger until Swiss AVG/AVV review is complete.
- Browsing public; publishing requires verified email and unique pseudonym.
- Email one-time code via managed auth; optional phone, never publicly displayed.
- No private messaging, payments, CV uploads, identity documents, or marketing opt-in by default.
- Prices for sales in CHF, no platform escrow or transaction commission in MVP.
- No unlawful or regulated goods: weapons, drugs, counterfeit or stolen goods, prescription drugs, hazardous items, adult services, and other prohibited content. Manual review/appeal for false positives.
- Sale listings should clearly distinguish private sellers from commercial sellers; business use and consumer-law obligations need separate review.

## Security controls
- Supabase PostgreSQL with row-level security and least-privilege roles; **never** expose service-role key in browser or GitHub.
- Restrict public profile to pseudonym, canton, language; phone and email private.
- New posts/comments enter pending moderation by default; no unreviewed publication until automated safeguards have been tested.
- Per-account database limits, Supabase Auth limits, configurable CAPTCHA, OTP expiry and attempt controls, abuse reporting, and image validation/re-encoding/EXIF removal are implemented in source. Per-IP distributed throttling is not implemented for community write APIs.
- TOTP MFA-gated moderation, audited moderation actions, export/deletion functions and storage access policies are implemented in source. Backup/restore procedure is documented, but no provider backup or restore has been run.
- RLS has been exercised in the hosted development database using synthetic users and `anon`/`authenticated` roles, including cross-user reads/writes, job rejection, private field projection, and MFA-gated moderation. A separate PGlite/PostgreSQL-WASM harness also passes. Neither substitutes for Auth, Edge Function, or image upload HTTP end-to-end testing. Never rely only on front-end hiding.
- Configure custom email provider, verified sender domain and secret management before pilot.
- Set retention periods, account export/deletion workflow, incident response and data-subject request process.

## Privacy and Swiss law gates
- Swiss FADP/DSG articles 6-9, 16, 19, 24: proportionality, privacy by design/default, security, processors, cross-border transfers, notice, breach notification.
- Publish privacy notice identifying controller/contact, purposes, data categories, processors, countries, rights and retention.
- Confirm hosting region, subprocessors and data transfer safeguards, including email, CAPTCHA, analytics and backups.
- Review applicability of GDPR if targeting users in the EU.
- Check Swiss private employment placement AVG/AVV with competent authority before enabling job matching or commercial job board operations.
- Terms and rules must describe prohibited goods, reporting, moderation, appeals, private seller obligations and no platform guarantee of transactions.
- No claims of legal compliance until configuration and documents are independently reviewed.

## Deployment gate
1. Confirm the Supabase project is isolated from production despite the dashboard's `main PRODUCTION` branch label. Configure SMTP/DNS/CAPTCHA only after reviewing provider contracts and data transfers.
2. Resolve operator identity, notices, processor contracts, regions/transfers, retention, seller obligations, GDPR applicability and AVG/AVV.
3. Run Supabase CLI/PostgreSQL integration tests, Auth OTP, CAPTCHA, Storage upload, MFA moderation, deletion, and backup restoration with synthetic users.
4. Review remediation findings and only then plan a private pilot. The existing site remains untouched.
5. Owner explicitly approves any future merge or publication; this branch has not been merged or deployed.
