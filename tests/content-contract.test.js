const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const articleRoot = path.join(
  root,
  "content",
  "posts",
  "curtain-homepage-design-and-deployment",
);

test("curtain homepage tutorial is complete and publishable", () => {
  const articlePath = path.join(articleRoot, "index.md");
  assert.equal(fs.existsSync(articlePath), true, "tutorial article should exist");

  const article = fs.readFileSync(articlePath, "utf8");
  assert.match(article, /title:\s*["']从毛坯首页到幕布式个人网站：设计、实现与自动部署["']/);
  assert.match(article, /draft:\s*false/);

  for (const heading of [
    "设计目标",
    "渐进式披露",
    "技术栈与页面架构",
    "每日轮换的首屏图像",
    "四类时间进度",
    "歌单、标签与内容入口",
    "响应式与无障碍",
    "测试与质量检查",
    "从手工发布到 GitHub Actions",
    "回滚策略",
    "我的学习路线",
  ]) {
    assert.match(article, new RegExp(`## .*${heading}`), `${heading} should exist`);
  }

  for (const source of [
    "gohugo.io/content-management/image-processing",
    "docs.github.com/en/actions",
    "developers.cloudflare.com",
    "w3.org/WAI/WCAG22",
  ]) {
    assert.match(article, new RegExp(source.replaceAll("/", "\\/")));
  }

  assert.doesNotMatch(article, /161\.33\.39\.102|165\.227\.180\.152|217\.142\.229\.240/);
  assert.doesNotMatch(article, /C:\\Users|PRIVATE KEY|VPS_SSH_KEY:\s*\S+/i);
});

test("curtain homepage tutorial ships its visual assets", () => {
  for (const asset of [
    "curtain-homepage-desktop.png",
    "curtain-homepage-mobile.png",
    "homepage-architecture.svg",
    "deployment-pipeline.svg",
  ]) {
    const assetPath = path.join(articleRoot, asset);
    assert.equal(fs.existsSync(assetPath), true, `${asset} should exist`);
    assert.ok(fs.statSync(assetPath).size > 500, `${asset} should not be empty`);
  }
});
