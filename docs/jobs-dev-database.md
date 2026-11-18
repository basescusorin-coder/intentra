# INTENTRA Jobs DEV — database rollout

Applied on 2026-11-18 to Supabase DEV project `wnmtrkheznrhrtpbenxh`, migration `jobs_dev_source_registry_and_listings`.

Tables:
- `public.job_sources`: source registry; import can only be enabled when rights_status=approved and rights_reference is provided.
- `public.job_listings`: canonical normalized records with unique (source_id, external_id), expiry, verification timestamp and active flag.

Both tables have RLS enabled. `anon` and `authenticated` have read-only SELECT access to `job_listings`, limited by a policy requiring:
- listing active
- not expired
- last verified within 7 days
- corresponding source enabled and explicitly approved.

No public SELECT grant on `job_sources`. No client INSERT, UPDATE, DELETE grants. Import is server-side only using restricted credentials; never commit service keys.

**Current state:** 0 sources, 0 listings. Live ingestion NOT enabled. Do not display example vacancies as live vacancies.

## Release checklist
- Confirm legal redistribution rights for each provider and store source rights reference.
- Implement server-side adapter using actual documented feed schema, not assumed response fields.
- Validate and normalize payloads, restrict allowed outbound hosts, deduplicate, expire missing records.
- Use provider-specific limits and a hard spend cap of 0 CHF without explicit approval.
- Verify RLS under anon and authenticated roles; test malformed and restricted records.
- Integrate DEV UI, run E2E tests and confirm deployment SHA.
- Obtain explicit approval before main/production/DNS changes.
