// INTENTRA Swiss jobs ingestion — pure normalization and validation, no API calls.
// This module does not grant rights to republish data.
export const CANTONS = new Set('AG AI AR BE BL BS FR GE GL GR JU LU NE NW OW SG SH SO SZ TG TI UR VD VS ZG ZH'.split(' '));
const allowedHosts = ['job-room.ch', 'www.job-room.ch'];
export function safeHttpsUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}
export function normalizeJob(record, now = new Date()) {
  if (!record || typeof record !== 'object') return null;
  const id = String(record.id ?? '').trim();
  const title = String(record.title ?? '').trim().slice(0, 240);
  const employer = String(record.company?.name ?? '').trim().slice(0, 200);
  const sourceUrl = safeHttpsUrl(record.url);
  if (!id || id.length > 150 || !title || !sourceUrl) return null;
  const sourceHost = new URL(sourceUrl).hostname.toLowerCase();
  if (!allowedHosts.includes(sourceHost)) return null;
  if (record.status !== 'PUBLISHED_PUBLIC') return null;
  const published = record.published_from ? new Date(record.published_from + 'T00:00:00Z') : null;
  const until = record.published_until ? new Date(record.published_until + 'T23:59:59Z') : null;
  if ((published && (!Number.isFinite(+published) || published > now)) ||
      (until && (!Number.isFinite(+until) || until < now))) return null;
  const canton = String(record.location?.canton ?? '').toUpperCase();
  const location = String(record.location?.city ?? '').trim().slice(0, 150);
  const applyUrl = safeHttpsUrl(record.apply?.url) || safeHttpsUrl(record.external_url);
  const workloadMin = record.workload_min == null || record.workload_min === '' ? NaN : Number(record.workload_min);
  const workloadMax = record.workload_max == null || record.workload_max === '' ? NaN : Number(record.workload_max);
  return {
    source: 'job-room-via-apish', external_id: id, source_url: sourceUrl,
    apply_url: applyUrl, title, employer, city: location,
    canton: CANTONS.has(canton) ? canton : null,
    workload_min: Number.isInteger(workloadMin) && workloadMin >= 0 && workloadMin <= 100 ? workloadMin : null,
    workload_max: Number.isInteger(workloadMax) && workloadMax >= 0 && workloadMax <= 100 ? workloadMax : null,
    published_at: published ? published.toISOString() : null,
    expires_at: until ? until.toISOString() : null,
    last_verified_at: now.toISOString()
  };
}
export function deduplicateJobs(records, now = new Date()) {
  const seen = new Set(); const result = [];
  for (const raw of records) {
    const job = normalizeJob(raw, now);
    if (!job) continue;
    const key = job.source + ':' + job.external_id;
    if (seen.has(key)) continue;
    seen.add(key); result.push(job);
  }
  return result;
}
export function filterJobs(jobs, { query = '', canton = '' } = {}) {
  const term = query.trim().toLocaleLowerCase('de-CH');
  return jobs.filter(job => (!canton || job.canton === canton) &&
    (!term || [job.title, job.employer, job.city].join(' ').toLocaleLowerCase('de-CH').includes(term)));
}
