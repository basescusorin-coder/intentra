# INTENTRA Jobs — source integration register (DEV)

Status: discovery / integration planning. No automatic ingestion is enabled.

## Rules
- Never present a link to a search portal as a verified individual vacancy.
- Do not scrape or republish full descriptions without checking the provider's contractual and copyright permissions.
- Never use the SECO Job-Room employer *publishing* API as a job-read API.
- Only import publicly visible listings through an approved feed/API and only under its license/terms.
- Exclude vacancies under the Job-Room five-working-day publication restriction.
- Every imported record must include source_id, source_url, external_id, employer, title, location, fetched_at, last_verified_at, expires_at (if supplied), and import_rights_reference.
- Deduplicate by (source_id, external_id), canonical URL, and normalized employer/title/location.
- Mark stale records inactive if not re-confirmed; never invent salaries, language requirements or contract details.
- No production changes, no paid API usage, no new secrets committed.

## Sources to evaluate
| Source | Access | Next step |
| --- | --- | --- |
| arbeit.swiss / Job-Room | Official job search; employer publishing API is not a public listing-read API | Request permitted read/feed access or licensing; meanwhile link to official search |
| jobs.ch / jobup.ch | Job board; third-party API.SH offers JSON access, not proof of republishing rights | Confirm terms/licensing with rights holder |
| Job-Room via API.SH | Third-party JSON API, advertised 1,000 monthly free credits | Confirm redistribution rights, rate/cost policy and data accuracy before enabling |
| Employer career pages | Official job application pages | Seek authorized feeds or agreements |
| Staffing agencies | Official career/search pages | Seek authorized feeds or agreements |

## Proposed architecture
1. Source registry with explicit legal status, permitted fields, license evidence and quota.
2. Server-side adapters (never expose API keys in client code).
3. Normalization and provenance tracking.
4. Deduplication, expiration and scheduled revalidation.
5. Search by canton, commune/radius, sector, workload and language (only where source supplies it).
6. Romanian summary clearly labeled as translation, preserving link to original.
7. Apply externally; no CV storage in initial release.
8. Monitoring: ingestion failures, stale ratio, duplicates, source outages and API spend.
9. Release gates: unit tests, security/RLS checks, E2E tests, licensing approval, explicit production approval.

## First acceptance test
Using an approved feed with no paid usage, import a small fixture, verify filtering, provenance, duplicate handling and expiration, then test the mobile UI in DEV. Do not claim live vacancies until a licensed connector is working.

## DEV interface status (2026-11-18)
The Vercel preview serves `/joburi/` from the Vite public directory. It provides Romanian, German and English labels; profession, canton, locality and sector criteria; a copyable search summary; and outbound source links. The filters prepare search criteria and filter source categories, but they do not search external portals or verify individual vacancies. The DEV database currently has five disabled sources with `rights_status=pending` and zero listings. The page explicitly shows an empty verified-offers state; no fixture or sample vacancy is displayed as real.

The normalizer tests validate approved Job-Room records and reject restricted, expired, future, unsafe-host and duplicate records. They do not establish provider rights or enable ingestion. Adding a live feed still requires documented permission, an authorized read endpoint, a server-side adapter and a separate integration/security test.

## References
- https://www.arbeit.swiss/en/employers/faq-on-the-job-registration-requirement
- https://test-api.job-room.ch/api-docs/jobAdvertisements/v1/index.html
- https://api.sh/job-room-api
- https://api.sh/jobs-ch-api
