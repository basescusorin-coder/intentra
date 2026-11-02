const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("uses INTENTRA.CH consistently in titles and share metadata", () => {
  assert.match(html, /<title>INTENTRA\.CH — Găsește platforme de căutare potrivite<\/title>/);
  assert.match(html, /property="og:site_name" content="INTENTRA\.CH"/);
  assert.match(html, /property="og:title" content="INTENTRA\.CH — Găsește platforme de căutare potrivite"/);
  assert.match(html, /property="og:description" content="INTENTRA\.CH te ajută să găsești platforme potrivite/);
  assert.match(html, /aria-label="INTENTRA\.CH"/);
});

test("identifies INTENTRA as the alternate site name without adding personal details", () => {
  const websiteJson = html.match(/<script type="application\/ld\+json">(\{[^]*?\})<\/script>/)?.[1];
  assert.ok(websiteJson, "WebSite structured data should be present");
  const website = JSON.parse(websiteJson);
  assert.equal(website["@type"], "WebSite");
  assert.equal(website.name, "INTENTRA.CH");
  assert.deepEqual(website.alternateName, ["INTENTRA", "Caută INTENTRA"]);
  assert.equal(website.url, "https://intentra.ch/");
  assert.doesNotMatch(websiteJson, /Sorin|Băsescu|Basescu/i);
});

test("keeps translated document titles recognizable across RO, DE and EN", () => {
  const ui = JSON.parse(html.match(/const ui=(\{[^\n]+\});/)?.[1]);
  for (const language of ["ro", "de", "en"]) {
    assert.match(ui[language].title, /^INTENTRA\.CH/);
  }
});
