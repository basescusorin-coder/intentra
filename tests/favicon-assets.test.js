const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function pngDimensions(name) {
  const data = fs.readFileSync(path.join(root, name));
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${name} must be PNG`);
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

test("publishes square INTENTRA favicon PNGs at the requested sizes", () => {
  for (const size of [48, 96, 192]) {
    const name = `favicon-${size}.png`;
    assert.deepEqual(pngDimensions(name), [size, size]);
    assert.ok(html.includes(`sizes="${size}x${size}" href="./${name}"`));
  }
});

test("publishes a multi-resolution ICO and iOS touch icon", () => {
  const ico = fs.readFileSync(path.join(root, "favicon.ico"));
  assert.equal(ico.readUInt16LE(0), 0, "ICO reserved header must be zero");
  assert.equal(ico.readUInt16LE(2), 1, "ICO type must be one");
  assert.ok(ico.readUInt16LE(4) >= 3, "ICO should include multiple resolutions");
  assert.ok(html.includes('href="./favicon.ico"'));
  assert.deepEqual(pngDimensions("apple-touch-icon.png"), [180, 180]);
  assert.ok(html.includes('sizes="180x180" href="./apple-touch-icon.png"'));
});
