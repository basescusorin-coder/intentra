# INTENTRA Comunitate — MVP security and legal design (DRAFT)
Status: development only. No public deployment. No user data collected.

## Product
- Categories: **Ofer gratuit**, **Vând**, **Întrebări**, **Joburi** (job publication gated pending Swiss AVG/AVV legal review).
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
- Rate limits per account/IP, CAPTCHA, email OTP expiry and attempt limits, anti-spam checks, secure image upload (size/type/content validation and EXIF removal).
- Administrator MFA, audited moderator actions, backup/restore tests, alerting, abuse reporting and account blocking.
- RLS must be tested for anonymous, own-account, other-account, moderator and deleted-account cases. Never rely only on front-end hiding.
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
1. Approved legal notices and provider contracts.
2. Complete backend and tested RLS; server-side abuse controls.
3. Tested moderation and deletion workflow.
4. Private pilot with synthetic data first.
5. Explicit owner approval before merging to main.
