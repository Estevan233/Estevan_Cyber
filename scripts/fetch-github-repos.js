#!/usr/bin/env node
/**
 * Fetch public GitHub repositories for the projects page.
 *
 * Usage:
 *   node scripts/fetch-github-repos.js            # write data/github_repos.json
 *   GITHUB_USER=foo node scripts/fetch-github-repos.js
 *
 * The committed JSON is the build input, so Hugo builds stay reproducible and
 * never call the network. Re-run this script when you want fresher numbers.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_USER = "Estevan233";
const DATA_PATH = path.join(__dirname, "..", "data", "github_repos.json");

// Repos to keep even if they are forks or lack a description.
const PINNED = ["Eat-What", "Estevan_Cyber", "AI_paper", "jobflow-for-codex"];

// Original repos that should stay hidden from the projects page.
const BLOCKLIST = new Set([]);

const MAX_REPOS = 12;

/** Convert a GitHub API repo payload into the card shape used by the theme. */
function toCard(repo) {
  return {
    name: repo.name,
    description: typeof repo.description === "string" ? repo.description.trim() : "",
    html_url: repo.html_url,
    homepage: typeof repo.homepage === "string" && repo.homepage ? repo.homepage : "",
    language: repo.language || "",
    stargazers_count: Number(repo.stargazers_count) || 0,
    forks_count: Number(repo.forks_count) || 0,
    pushed_at: repo.pushed_at,
    topics: Array.isArray(repo.topics) ? repo.topics.slice(0, 4) : [],
    archived: Boolean(repo.archived),
    fork: Boolean(repo.fork),
  };
}

/**
 * Pure selection: pinned first (in PINNED order), then original,
 * described, non-blocklisted repos by last push, newest first.
 */
function selectRepos(repos, { pinned = PINNED, blocklist = BLOCKLIST, limit = MAX_REPOS } = {}) {
  const keep = repos.filter((repo) => {
    if (pinned.includes(repo.name)) return true;
    if (repo.fork || repo.archived) return false;
    if (blocklist.has(repo.name)) return false;
    return Boolean(repo.description && repo.description.trim());
  });

  const pinnedSet = new Map(pinned.map((name, index) => [name, index]));
  keep.sort((a, b) => {
    const pa = pinnedSet.has(a.name) ? pinnedSet.get(a.name) : pinned.length;
    const pb = pinnedSet.has(b.name) ? pinnedSet.get(b.name) : pinned.length;
    if (pa !== pb) return pa - pb;
    return String(b.pushed_at).localeCompare(String(a.pushed_at));
  });

  return keep.slice(0, limit).map(toCard);
}

async function fetchAllRepos(user) {
  const repos = [];
  let page = 1;
  for (;;) {
    const url = `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed&page=${page}`;
    const response = await fetch(url, {
      headers: { accept: "application/vnd.github+json", "user-agent": "estevancyber-site-sync" },
    });
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status} for ${url}`);
    }
    const batch = await response.json();
    repos.push(...batch);
    if (batch.length < 100 || page >= 5) break;
    page += 1;
  }
  return repos;
}

async function main() {
  const user = process.env.GITHUB_USER || DEFAULT_USER;
  const repos = await fetchAllRepos(user);
  const selected = selectRepos(repos);
  const payload = {
    fetched_at: new Date().toISOString(),
    source: `https://github.com/${user}?tab=repositories`,
    repos: selected,
  };
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`wrote ${DATA_PATH} with ${selected.length} repos\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

module.exports = { selectRepos, toCard, PINNED, MAX_REPOS };
