export function createAuthClientOptions(storage) {
  return { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storage };
}

export function createOtpRequestOptions(captchaToken) {
  return { shouldCreateUser: true, captchaToken };
}

export function isEmailRateLimited(error) {
  return error?.status === 429 || error?.code === 'over_email_send_rate_limit';
}

export function otpCooldownSeconds(error) {
  return isEmailRateLimited(error) ? 3600 : 60;
}

const COOLDOWN_KEY = 'intentra-community-otp-cooldown-until';

export function getStoredCooldownUntil(storage, now = Date.now()) {
  const value = Number(storage.getItem(COOLDOWN_KEY) || 0);
  if (!Number.isFinite(value) || value <= now) {
    storage.removeItem(COOLDOWN_KEY);
    return 0;
  }
  return value;
}

export function storeOtpCooldown(storage, seconds, now = Date.now()) {
  const until = Math.max(getStoredCooldownUntil(storage, now), now + seconds * 1000);
  storage.setItem(COOLDOWN_KEY, String(until));
  return until;
}
