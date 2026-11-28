import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeImage } from './image-sanitizer.js';

const fixtures = {
  jpeg: new Uint8Array(Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCABAAEADAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCZLggQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/2Q==', 'base64')),
  png: new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABAAQMAAACQp+OdAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGUExURSqdj////59C/EEAAAABYktHRAH/Ai3eAAAAB3RJTUUH6gsQESMpvT3SgAAAAA9JREFUKM9jYBgFo4B8AAACQAABjMWrdwAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNi0xMS0xNlQxNzozNTo0MSswMDowMKVVau4AAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjYtMTEtMTZUMTc6MzU6NDErMDA6MDDUCNJSAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI2LTExLTE2VDE3OjM1OjQxKzAwOjAwgx3zjQAAAABJRU5ErkJggg==', 'base64')),
  webp: new Uint8Array(Buffer.from('UklGRlQAAABXRUJQVlA4IEgAAADwAwCdASpAAEAAPpFIoEwlpCMiIggAsBIJaQDTyoAAGH3J4IttM7iAAP7Ogv+6L7UVQf//JT+u7yi5hDoKV/9YUZOcSpmQAAA=', 'base64')),
};

function be32(value) {
  return Uint8Array.of(value >>> 24, value >>> 16, value >>> 8, value);
}

function le32(value) {
  return Uint8Array.of(value, value >>> 8, value >>> 16, value >>> 24);
}

function concat(parts) {
  const output = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(name, data) {
  const type = new TextEncoder().encode(name);
  const payload = concat([type, data]);
  return concat([be32(data.length), payload, be32(crc32(payload))]);
}

function webpChunk(name, data) {
  const header = concat([new TextEncoder().encode(name), le32(data.length)]);
  return concat([header, data, ...(data.length & 1 ? [Uint8Array.of(0)] : [])]);
}

function webpWithExif() {
  const extendedHeader = new Uint8Array(10);
  extendedHeader[0] = 0x08;
  extendedHeader[4] = 63;
  extendedHeader[7] = 63;
  const originalImageChunks = fixtures.webp.subarray(12);
  const body = concat([
    webpChunk('VP8X', extendedHeader),
    webpChunk('EXIF', new TextEncoder().encode('GPS private test metadata')),
    originalImageChunks,
  ]);
  return concat([new TextEncoder().encode('RIFF'), le32(body.length + 4), new TextEncoder().encode('WEBP'), body]);
}

test('accepts JPEG and strips EXIF metadata while preserving JPEG', () => {
  const metadata = new TextEncoder().encode('Exif\0\0GPS private test metadata');
  const segment = concat([Uint8Array.of(0xff, 0xe1), Uint8Array.of(0, metadata.length + 2), metadata]);
  const input = concat([fixtures.jpeg.subarray(0, 2), segment, fixtures.jpeg.subarray(2)]);
  const result = sanitizeImage(input);
  assert.equal(result.contentType, 'image/jpeg');
  assert.equal(result.extension, 'jpg');
  assert.equal(result.bytes[0], 0xff);
  assert.equal(result.bytes[1], 0xd8);
  assert.equal(Buffer.from(result.bytes).includes(Buffer.from('GPS private test metadata')), false);
});

test('accepts PNG and strips text and EXIF metadata while preserving PNG', () => {
  const signature = fixtures.png.subarray(0, 8);
  const ihdr = fixtures.png.subarray(8, 33);
  const rest = fixtures.png.subarray(33);
  const exif = pngChunk('eXIf', new TextEncoder().encode('GPS private test metadata'));
  const text = pngChunk('tEXt', new TextEncoder().encode('Comment\0GPS private test metadata'));
  const result = sanitizeImage(concat([signature, ihdr, exif, text, rest]));
  assert.equal(result.contentType, 'image/png');
  assert.equal(result.extension, 'png');
  assert.equal(result.bytes[0], 137);
  assert.equal(Buffer.from(result.bytes).includes(Buffer.from('GPS private test metadata')), false);
});

test('accepts WebP and strips EXIF metadata while clearing its feature flag', () => {
  const result = sanitizeImage(webpWithExif());
  assert.equal(result.contentType, 'image/webp');
  assert.equal(result.extension, 'webp');
  assert.equal(String.fromCharCode(...result.bytes.subarray(0, 4)), 'RIFF');
  assert.equal(result.bytes[20] & 0x08, 0);
  assert.equal(Buffer.from(result.bytes).includes(Buffer.from('GPS private test metadata')), false);
});

test('rejects unsupported or malformed images', () => {
  assert.throws(() => sanitizeImage(new Uint8Array([1, 2, 3])), /unsupported_image|invalid_image/);
  assert.throws(() => sanitizeImage(fixtures.jpeg.subarray(0, 20)), /invalid_image/);
});
