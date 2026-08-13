const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const readme = fs.readFileSync(path.resolve(__dirname, "..", "README.md"), "utf8");

test("README identifies the site and covers its operating workflow", () => {
  assert.match(readme, /^# Estevan Cyber/m);

  for (const heading of [
    "在线站点",
    "功能",
    "架构",
    "技术栈",
    "项目结构",
    "本地开发",
    "写作与内容维护",
    "测试与构建",
    "自动部署",
    "安全",
  ]) {
    assert.match(readme, new RegExp(`^## ${heading}`, "m"), `${heading} should exist`);
  }
});

test("README contains reproducible commands and deployment settings", () => {
  for (const marker of [
    "git clone --recurse-submodules",
    "hugo server",
    "node --test tests/*.test.js",
    "hugo --gc --minify",
    "ENABLE_VPS_DEPLOY",
    "VPS_SSH_KEY",
    "VPS_HOST_KEY",
    "production",
    "content/posts/",
    "data/playlist.yaml",
    "THIRD_PARTY_NOTICES.md",
  ]) {
    assert.ok(readme.includes(marker), `${marker} should be documented`);
  }

  assert.doesNotMatch(readme, /161\.33\.39\.102|PRIVATE KEY|9368-dac/i);
});
