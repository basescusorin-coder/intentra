// The browser client is intentionally limited to the DEV project and explicitly approved preview origins.
// VITE_* values are embedded in the public bundle, so only anon/publishable keys
// are accepted here. Never put a service-role or secret key in browser config.
export const COMMUNITY_DEV_PROJECT_REF = 'wnmtrkheznrhrtpbenxh';

const DEV_URL = `https://${COMMUNITY_DEV_PROJECT_REF}.supabase.co`;

// Production is an explicit, opt-in build with a separate backend.
// Never make the DEV database available on the public INTENTRA domain.
export const COMMUNITY_PRODUCTION_ORIGIN = 'https://intentra.ch';

function productionBackendUrl(env, origin) {
  if (env?.VITE_COMMUNITY_MODE !== 'production' || origin !== COMMUNITY_PRODUCTION_ORIGIN) return null;
  const ref = env?.VITE_COMMUNITY_PRODUCTION_PROJECT_REF;
  if (typeof ref !== 'string' || !/^[a-z0-9]{20}$/.test(ref) || ref === COMMUNITY_DEV_PROJECT_REF) return null;
  return `https://${ref}.supabase.co`;
}
const LOCAL_ORIGINS = new Set(['http://127.0.0.1:5173', 'http://localhost:5173']);

function isAllowedOrigin(env, origin) {
  if (LOCAL_ORIGINS.has(origin)) return true;
  const preview = env?.VITE_COMMUNITY_PREVIEW_ORIGIN;
  if (typeof preview !== 'string' || !preview) return false;
  try {
    const url = new URL(preview);
    const requested = new URL(origin);
    // The Edge Functions and Turnstile sitekey allow only the stable branch alias.
    // Per-deployment Vercel URLs are intentionally read-only and cannot authenticate.
    return url.protocol === 'https:' && url.origin === preview && origin === preview &&
      requested.protocol === 'https:' && !requested.username && !requested.password &&
      url.hostname !== 'intentra.ch' && !url.hostname.endsWith('.intentra.ch') &&
      !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

function isPublicClientKey(value) {
  if (typeof value !== 'string' || value.length < 20 || value.length > 4096) return false;
  if (value.startsWith('sb_secret_')) return false;
  if (value.startsWith('sb_publishable_')) return true;

  const parts = value.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    return decoded.role === 'anon';
  } catch {
    return false;
  }
}

/** Resolve a safe browser configuration only for local DEV or explicitly configured HTTPS preview testing. */
export function resolveCommunityRuntimeConfig(env, origin) {
  const production = env?.VITE_COMMUNITY_MODE === 'production';
  // A production build is trusted only at the public domain, with a distinct project.
  // A DEV build continues to work exclusively on localhost / approved previews.
  const expectedUrl = production ? productionBackendUrl(env, origin) : (isAllowedOrigin(env, origin) ? DEV_URL : null);
  if (!expectedUrl) return null;

  let url;
  try {
    url = new URL(env?.VITE_SUPABASE_URL || '');
  } catch {
    return null;
  }
  if (url.origin !== expectedUrl || !['', '/'].includes(url.pathname) || url.search || url.hash || url.username || url.password) return null;

  const anonKey = env?.VITE_SUPABASE_ANON_KEY;
  const turnstileSiteKey = env?.VITE_TURNSTILE_SITE_KEY;
  if (!isPublicClientKey(anonKey)) return null;
  // CAPTCHA is mandatory for sign-in, not for reading public community listings.
  const validSiteKey = typeof turnstileSiteKey === 'string' && turnstileSiteKey.length >= 10 && turnstileSiteKey.length <= 1024;
  if (production && !validSiteKey) return null;
  return Object.freeze({ url: expectedUrl, anonKey, turnstileSiteKey: validSiteKey ? turnstileSiteKey : null });
}
