#!/usr/bin/env node
// Assemble the existing GitHub Pages home page and the compiled Vite community
// into one uploadable static-site directory. Does not deploy or change main.
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveCommunityRuntimeConfig } from '../src/runtime-config.js';

const communityRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = resolve(communityRoot, '..');
const outputDir = resolve(repositoryRoot, 'site-release');
const production = process.argv.includes('--production');
const mode = production ? 'production' : 'staging';

if (production) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_')));
  if (env.VITE_COMMUNITY_MODE !== 'production' ||
      !resolveCommunityRuntimeConfig(env, 'https://intentra.ch')) {
    throw new Error('Refusing production build: distinct Supabase production project, public key, site key and explicit production mode required.');
  }
  if (process.env.COMMUNITY_RELEASE_APPROVED !== 'yes') {
    throw new Error('Refusing production build without COMMUNITY_RELEASE_APPROVED=yes.');
  }
} else if (process.env.VITE_COMMUNITY_MODE === 'production') {
  throw new Error('Refusing staging build with production configuration.');
}

const allowed = /\.(html|css|js|mjs|png|jpe?g|webp|svg|ico|xml|txt|webmanifest|json)$/i;
const rootFiles = await readdir(repositoryRoot, { withFileTypes: true });
if (!rootFiles.some(entry => entry.isFile() && entry.name === 'index.html')) {
  throw new Error('Root INTENTRA index.html is missing.');
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
for (const entry of rootFiles) {
  if (entry.isFile() && allowed.test(entry.name)) {
    // Files in the root are the original published search-site assets.
    await cp(join(repositoryRoot, entry.name), join(outputDir, entry.name));
  }
}

const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'build'], { cwd: communityRoot, env: process.env, stdio: 'inherit' });
if (build.status !== 0) throw new Error('Vite community build failed.');
const dist = join(communityRoot, 'dist');
if (!(await stat(join(dist, 'index.html'))).isFile()) throw new Error('Community Vite HTML missing.');
await cp(dist, join(outputDir, 'comunitate'), { recursive: true });

const staged = await readdir(join(outputDir, 'comunitate'));
if (!staged.includes('index.html') || !staged.includes('assets')) throw new Error('Community bundle incomplete.');
console.log('INTENTRA site package prepared:', outputDir, 'mode:', mode);
console.log('No public deployment was performed.');
