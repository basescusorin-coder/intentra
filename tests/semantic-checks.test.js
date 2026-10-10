const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, "index.html should contain its application script");

function getRuleApi() {
  const elements = new Map();
  const getElementById = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: "", textContent: "", hidden: false, className: "", disabled: false,
        addEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {},
        replaceChildren() {}, appendChild() {}
      });
    }
    return elements.get(id);
  };
  const context = {
    document: { getElementById, createElement: () => ({}) },
    fetch: async () => { throw new Error("offline in unit test"); }
  };
  vm.createContext(context);
  vm.runInContext(`${script}\nglobalThis.ruleApi = { extractConstraints, detectLocalViolations };`, context);
  return context.ruleApi;
}

function hasViolation(request, result) {
  const { extractConstraints, detectLocalViolations } = getRuleApi();
  return detectLocalViolations(extractConstraints(request), result).length > 0;
}

test("detects an explicit direct-flight contradiction", () => {
  assert.equal(hasViolation(
    "Find a direct flight from Zurich to Bucharest. Do not include stopovers.",
    "I found a flight from Zurich to Bucharest with one stop in Vienna."
  ), true);
});

test("does not flag an answer that confirms no stopovers", () => {
  assert.equal(hasViolation("No stopovers.", "There are no stopovers or transfers."), false);
});

test("compares written stop counts to the maximum", () => {
  assert.equal(hasViolation("Allow at most 2 stops.", "The itinerary has 3 stops."), true);
  assert.equal(hasViolation("Allow at most 2 stops.", "The itinerary has 1 stop."), false);
});

test("recognizes Romanian direct-trip constraints and stop counts", () => {
  assert.equal(hasViolation("Găsește un zbor direct spre Zürich, fără escale.", "Am găsit un zbor cu o escală la Viena."), true);
  assert.equal(hasViolation("Acceptă cel mult două escale.", "Traseul include trei escale."), true);
});

test("still detects a contradiction when the answer explains the request", () => {
  assert.equal(hasViolation("Do not include stopovers.", "The request forbids stops, but the answer contains one stop in Vienna."), true);
});
