const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const children = [
  {
    identifier: "tools-ask",
    name: "问答",
    url: "/ask/",
    icon: "ask",
    desc: "站内知识问答，快速找到答案",
  },
  {
    identifier: "tools-search",
    name: "站内搜索",
    url: "/search/",
    icon: "search",
    desc: "全文检索站内文章与笔记",
  },
  {
    identifier: "tools-site",
    name: "工具站",
    url: "https://tools.estevancyber.net/",
    icon: "tools",
    desc: "音乐解锁等自托管小工具集合",
  },
  {
    identifier: "tools-vps",
    name: "VPS 面板",
    url: "https://vps.estevancyber.net/",
    icon: "vps",
    desc: "服务器负载与容器状态监控",
  },
  {
    identifier: "tools-api",
    name: "API 文档",
    url: "https://api.estevancyber.net/docs",
    icon: "api",
    desc: "问答服务的交互式接口文档",
  },
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("tools dropdown children stay data-driven with desc and icon params", () => {
  const config = read("config.yaml");
  assert.match(config, /- identifier: tools\n\s+name: 工具\n\s+weight: 40/);
  for (const child of children) {
    const block = new RegExp(
      `- identifier: ${escapeRegExp(child.identifier)}\\n` +
        `\\s+name: ${escapeRegExp(child.name)}\\n` +
        `\\s+url: ${escapeRegExp(child.url)}\\n` +
        `\\s+parent: tools[\\s\\S]*?params:\\n` +
        `\\s+desc: ${escapeRegExp(child.desc)}\\n` +
        `\\s+icon: ${escapeRegExp(child.icon)}`
    );
    assert.match(config, block, `${child.identifier} should carry parent plus desc/icon params`);
  }
});

test("tools panel renders a flat list of all items (no group headings or separator)", () => {
  const header = read("layouts/_partials/header.html");
  assert.match(header, /range \.Children/);
  // Must NOT contain group titles or separator
  assert.doesNotMatch(header, /menu-dropdown__group-title/);
  assert.doesNotMatch(header, /menu-dropdown__sep/);
  assert.doesNotMatch(header, /站内工具/);
  assert.doesNotMatch(header, /外部服务/);
  // Single flat list
  assert.match(header, /menu-dropdown__list/);
  // External filter still determines target=_blank
  assert.ok(header.includes('if $isExternal'), "external flag should exist");
});

test("tools panel items render title plus one-line description", () => {
  const header = read("layouts/_partials/header.html");
  assert.match(header, /\.Params\.desc/);
  assert.match(header, /menu-dropdown__desc/);
  assert.match(header, /menu-dropdown__text/);
  assert.match(header, /menu-dropdown__name/);
});

test("tools panel ships a named icon set with one icon per item", () => {
  const header = read("layouts/_partials/header.html");
  assert.match(header, /\.Params\.icon/);
  assert.match(header, /menu-dropdown__icon/);
  for (const child of children) {
    assert.match(header, new RegExp(`id="ec-icon-${child.icon}"`), `${child.icon} symbol should exist`);
  }
});

test("tools dropdown is keyboard reachable with aria state", () => {
  const header = read("layouts/_partials/header.html");
  assert.match(header, /aria-haspopup="true"/);
  assert.match(header, /aria-expanded="false"/);
  assert.match(header, /<summary[^>]*class="menu-dropdown__summary"/);
  assert.match(header, /<details[^>]*class="menu-dropdown__details"/);
});

test("external tool items keep the outbound affordance and safe rel", () => {
  const header = read("layouts/_partials/header.html");
  assert.match(header, /target="_blank" rel="noopener"/);
  assert.match(header, /menu-dropdown__external/);
});

test("tools dropdown keeps click-outside and Escape close with aria sync", () => {
  const header = read("layouts/_partials/header.html");
  assert.match(header, /document\.addEventListener\("click"/);
  assert.match(header, /document\.addEventListener\("keydown"/);
  assert.match(header, /Escape/);
  assert.match(header, /aria-expanded/);
  assert.match(header, /addEventListener\("toggle"/);
});

test("tools panel uses fixed positioning to escape overflow, with scroll close", () => {
  const header = read("layouts/_partials/header.html");
  assert.match(header, /positionPanel/);
  assert.match(header, /getBoundingClientRect/);
  assert.match(header, /addEventListener\("scroll"/);
});

test("tools panel styling uses brand tokens with motion and mobile guards", () => {
  const css = read("assets/css/extended/custom.css");
  assert.match(css, /\.menu-dropdown__panel/);
  assert.match(css, /var\(--ec-surface\)/);
  assert.match(css, /var\(--ec-shadow\)/);
  assert.match(css, /var\(--ec-border\)/);
  assert.match(css, /border-radius: 10px/);
  assert.match(css, /menu-dropdown-in 120ms ease/);
  assert.match(css, /max-width: min\(320px, calc\(100vw - 24px\)\)/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.menu-dropdown__panel/);
  assert.match(css, /\.menu-dropdown__item:hover/);
  assert.match(css, /\.menu-dropdown__item:focus-visible/);
  // Click-to-open only: hover must not force the panel open.
  assert.doesNotMatch(css, /\.menu-dropdown:hover \.menu-dropdown__panel/);
  // Panel must use position:fixed (escape overflow)
  assert.match(css, /position: fixed/);
});
