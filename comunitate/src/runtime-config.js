// The browser client is intentionally limited to the DEV project and localhost.
// VITE_* values are embedded in the public bundle, so only anon/publishable keys
// are accepted here. Never put a service-role or secret key in browser config.
export const COMMUNITY_DEV_PROJECT_REF = 'wnmtrkheznrhrtpbenxh';

const DEV_URL = `https://${COMMUNITY_DEV_PROJECT_REF}.supabase.co`;
const LOCAL_ORIGINS = new Set(['http://127.0.0.1:5173', 'http://localhost:5173']);

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

/** Resolve a safe browser configuration only for local DEV testing. */
export function resolveCommunityRuntimeConfig(env, origin) {
  if (!LOCAL_ORIGINS.has(origin)) return null;

  let url;
  try {
    url = new URL(env?.VITE_SUPABASE_URL || '');
  } catch {
    return null;
  }
  if (url.origin !== DEV_URL || !['', '/'].includes(url.pathname) || url.search || url.hash || url.username || url.password) return null;

  const anonKey = env?.VITE_SUPABASE_ANON_KEY;
  const turnstileSiteKey = env?.VITE_TURNSTILE_SITE_KEY;
  if (!isPublicClientKey(anonKey) || typeof turnstileSiteKey !== 'string' || turnstileSiteKey.length < 10 || turnstileSiteKey.length > 1024) return null;

  return Object.freeze({ url: DEV_URL, anonKey, turnstileSiteKey });
}
