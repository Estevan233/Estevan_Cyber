const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage is composed from focused partials", () => {
  const homepage = read("layouts/index.html");

  for (const name of [
    "hero",
    "article-list",
    "focus",
    "progress",
    "tag-cloud",
    "playlist",
    "facilities",
  ]) {
    assert.match(homepage, new RegExp(`partial \\"home/${name}\\.html\\"`));
  }
});

test("homepage data and third-party notices exist", () => {
  for (const file of [
    "data/focus.yaml",
    "data/playlist.yaml",
    "THIRD_PARTY_NOTICES.md",
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should exist`);
  }
});

test("default theme is light", () => {
  assert.match(read("config.yaml"), /defaultTheme:\s*light/);
});
