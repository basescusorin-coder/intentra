import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthClientOptions, createOtpRequestOptions, getStoredCooldownUntil, isEmailRateLimited, otpCooldownSeconds, storeOtpCooldown } from '../src/auth-policy.js';

test('PKCE auth uses shared durable storage and parses callback URLs', () => {
  const localStorage = {};
  assert.deepEqual(createAuthClientOptions(localStorage), {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
  });
});

test('OTP magic links return to the origin that started auth', () => {
  const captchaToken = 'opaque-test-token';
  assert.deepEqual(createOtpRequestOptions(captchaToken, 'http://localhost:5173'), {
    shouldCreateUser: true,
    captchaToken,
    emailRedirectTo: 'http://localhost:5173',
  });
});

test('email rate limit applies an hour cooldown instead of resending repeatedly', () => {
  const error = { status: 429, code: 'over_email_send_rate_limit' };
  assert.equal(isEmailRateLimited(error), true);
  assert.equal(otpCooldownSeconds(error), 3600);
  assert.equal(otpCooldownSeconds(new Error('temporary')), 60);
});

test('OTP cooldown persists and cannot be shortened', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  assert.equal(storeOtpCooldown(storage, 60, 1000), 61000);
  assert.equal(storeOtpCooldown(storage, 3600, 2000), 3602000);
  assert.equal(storeOtpCooldown(storage, 60, 3000), 3602000);
  assert.equal(getStoredCooldownUntil(storage, 4000), 3602000);
});
