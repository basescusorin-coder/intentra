const JPEG_SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_METADATA = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME", "iCCP"]);
const WEBP_METADATA = new Set(["EXIF", "XMP ", "ICCP"]);
const MAX_PIXELS = 12_000_000;

function readU32BE(bytes, at) {
  return new DataView(bytes.buffer, bytes.byteOffset + at, 4).getUint32(0, false);
}

function readU32LE(bytes, at) {
  return new DataView(bytes.buffer, bytes.byteOffset + at, 4).getUint32(0, true);
}

function writeU32LE(bytes, at, value) {
  new DataView(bytes.buffer, bytes.byteOffset + at, 4).setUint32(0, value, true);
}

function concat(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

export function detectImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && PNG_SIGNATURE.every((value, i) => bytes[i] === value)) return "png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") return "webp";
  return null;
}

function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if (JPEG_SOF.has(marker)) {
      if (length < 7) return null;
      return [(bytes[offset + 5] << 8) | bytes[offset + 6], (bytes[offset + 3] << 8) | bytes[offset + 4]];
    }
    offset += length;
  }
  return null;
}

function pngDimensions(bytes) {
  if (bytes.length < 33 || !PNG_SIGNATURE.every((value, i) => bytes[i] === value)) return null;
  const length = readU32BE(bytes, 8);
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR" || length !== 13) return null;
  return [readU32BE(bytes, 16), readU32BE(bytes, 20)];
}

function webpChunks(bytes) {
  if (bytes.length < 20 || String.fromCharCode(...bytes.subarray(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.subarray(8, 12)) !== "WEBP") return null;
  if (readU32LE(bytes, 4) !== bytes.length - 8) return null;
  const chunks = [];
  let offset = 12;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return null;
    const name = String.fromCharCode(...bytes.subarray(offset, offset + 4));
    const length = readU32LE(bytes, offset + 4);
    const end = offset + 8 + length;
    const paddedEnd = end + (length & 1);
    if (end > bytes.length || paddedEnd > bytes.length) return null;
    chunks.push({ name, start: offset, dataStart: offset + 8, length, end: paddedEnd });
    offset = paddedEnd;
  }
  return chunks;
}

function webpDimensions(bytes, chunks) {
  for (const chunk of chunks) {
    const at = chunk.dataStart;
    if (chunk.name === "VP8X" && chunk.length >= 10) {
      return [1 + bytes[at + 4] + (bytes[at + 5] << 8) + (bytes[at + 6] << 16), 1 + bytes[at + 7] + (bytes[at + 8] << 8) + (bytes[at + 9] << 16)];
    }
    if (chunk.name === "VP8 " && chunk.length >= 10 && bytes[at + 3] === 0x9d && bytes[at + 4] === 0x01 && bytes[at + 5] === 0x2a) {
      return [((bytes[at + 7] << 8) | bytes[at + 6]) & 0x3fff, ((bytes[at + 9] << 8) | bytes[at + 8]) & 0x3fff];
    }
    if (chunk.name === "VP8L" && chunk.length >= 5 && bytes[at] === 0x2f) {
      const b1 = bytes[at + 2], b2 = bytes[at + 3], b3 = bytes[at + 4];
      return [1 + (((b1 & 0x3f) << 8) | bytes[at + 1]), 1 + (((b1 & 0xc0) >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10))];
    }
  }
  return null;
}

function sanitizeJpeg(bytes) {
  const chunks = [bytes.subarray(0, 2)];
  let offset = 2;
  let sawFrame = false;
  let sawScan = false;
  let sawEnd = false;
  while (offset < bytes.length) {
    const start = offset;
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset++];
    if (marker === 0xd9) {
      chunks.push(bytes.subarray(start, offset));
      sawEnd = true;
      break;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(bytes.subarray(start, offset));
      continue;
    }
    if (offset + 2 > bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    const end = offset + length;
    if (JPEG_SOF.has(marker)) sawFrame = true;
    const isMetadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) chunks.push(bytes.subarray(start, end));
    offset = end;
    if (marker !== 0xda) continue;

    sawScan = true;
    const scanStart = offset;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      let markerOffset = offset + 1;
      while (bytes[markerOffset] === 0xff) markerOffset++;
      if (markerOffset >= bytes.length) return null;
      const nextMarker = bytes[markerOffset];
      if (nextMarker === 0x00 || (nextMarker >= 0xd0 && nextMarker <= 0xd7)) {
        offset = markerOffset + 1;
        continue;
      }
      chunks.push(bytes.subarray(scanStart, offset));
      break;
    }
    if (offset >= bytes.length) return null;
  }
  if (!sawFrame || !sawScan || !sawEnd || offset !== bytes.length) return null;
  return concat(chunks);
}

function sanitizePng(bytes) {
  const chunks = [];
  let offset = 8;
  let sawHeader = false;
  let sawData = false;
  let sawEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = readU32BE(bytes, offset);
    const name = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const end = offset + 12 + length;
    if (end > bytes.length) return null;
    if (!sawHeader && name !== "IHDR") return null;
    if (name === "IHDR") {
      if (sawHeader || length !== 13) return null;
      sawHeader = true;
    }
    if (name === "IDAT") sawData = true;
    if (name === "IEND") {
      if (length !== 0) return null;
      sawEnd = true;
    }
    if (!PNG_METADATA.has(name)) chunks.push(bytes.subarray(offset, end));
    offset = end;
    if (sawEnd) break;
  }
  if (!sawHeader || !sawData || !sawEnd || offset !== bytes.length) return null;
  return concat([bytes.subarray(0, 8), ...chunks]);
}

function sanitizeWebp(bytes, chunks) {
  const outputChunks = [];
  const removedMetadata = chunks.reduce((flags, chunk) => {
    if (chunk.name === "EXIF") return flags | 0x08;
    if (chunk.name === "XMP ") return flags | 0x04;
    if (chunk.name === "ICCP") return flags | 0x20;
    return flags;
  }, 0);
  for (const chunk of chunks) {
    if (WEBP_METADATA.has(chunk.name)) {
      continue;
    }
    const contents = bytes.subarray(chunk.start, chunk.end);
    if (chunk.name === "VP8X") {
      if (chunk.length < 10) return null;
      const copy = contents.slice();
      copy[8] &= ~removedMetadata;
      outputChunks.push(copy);
    } else outputChunks.push(contents);
  }
  const body = concat(outputChunks);
  const header = bytes.subarray(0, 12).slice();
  writeU32LE(header, 4, body.length + 4);
  return concat([header, body]);
}

export function sanitizeImage(input) {
  const type = detectImageType(input);
  if (!type) throw new Error("unsupported_image");
  let dims;
  let output;
  if (type === "jpeg") {
    dims = jpegDimensions(input);
    output = sanitizeJpeg(input);
  } else if (type === "png") {
    dims = pngDimensions(input);
    output = sanitizePng(input);
  } else {
    const chunks = webpChunks(input);
    dims = chunks && webpDimensions(input, chunks);
    output = chunks && sanitizeWebp(input, chunks);
  }
  if (!dims || dims[0] < 1 || dims[1] < 1 || dims[0] * dims[1] > MAX_PIXELS || !output) throw new Error("invalid_image");
  return { bytes: output, contentType: `image/${type === "jpeg" ? "jpeg" : type}`, extension: type === "jpeg" ? "jpg" : type };
}
