# INTENTRA release verification — 2026-11-19

Status: **BLOCKED — do not publish**.

## Directly verified
- Supabase PROD `jvtpmsabjjrvfuwnsckd` now has nine public tables, all with RLS, and three active Edge Functions (JWT verification enabled). Earlier status document showing zero tables is stale.
- PROD migration history has ten existing migrations as of the check, plus this run's `intentra_prod_foreign_key_indexes`.
- PROD contains no member profiles, posts or comments. One settings row is present.
- Supabase DEV `wnmtrkheznrhrtpbenxh` has eleven public tables including `job_sources` and `job_listings`, and newer Edge Function versions than PROD. DEV schema has advanced beyond PROD.
- Vercel preview latest deployment is READY, but `live=false` and SSO protection is enabled for previews. This is not proof of a production-ready GitHub Pages build.
- Six foreign-key indexes were created and verified in PROD during this run. The unindexed-FK advisory is cleared; unused-index notices are expected while the database is empty.

## Blocking findings
- PROD security advisor reports eight authenticated-executable SECURITY DEFINER functions in the exposed public schema, including moderator RPCs and helper functions. Review each signature and privilege boundary; do not blindly revoke functions required by the application.
- Three tables have RLS enabled but no policies (admins, settings, rate limits). They appear intentionally private; verify that grants are revoked and access is only via vetted functions.
- Multiple permissive policies for SELECT on posts/comments/reports trigger performance advisories.
- PROD lacks the latest DEV migrations and Edge Function versions. Need a reviewed schema/code reconciliation, not a blind copy.
- No end-to-end PROD OTP, Turnstile, SMTP, CORS, RLS multi-user, upload/delete, admin MFA, account export/delete, backups/restore or rollback validation has been demonstrated.
- Production privacy/rules pages and release approval are outstanding.

## Action taken
Created six safe, non-destructive FK indexes in PROD via migration `intentra_prod_foreign_key_indexes`; verified all six. No user data migrated, no main/DNS/intentra.ch changes, no public release and no paid services.

## Gate
**FAIL to launch** until critical security findings are triaged and fixed, backend differences reconciled, production test matrix passes, legal pages approved, and release artifact reviewed. Do not publish automatically.
