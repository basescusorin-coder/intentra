import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMUNITY_DEV_PROJECT_REF, resolveCommunityRuntimeConfig } from '../src/runtime-config.js';

const origin = 'http://127.0.0.1:5173';
const env = {
  VITE_SUPABASE_URL: `https://${COMMUNITY_DEV_PROJECT_REF}.supabase.co`,
  VITE_SUPABASE_ANON_KEY: `sb_publishable_${'a'.repeat(32)}`,
  VITE_TURNSTILE_SITE_KEY: '0x4AAAAAAAtestkey',
};

test('DEV client config works only from local development origins', () => {
  assert.equal(resolveCommunityRuntimeConfig(env, origin)?.url, env.VITE_SUPABASE_URL);
  assert.equal(resolveCommunityRuntimeConfig(env, 'http://localhost:5173')?.url, env.VITE_SUPABASE_URL);
  assert.equal(resolveCommunityRuntimeConfig(env, 'https://basescusorin-coder.github.io'), null);
  assert.equal(resolveCommunityRuntimeConfig(env, 'https://intentra.ch'), null);
});

test('rejects other projects, URL tricks, secret keys and missing CAPTCHA config', () => {
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_URL: 'https://other.supabase.co' }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_URL: `${env.VITE_SUPABASE_URL}/rest/v1` }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_URL: `${env.VITE_SUPABASE_URL}?redirect=evil` }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_ANON_KEY: `sb_secret_${'x'.repeat(40)}` }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_ANON_KEY: 'not-a-valid-client-key-value' }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_TURNSTILE_SITE_KEY: '' }, origin), null);
});

test('legacy JWT key must have the anon role; service role is rejected', () => {
  const jwtFor = role => `header.${btoa(JSON.stringify({ role })).replace(/=/g, '')}.signature`;
  assert.ok(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_ANON_KEY: jwtFor('anon') }, origin));
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_ANON_KEY: jwtFor('service_role') }, origin), null);
});
