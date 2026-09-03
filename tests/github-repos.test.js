const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const { selectRepos } = require(path.join(root, "scripts", "fetch-github-repos.js"));

const repo = (overrides = {}) => ({
  name: "demo",
  description: " A demo repo ",
  html_url: "https://github.com/user/demo",
  homepage: "",
  language: "Python",
  stargazers_count: 3,
  forks_count: 1,
  pushed_at: "2026-09-01T00:00:00Z",
  topics: ["a", "b"],
  archived: false,
  fork: false,
  ...overrides,
});

test("selection drops forks, archived, blocklisted and undescribed repos", () => {
  const picked = selectRepos([
    repo({ name: "keep-me" }),
    repo({ name: "a-fork", fork: true }),
    repo({ name: "archived-one", archived: true }),
    repo({ name: "blocked", description: "has text" }),
    repo({ name: "no-desc", description: null }),
  ], { blocklist: new Set(["blocked"]) });

  assert.deepEqual(picked.map((item) => item.name), ["keep-me"]);
});

test("pinned repos come first in pinned order even without description", () => {
  const picked = selectRepos([
    repo({ name: "zzz-regular", pushed_at: "2026-09-02T00:00:00Z" }),
    repo({ name: "Pinned2", description: "", fork: true }),
    repo({ name: "Pinned1", description: null, fork: true }),
  ], { pinned: ["Pinned1", "Pinned2"] });

  assert.deepEqual(picked.map((item) => item.name), ["Pinned1", "Pinned2", "zzz-regular"]);
});

test("cards only expose the fields the theme renders", () => {
  const [card] = selectRepos([repo({ name: "demo" })]);
  assert.deepEqual(Object.keys(card).sort(), [
    "archived",
    "description",
    "fork",
    "forks_count",
    "homepage",
    "html_url",
    "language",
    "name",
    "pushed_at",
    "stargazers_count",
    "topics",
  ]);
  assert.equal(card.description, "A demo repo");
});

test("committed data stays renderable", () => {
  const file = path.join(root, "data", "github_repos.json");
  assert.equal(fs.existsSync(file), true, "data/github_repos.json should be committed");

  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(typeof payload.fetched_at, "string");
  assert.ok(Array.isArray(payload.repos) && payload.repos.length > 0);

  for (const item of payload.repos) {
    assert.match(item.name, /^[\w.-]+$/);
    assert.match(item.html_url, /^https:\/\/github\.com\//);
    assert.equal(typeof item.description, "string");
    assert.match(item.pushed_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(Array.isArray(item.topics));
  }
});

test("projects layout renders the github card grid and infra entries", () => {
  const layout = fs.readFileSync(path.join(root, "layouts", "_default", "projects.html"), "utf8");
  assert.match(layout, /Site\.Data\.github_repos/);
  assert.match(layout, /ec-project-card/);

  const pageData = fs.readFileSync(path.join(root, "data", "projects.yaml"), "utf8");
  assert.match(pageData, /vps\.estevancyber\.net/);
  assert.match(pageData, /tools\.estevancyber\.net/);
  assert.match(pageData, /url: \/ask\//);
});
