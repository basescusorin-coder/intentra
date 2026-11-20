import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
const root = resolve('..');
const community = readFileSync(resolve(root, 'comunitate/index.html'), 'utf8');
for (const [file, title] of [['comunitate/public/privacy.html','privacy'], ['comunitate/public/rules.html','rules'], ['contact/index.html','contact']]) {
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
