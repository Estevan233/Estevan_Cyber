const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");

test("mood journal separates navigation, writing and contextual care", () => {
  const html = read("layouts/_default/mood.html");
  for (const name of ["mood-shell", "mood-rail", "mood-content", "mood-week", "mood-scene"]) assert.ok(html.includes(name), name);
  for (const id of ["mood-date", "mood-week", "mood-selection", "mood-history-count"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /resources.Get "images\/home\/curtain\/quiet-portrait.png"/);
  assert.match(html, /<details class="mood-extra"/);
});

test("visual refresh retains local storage protocol and authentic weekly data", () => {
  const core = require("../assets/js/mood-core.js");
  assert.equal(core.KEY, "estevancyber.mood.v1");
  const script = read("assets/js/mood-app.js");
  assert.match(script, /C.summarize\(entries, 7\)/);
  assert.match(script, /day.average === null/);
  assert.doesNotMatch(script, /innerHTML|fetch\(/);
  const css = read("assets/css/mood.css");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /\.mood-rail/);
});
