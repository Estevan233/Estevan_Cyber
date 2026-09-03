const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("tools nav entry is a dropdown with site and vps children", () => {
  const config = read("config.yaml");
  assert.match(config, /- identifier: tools\n\s+name: 工具\n\s+weight: 40/);
  assert.match(config, /identifier: tools-site\n\s+name: 工具站\n\s+url: https:\/\/tools\.estevancyber\.net\/\n\s+parent: tools/);
  assert.match(config, /identifier: tools-vps\n\s+name: VPS 面板\n\s+url: https:\/\/vps\.estevancyber\.net\/\n\s+parent: tools/);
});

test("site header override renders dropdown menus from child entries", () => {
  const header = read("layouts/_partials/header.html");
  assert.match(header, /\.HasChildren/);
  assert.match(header, /menu-dropdown__list/);
  assert.match(header, /range \.Children/);
  const css = read("assets/css/extended/custom.css");
  assert.match(css, /\.menu-dropdown__list/);
});

test("favicon assets exist and are wired into params", () => {
  const config = read("config.yaml");
  for (const file of [
    "static/favicon.svg",
    "static/favicon-16x16.png",
    "static/favicon-32x32.png",
    "static/apple-touch-icon.png",
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should exist`);
  }
  assert.match(config, /favicon: \/favicon\.svg/);
  assert.match(config, /apple_touch_icon: \/apple-touch-icon\.png/);
  assert.match(config, /theme_color: "#147d72"/);
});

test("ask api infra card points at interactive docs", () => {
  const pageData = read("data/projects.yaml");
  assert.match(pageData, /url: https:\/\/api\.estevancyber\.net\/docs/);
});
