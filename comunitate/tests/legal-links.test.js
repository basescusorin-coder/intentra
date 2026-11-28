import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
const root = resolve('..');
const community = readFileSync(resolve(root, 'comunitate/index.html'), 'utf8');
for (const [file, title] of [['comunitate/public/privacy.html','privacy'], ['comunitate/public/rules.html','rules'], ['comunitate/public/terms.html','terms'], ['contact/index.html','contact']]) {
  const html = readFileSync(resolve(root, file), 'utf8');
  test(title + ' page has all three languages and approved contact email', () => {
    assert.match(html, /mailto:contact@intentra\.ch/);
    for (const lang of ['ro','de','en']) assert.match(html, new RegExp('lang="' + lang + '"'));
    assert.match(html, /id="language"/);
    assert.doesNotMatch(html, /Lerchenweg|077 998 05 69/);
  });
}
test('Community points to local privacy and rules pages and contact email', () => {
  assert.match(community, /href="\.\/privacy\.html"/);
  assert.match(community, /href="\.\/rules\.html"/);
  assert.match(community, /mailto:contact@intentra\.ch/);
});
test('Jobs remains an external-source search category, with internal applications closed', () => {
  const app = readFileSync(resolve(root, 'comunitate/src/main.js'), 'utf8');
  const jobs = readFileSync(resolve(root, 'joburi/index.html'), 'utf8');
  assert.match(community, /directorul de surse INTENTRA/);
  assert.doesNotMatch(community, /până la clarificarea AVG\/AVV/);
  assert.match(app, /directorul de surse INTENTRA/);
  assert.match(app, /original portal/);
  assert.match(jobs, /source|surs/i);
  assert.doesNotMatch(app, /Jobs category is disabled|Job-Kategorie ist deaktiviert/);
});
test('Terms are linked from public legal and main-site navigation', () => {
  const rules = readFileSync(resolve(root, 'comunitate/public/rules.html'), 'utf8');
  const privacy = readFileSync(resolve(root, 'comunitate/public/privacy.html'), 'utf8');
  const contact = readFileSync(resolve(root, 'contact/index.html'), 'utf8');
  const home = readFileSync(resolve(root, 'index.html'), 'utf8');
  assert.match(rules, /href="\.\/terms\.html"/);
  assert.match(privacy, /href="\.\/terms\.html"/);
  assert.match(contact, /terms\.html/);
  assert.match(home, /\/comunitate\/terms\.html/);
});
