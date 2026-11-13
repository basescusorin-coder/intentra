export const CANTONS = Object.freeze([
  'AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW',
  'OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH',
]);
export const CATEGORIES = Object.freeze(['free','sale','question']);

const trim = value => typeof value === 'string' ? value.trim() : '';

export function validateProfile(input) {
  const username = trim(input?.username);
  const canton = trim(input?.canton).toUpperCase();
  const city = trim(input?.city);
  const phone = trim(input?.phone);
  const errors = {};
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) errors.username = 'username';
  if (!CANTONS.includes(canton)) errors.canton = 'canton';
  if (city.length < 2 || city.length > 80) errors.city = 'city';
  if (phone && !/^\+?[0-9 ()\-./]{7,25}$/.test(phone)) errors.phone = 'phone';
  return { ok: Object.keys(errors).length === 0, value: { username, canton, city, phone: phone || null }, errors };
}

export function validatePost(input) {
  const category = trim(input?.category);
  const title = trim(input?.title);
  const body = trim(input?.body);
  const canton = trim(input?.canton).toUpperCase();
  const city = trim(input?.city);
  const rawPrice = input?.price;
  const price = rawPrice === '' || rawPrice == null ? null : Number(rawPrice);
  const errors = {};
  if (!CATEGORIES.includes(category)) errors.category = 'category';
  if (title.length < 5 || title.length > 120) errors.title = 'title';
  if (body.length < 10 || body.length > 5000) errors.body = 'body';
  if (!CANTONS.includes(canton)) errors.canton = 'canton';
  if (city.length < 2 || city.length > 80) errors.city = 'city';
  if (category === 'sale' && (!Number.isFinite(price) || price < 0 || price > 10000000)) errors.price = 'price';
  if (category !== 'sale' && price !== null) errors.price = 'price';
  return { ok: Object.keys(errors).length === 0, value: { category, title, body, canton, city, price }, errors };
}

export function validateReport(input) {
  const reason = trim(input?.reason);
  return { ok: reason.length >= 5 && reason.length <= 500, value: reason };
}

export function validateImageFile(file) {
  const allowed = new Set(['image/jpeg','image/png','image/webp']);
  return Boolean(file && allowed.has(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024);
}
