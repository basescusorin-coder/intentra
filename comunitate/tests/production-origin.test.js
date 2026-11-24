import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/production-functions');
const allowedOrigins = [
  'https://intentra.ch',
  'https://www.intentra.ch',
  'https://intentra-comunitate-preview-git-featur-620154-basescusorin-7695.vercel.app',
];
const allowedHostnames = allowedOrigins.map(value => new URL(value).hostname);

for (const fn of ['community-image-upload', 'delete-community-post', 'delete-community-account']) {
  test(`${fn} accepts only the official domains and the protected test alias`, () => {
    const source = fs.readFileSync(path.join(root, fn, '_shared/security.ts'), 'utf8');
    const originBlock = source.match(/const allowedOrigins = new Set\(\[([\s\S]*?)\]\);/);
    const hostnameBlock = source.match(/payload\.success === true && \(\[([^\]]+)\]\.includes\(String\(payload\.hostname\)\)\)/);
    assert.ok(originBlock, 'CORS origin allowlist must remain explicit');
    assert.ok(hostnameBlock, 'Turnstile hostname allowlist must remain explicit');
    const origins = [...originBlock[1].matchAll(/"(https:\/\/[^\"]+)"/g)].map(match => match[1]);
    const hostnames = [...hostnameBlock[1].matchAll(/"([^\"]+)"/g)].map(match => match[1]);
    assert.deepEqual(origins.sort(), [...allowedOrigins].sort());
    assert.deepEqual(hostnames.sort(), [...allowedHostnames].sort());
  });
}
