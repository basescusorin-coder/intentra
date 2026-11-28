import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMUNITY_DEV_PROJECT_REF, COMMUNITY_PRODUCTION_TEST_ORIGIN, resolveCommunityRuntimeConfig } from '../src/runtime-config.js';

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

test('rejects other projects, URL tricks and secret keys; missing CAPTCHA is read-only', () => {
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_URL: 'https://other.supabase.co' }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_URL: `${env.VITE_SUPABASE_URL}/rest/v1` }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_URL: `${env.VITE_SUPABASE_URL}?redirect=evil` }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_ANON_KEY: `sb_secret_${'x'.repeat(40)}` }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_ANON_KEY: 'not-a-valid-client-key-value' }, origin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_TURNSTILE_SITE_KEY: '' }, origin)?.turnstileSiteKey, null);
});

test('legacy JWT key must have the anon role; service role is rejected', () => {
  const jwtFor = role => `header.${btoa(JSON.stringify({ role })).replace(/=/g, '')}.signature`;
  assert.ok(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_ANON_KEY: jwtFor('anon') }, origin));
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_SUPABASE_ANON_KEY: jwtFor('service_role') }, origin), null);
});


test('explicit HTTPS preview origin is allowed only for DEV and never production', () => {
  const preview = 'https://intentra-community-preview.example.net';
  const configured = { ...env, VITE_COMMUNITY_PREVIEW_ORIGIN: preview };
  assert.equal(resolveCommunityRuntimeConfig(configured, preview)?.url, env.VITE_SUPABASE_URL);
  assert.equal(resolveCommunityRuntimeConfig(configured, 'https://another.example.net'), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...configured, VITE_SUPABASE_URL: 'https://other.supabase.co' }, preview), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_COMMUNITY_PREVIEW_ORIGIN: 'https://intentra.ch' }, 'https://intentra.ch'), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_COMMUNITY_PREVIEW_ORIGIN: 'https://test.intentra.ch' }, 'https://test.intentra.ch'), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_COMMUNITY_PREVIEW_ORIGIN: 'http://example.net' }, 'http://example.net'), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...env, VITE_COMMUNITY_PREVIEW_ORIGIN: 'https://example.net/path' }, 'https://example.net'), null);
});


test('only stable Vercel DEV preview alias may connect; missing CAPTCHA remains read-only', () => {
  const stable = 'https://intentra-comunitate-preview-git-featur-620154-basescusorin-7695.vercel.app';
  const result = resolveCommunityRuntimeConfig({ ...env, VITE_TURNSTILE_SITE_KEY: undefined, VITE_COMMUNITY_PREVIEW_ORIGIN: stable }, stable);
  assert.equal(result?.url, env.VITE_SUPABASE_URL);
  assert.equal(result?.turnstileSiteKey, null);
  assert.equal(resolveCommunityRuntimeConfig(env, 'https://intentra-comunitate-preview-e3n7zlawg-basescusorin-7695.vercel.app'), null);
  assert.equal(resolveCommunityRuntimeConfig(env, 'https://intentra.ch'), null);
});

test('production is explicit, rejects DEV and unrelated origins, and requires CAPTCHA', () => {
  const prodRef = 'abcdefghijklmnopqrst';
  const prodOrigin = 'https://intentra.ch';
  const prod = {
    ...env,
    VITE_COMMUNITY_MODE: 'production',
    VITE_COMMUNITY_PRODUCTION_PROJECT_REF: prodRef,
    VITE_SUPABASE_URL: `https://${prodRef}.supabase.co`,
  };
  assert.equal(resolveCommunityRuntimeConfig(prod, prodOrigin)?.url, prod.VITE_SUPABASE_URL);
  assert.equal(resolveCommunityRuntimeConfig(prod, 'https://www.intentra.ch'), null);
  assert.equal(resolveCommunityRuntimeConfig(prod, origin), null);
  assert.equal(resolveCommunityRuntimeConfig(prod, 'https://fake-intentra.ch'), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...prod, VITE_SUPABASE_URL: `https://${COMMUNITY_DEV_PROJECT_REF}.supabase.co` }, prodOrigin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...prod, VITE_COMMUNITY_PRODUCTION_PROJECT_REF: COMMUNITY_DEV_PROJECT_REF }, prodOrigin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...prod, VITE_COMMUNITY_PRODUCTION_PROJECT_REF: 'not-a-ref' }, prodOrigin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...prod, VITE_TURNSTILE_SITE_KEY: '' }, prodOrigin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...prod, VITE_SUPABASE_ANON_KEY: `sb_secret_${'x'.repeat(40)}` }, prodOrigin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...prod, VITE_SUPABASE_URL: prod.VITE_SUPABASE_URL + '/rest/v1' }, prodOrigin), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...prod, VITE_COMMUNITY_MODE: 'dev' }, prodOrigin), null);
});

test('production test config is limited to the exact SSO-protected branch alias', () => {
  const prodRef = 'abcdefghijklmnopqrst';
  const testConfig = {
    ...env,
    VITE_COMMUNITY_MODE: 'production',
    VITE_COMMUNITY_PRODUCTION_PROJECT_REF: prodRef,
    VITE_COMMUNITY_PRODUCTION_TEST_ORIGIN: COMMUNITY_PRODUCTION_TEST_ORIGIN,
    VITE_SUPABASE_URL: `https://${prodRef}.supabase.co`,
  };
  assert.equal(resolveCommunityRuntimeConfig(testConfig, COMMUNITY_PRODUCTION_TEST_ORIGIN)?.url, testConfig.VITE_SUPABASE_URL);
  assert.equal(resolveCommunityRuntimeConfig(testConfig, 'https://intentra-comunitate-preview-evil.vercel.app'), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...testConfig, VITE_COMMUNITY_PRODUCTION_TEST_ORIGIN: 'https://attacker.example' }, COMMUNITY_PRODUCTION_TEST_ORIGIN), null);
  assert.equal(resolveCommunityRuntimeConfig({ ...testConfig, VITE_SUPABASE_URL: `https://${COMMUNITY_DEV_PROJECT_REF}.supabase.co` }, COMMUNITY_PRODUCTION_TEST_ORIGIN), null);
});

test('only the exact stable Vercel DEV alias may connect; deployment URLs are denied', () => {
  const stable = 'https://intentra-comunitate-preview-git-featur-620154-basescusorin-7695.vercel.app';
  const configured = { ...env, VITE_COMMUNITY_PREVIEW_ORIGIN: stable };
  assert.ok(resolveCommunityRuntimeConfig(configured, stable));
  assert.equal(resolveCommunityRuntimeConfig(configured, 'https://intentra-comunitate-preview-jmkv07l9g-basescusorin-7695.vercel.app'), null);
  assert.equal(resolveCommunityRuntimeConfig(configured, 'https://intentra-comunitate-preview-e3n7zlawg-basescusorin-7695.vercel.app'), null);
  assert.equal(resolveCommunityRuntimeConfig(configured, 'https://intentra-comunitate-preview-evil.vercel.app'), null);
  assert.equal(resolveCommunityRuntimeConfig(configured, 'https://intentra.ch'), null);
});
