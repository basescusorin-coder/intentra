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

test("detects language mismatches in English and Romanian", () => {
  assert.equal(hasViolation("Răspunde în română.", "The answer is yes, and this is the result."), true);
  assert.equal(hasViolation("Answer in English.", "The answer is yes, and this is the result."), false);
});

test("checks exact bullet counts", () => {
  assert.equal(hasViolation("Use exactly 3 bullet points.", "- One\n- Two\n- Three\n- Four"), true);
  assert.equal(hasViolation("Folosește exact 3 puncte.", "- Unu\n- Doi\n- Trei"), false);
});

test("checks maximum word counts", () => {
  assert.equal(hasViolation("Keep the answer under 4 words.", "This answer has exactly five words."), true);
  assert.equal(hasViolation("Răspunde în maxim 5 cuvinte.", "Acesta are doar trei cuvinte."), false);
});

test("checks required and forbidden quoted phrases", () => {
  assert.equal(hasViolation('Include the phrase "available today".', "The item is ready."), true);
  assert.equal(hasViolation('Nu include „adresa privată”.', "Am trimis adresa privată ieri."), true);
  assert.equal(hasViolation('Include the phrase "available today".', "It is available today."), false);
});
