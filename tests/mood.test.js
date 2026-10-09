const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../assets/js/mood-core.js");
const fs = require("node:fs");
const path = require("node:path");
const entry = (props = {}) => ({ id: "test-1", at: "2026-10-09T10:00", score: 2, energy: 3, note: "", emotions: ["焦虑"], triggers: ["工作"], ...props });
test("mood schema rejects malformed, excessive and unsafe values", () => {
  for (const props of [{ score: 0 }, { score: "2" }, { energy: 6 }, { at: "2026-02-30T10:00" }, { triggers: ["unknown"] }, { note: "a".repeat(2001) }, { id: "<script>" }]) assert.throws(() => core.validateEntry(entry(props)));
  assert.equal(core.validateEntry(entry({ note: "<script>alert(1)</script>" })).note, "<script>alert(1)</script>");
});
test("backup requires version, full validation, unique IDs and size cap", () => {
  assert.equal(core.parseBackup(JSON.stringify({ version: 1, entries: [entry()] })).length, 1);
  for (const value of [{ version: 2, entries: [] }, { version: 1, entries: [entry(), entry()] }, { version: 1, entries: [entry({ score: 9 })] }]) assert.throws(() => core.parseBackup(JSON.stringify(value)));
  assert.throws(() => core.parseBackup("a".repeat(5 * 1024 * 1024 + 1)));
});
test("merging preserves existing records and replaces matching IDs", () => {
  const merged = core.mergeEntries([entry(), entry({ id: "other" })], [entry({ score: 5 })]);
  assert.equal(merged.length, 2); assert.equal(merged.find((e) => e.id === "test-1").score, 5);
});
test("review uses local day boundaries and excludes future records", () => {
  const stats = core.summarize([entry(), entry({ id: "two", score: 4 }), entry({ id: "old", at: "2026-10-02T23:59" }), entry({ id: "future", at: "2026-10-09T23:59" })], 7, new Date(2026, 9, 9, 12));
  assert.equal(stats.count, 2); assert.equal(stats.activeDays, 1); assert.equal(stats.average, 3);
  assert.equal(stats.timeline.length, 7); assert.equal(stats.timeline[0].average, null); assert.equal(stats.timeline[6].average, 3);
  assert.equal(stats.triggers[0].count, 2);
});
test("empty review is honest and missing days do not become zeroes", () => {
  const stats = core.summarize([], 30); assert.equal(stats.average, null); assert.equal(stats.activeDays, 0); assert.ok(stats.timeline.every((e) => e.average === null));
});
test("local dates, leap days and optional recommendations", () => {
  assert.equal(core.localTime(new Date(2024, 1, 29, 9, 5)), "2024-02-29T09:05");
  assert.equal(core.validTime("2024-02-29T09:05"), true);
  assert.match(core.recommendation(2, ["疲惫"]), /休息/);
  assert.match(core.recommendation(1), /停下来/);
});
test("mood route has privacy controls, safe text rendering and release probes", () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
  const template = read("layouts/_default/mood.html");
  for (const id of ["mood-form", "mood-export", "mood-import", "mood-clear", "mood-history", "breath-start", "care-audio"]) assert.ok(template.includes(`id="${id}"`));
  assert.match(template, /未经加密|未加密/);
  assert.doesNotMatch(read("assets/js/mood-app.js"), /innerHTML|fetch\(|XMLHttpRequest/);
  assert.match(read("scripts/deploy-site.sh"), /mood\/index\.html/);
  assert.match(read(".github/workflows/site.yml"), /public\/mood\/index\.html/);
});
