const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, "index.html should contain its application script");

function extractFunction(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `index.html should define ${name}`);
  const end = script.indexOf("\nfunction ", start + 1);
  assert.notEqual(end, -1, `${name} should have a following function boundary`);
  return script.slice(start, end);
}

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext([
  extractFunction("extractRequirements"),
  extractFunction("inferCategory"),
  extractFunction("searchUrl"),
  "globalThis.intentra = { extractRequirements, inferCategory, searchUrl };"
].join("\n"), sandbox);
const api = sandbox.intentra;

test("classifies Romanian, German and English searches into the five categories", () => {
  assert.equal(api.inferCategory("Mercedes în Elveția"), "auto");
  assert.equal(api.inferCategory("Apartament de închiriat în Zürich"), "housing");
  assert.equal(api.inferCategory("Hotel în Zürich"), "hotels");
  assert.equal(api.inferCategory("Joburi în Wohlen"), "jobs");
  assert.equal(api.inferCategory("Laptop günstig kaufen"), "products");
});

test("extracts budget, year and place details from search text", () => {
  const requirements = api.extractRequirements("Caut Mercedes sub 10000 CHF din 2020 în Zürich");
  assert.ok(requirements.some(([kind, value]) => kind === "budget" && value.includes("10000")));
  assert.ok(requirements.some(([kind, value]) => kind === "year" && value === "2020"));
  assert.ok(requirements.some(([kind, value]) => kind === "place" && value === "Zürich"));
});

test("uses direct original platform search links with the user's query", () => {
  const car = new URL(api.searchUrl("AutoScout24", "https://fallback.example/", "Mercedes Zürich"));
  assert.equal(car.origin, "https://www.autoscout24.ch");
  assert.equal(car.pathname, "/de/s");
  assert.equal(car.searchParams.get("query"), "Mercedes Zürich");

  const job = new URL(api.searchUrl("jobs.ch", "https://fallback.example/", "Pflegefachfrau Muri"));
  assert.equal(job.origin, "https://www.jobs.ch");
  assert.equal(job.searchParams.get("term"), "Pflegefachfrau Muri");
});
