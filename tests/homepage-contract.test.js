const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage is composed from focused partials", () => {
  const homepage = read("layouts/index.html");
  const overview = read("layouts/partials/home/overview.html");
  const composition = `${homepage}\n${overview}`;

  for (const name of [
    "hero",
    "article-list",
    "focus",
    "progress",
    "tag-cloud",
    "playlist",
    "facilities",
  ]) {
    assert.match(composition, new RegExp(`partial \\"home/${name}\\.html\\"`));
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
  assert.match(progress, /<h2[^>]*>时间进度<\/h2>/);

  const periods = ["day", "week", "month", "year"];
  const positions = periods.map((period) => {
    const position = progress.indexOf(`data-period="${period}"`);
    assert.notEqual(position, -1, `${period} progress should be rendered`);
    return position;
  });

  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  for (const label of ["今天时间进度", "本周时间进度", "本月时间进度", "今年时间进度"]) {
    assert.match(progress, new RegExp(`aria-label="${label}"`));
  }
});
