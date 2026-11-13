import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile, validatePost, validateReport, validateImageFile } from '../src/validation.js';

test('profile validation normalizes canton and preserves optional phone as private value', () => {
  const result = validateProfile({ username: 'Sor_In', canton: 'ag', city: 'Bremgarten', phone: '+41 79 123 45 67' });
  assert.equal(result.ok, true);
  assert.equal(result.value.canton, 'AG');
});

test('profile rejects invalid canton, pseudonym and malformed phone', () => {
  assert.equal(validateProfile({ username: 'bad name', canton: 'XX', city: 'A', phone: 'call-me' }).ok, false);
});

test('sale requires a bounded CHF amount while non-sale categories reject a price', () => {
  const sale = { category:'sale', title:'Bicicletă bună', body:'Bicicletă în stare bună, folosită cu grijă.', canton:'AG', city:'Wohlen', price:'85' };
  assert.equal(validatePost(sale).ok, true);
  assert.equal(validatePost({ ...sale, price:'' }).ok, false);
  assert.equal(validatePost({ ...sale, category:'free', price:'1' }).ok, false);
});

test('post rejects missing location, excessive text and unsupported Job category', () => {
  const base = { category:'question', title:'Întrebare', body:'Aceasta este o întrebare suficient de lungă.', canton:'AG', city:'Wohlen', price:'' };
  assert.equal(validatePost(base).ok, true);
  assert.equal(validatePost({ ...base, city:'A' }).ok, false);
  assert.equal(validatePost({ ...base, category:'job' }).ok, false);
  assert.equal(validatePost({ ...base, body:'x'.repeat(5001) }).ok, false);
});

test('report and image constraints reject empty, oversized and executable content types', () => {
  assert.equal(validateReport({ reason:'spam listing' }).ok, true);
  assert.equal(validateReport({ reason:'no' }).ok, false);
  assert.equal(validateImageFile({ type:'image/jpeg', size: 1024 }), true);
  assert.equal(validateImageFile({ type:'image/svg+xml', size: 1024 }), false);
  assert.equal(validateImageFile({ type:'image/jpeg', size: 6 * 1024 * 1024 }), false);
});
