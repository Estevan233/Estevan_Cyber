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

test("homepage reveals an overview below the curtain hero", () => {
  const homepage = read("layouts/index.html");
  const hero = read("layouts/partials/home/hero.html");
  const progress = read("layouts/partials/home/progress.html");

  assert.match(homepage, /partial "home\/overview\.html"/);
  assert.match(homepage, /id="home-content"/);
  assert.match(homepage, /js\/home-curtain\.js/);
  assert.match(hero, /data-curtain-hero/);
  assert.match(hero, /data-hero-image/);
  assert.match(hero, /href="#home-content"/);
  assert.match(progress, /data-period="year"/);
  assert.doesNotMatch(
    progress,
    /data-period="day"|data-period="week"|data-period="month"/,
  );
});
