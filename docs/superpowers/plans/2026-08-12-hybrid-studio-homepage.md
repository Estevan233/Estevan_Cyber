# Hybrid Studio Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dark, tool-like homepage with an accessible light-first “Hybrid Studio” homepage containing a warm photographic hero, latest posts, manually maintained focus items, local-time progress, a Hugo tag cloud, and a three-track self-hosted CC0 playlist.

**Architecture:** Keep Hugo and PaperMod intact. The homepage remains a single `layouts/index.html` composition assembled from focused `layouts/partials/home/*` partials; editable content lives in Hugo data files, time and audio behavior live in two dependency-free browser scripts, and all visual rules remain in the existing extended stylesheet. Media is local and license provenance is committed beside it.

**Tech Stack:** Hugo Extended, PaperMod, Go templates, YAML data, modern CSS, vanilla JavaScript, Node built-in test runner, CC0 OGG/MP3 media.

---

## File Map

- `layouts/index.html`: compose the homepage and fingerprint its two scripts.
- `layouts/partials/home/hero.html`: responsive generated hero image and calls to action.
- `layouts/partials/home/article-list.html`: latest five posts and optional bundle covers.
- `layouts/partials/home/focus.html`: render manual focus records defensively.
- `layouts/partials/home/progress.html`: accessible progress markup with no-JS fallback.
- `layouts/partials/home/tag-cloud.html`: top 18 Hugo tags in three visual weights.
- `layouts/partials/home/playlist.html`: collapsed audio UI and track metadata.
- `layouts/partials/home/facilities.html`: compact links to existing site capabilities.
- `data/focus.yaml`: user-maintained focus items.
- `data/playlist.yaml`: user-maintained track metadata and local paths.
- `assets/js/home-progress.js`: pure date calculations plus DOM binding.
- `assets/js/home-player.js`: playlist state helpers plus DOM/audio binding.
- `assets/css/extended/custom.css`: light-first tokens and responsive homepage styles.
- `assets/images/home/hybrid-studio-hero.png`: generated source bitmap.
- `static/media/music/*`: three CC0 audio files.
- `THIRD_PARTY_NOTICES.md`: source and license provenance.
- `tests/home-progress.test.js`: deterministic calendar progress tests.
- `tests/home-player.test.js`: deterministic playlist index tests.
- `tests/homepage-contract.test.js`: repository-level homepage/data/license contract checks.
- `config.yaml`: force a light default while retaining manual dark mode.

### Task 1: Establish the build and contract baseline

**Files:**
- Modify: `.gitignore`
- Create: `tests/homepage-contract.test.js`

- [ ] **Step 1: Initialize the PaperMod submodule at the commit pinned by the repository**

Run:

```powershell
git submodule update --init --recursive
```

Expected: `themes/PaperMod/layouts` exists and `git status --short` remains clean apart from planned files.

- [ ] **Step 2: Add local build outputs to `.gitignore`**

Append:

```gitignore
.tools/
public/
resources/_gen/
```

- [ ] **Step 3: Write the initial failing homepage contract test**

Create `tests/homepage-contract.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("homepage is composed from focused partials", () => {
  const homepage = read("layouts/index.html");
  for (const name of ["hero", "article-list", "focus", "progress", "tag-cloud", "playlist", "facilities"]) {
    assert.match(homepage, new RegExp(`partial \\"home/${name}\\.html\\"`));
  }
});

test("homepage data and third-party notices exist", () => {
  for (const file of ["data/focus.yaml", "data/playlist.yaml", "THIRD_PARTY_NOTICES.md"]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should exist`);
  }
});

test("default theme is light", () => {
  assert.match(read("config.yaml"), /defaultTheme:\\s*light/);
});
```

- [ ] **Step 4: Run the test and confirm it fails for the missing implementation**

Run: `node --test tests/homepage-contract.test.js`  
Expected: FAIL because the new partials, data files, and notices do not exist.

- [ ] **Step 5: Commit the baseline test**

```powershell
git add .gitignore tests/homepage-contract.test.js
git commit -m "test: define hybrid homepage contract"
```

### Task 2: Add editable homepage data and defensive partials

**Files:**
- Create: `data/focus.yaml`
- Create: `data/playlist.yaml`
- Create: `layouts/partials/home/focus.html`
- Create: `layouts/partials/home/playlist.html`

- [ ] **Step 1: Add three manually maintained focus records**

Create `data/focus.yaml`:

```yaml
- title: 个人网站体验升级
  summary: 让技术内容更好读，也让首页更像一个有人长期维护的空间。
  status: 进行中
  url: /projects/
- title: Knowledge Agent 检索质量
  summary: 继续检查站内问答的召回、来源引用和失败回退。
  status: 观察中
  url: /ask/
- title: Oracle Cloud 稳定性观察
  summary: 记录迁移后的资源占用、网络和容器运行情况。
  status: 待整理
  url: /posts/digitalocean-to-oracle-cloud-migration/
```

- [ ] **Step 2: Add local playlist metadata**

Create `data/playlist.yaml`:

```yaml
- title: Calm Theme
  artist: pebonius
  src: /media/music/calm-theme.ogg
  source: https://opengameart.org/content/calm-theme
  license: CC0 1.0
- title: Contemplation
  artist: Joth
  src: /media/music/contemplation.mp3
  source: https://opengameart.org/content/contemplation-0
  license: CC0 1.0
- title: Chill Lofi Inspired
  artist: omfgdude
  src: /media/music/chill-lofi-inspired.mp3
  source: https://opengameart.org/content/chill-lofi-inspired
  license: CC0 1.0
```

- [ ] **Step 3: Render focus data only when it exists**

Create `layouts/partials/home/focus.html` with a `with site.Data.focus` guard, a section heading, and linked focus rows containing `.title`, `.summary`, and `.status`. Do not render raw HTML from YAML.

- [ ] **Step 4: Render a collapsed playlist with native audio fallback**

Create `layouts/partials/home/playlist.html` with a `with site.Data.playlist` guard, a closed `<details class="ec-playlist">`, previous/next buttons, track buttons carrying `data-src`, and `<audio controls preload="metadata">`. Native controls satisfy play/pause, seek, and volume; JavaScript only handles track selection.

- [ ] **Step 5: Commit the data layer**

```powershell
git add data layouts/partials/home/focus.html layouts/partials/home/playlist.html
git commit -m "feat: add editable homepage focus and playlist data"
```

### Task 3: Build the homepage composition and content partials

**Files:**
- Modify: `layouts/index.html`
- Create: `layouts/partials/home/hero.html`
- Create: `layouts/partials/home/article-list.html`
- Create: `layouts/partials/home/progress.html`
- Create: `layouts/partials/home/tag-cloud.html`
- Create: `layouts/partials/home/facilities.html`

- [ ] **Step 1: Replace the monolithic homepage with partial composition**

`layouts/index.html` must define `main`, render `hero`, a two-column `ec-home-grid` containing `article-list` and a sidebar with `focus`, `progress`, `tag-cloud`, and `playlist`, then render `facilities`. At the end, load `js/home-progress.js` and `js/home-player.js` with Hugo `resources.Get | minify | fingerprint` and `defer`.

- [ ] **Step 2: Add the full-width Hero**

Render `assets/images/home/hybrid-studio-hero.png` through Hugo image processing into 900px and 1800px WebP candidates. Place the responsive `<picture>` absolutely behind the text, include fixed width/height, `fetchpriority="high"`, and the approved title, supporting copy, and three links.

- [ ] **Step 3: Add the latest-five article list**

Range over `first 5 (where site.RegularPages "Section" "posts")`. Render title, summary, date, reading time, and the first two tags. Resolve `.Params.cover.image` from page resources when present; omit the media element when absent.

- [ ] **Step 4: Add accessible progress markup**

Render four progress rows with `data-period="day|week|month|year"`, a text percentage, and a native `<progress max="100" value="0">`. Include `<noscript>启用 JavaScript 后显示本地时间进度。</noscript>`.

- [ ] **Step 5: Add a bounded Hugo tag cloud**

Range over `first 18 site.Taxonomies.tags.ByCount`; map counts to `ec-tag--small`, `ec-tag--medium`, or `ec-tag--large`, and use each taxonomy page’s `.RelPermalink`.

- [ ] **Step 6: Add the compact facilities band**

Render four links for Hugo + PaperMod, Knowledge Agent, Tools, and VPS Lab. Use text and existing routes only; do not manufacture illustration assets.

- [ ] **Step 7: Run the contract test**

Run: `node --test tests/homepage-contract.test.js`  
Expected: the partial-composition assertions pass; notices and light-theme assertions still fail until later tasks.

- [ ] **Step 8: Commit the template composition**

```powershell
git add layouts
git commit -m "feat: compose hybrid studio homepage"
```

### Task 4: Implement and test local-time progress

**Files:**
- Create: `assets/js/home-progress.js`
- Create: `tests/home-progress.test.js`

- [ ] **Step 1: Write deterministic date tests**

Test exact boundaries, midpoint behavior, Monday-based weeks, leap-year February, and clamping to `0..100` using Node’s built-in test runner. Example assertion:

```js
assert.equal(periodProgress("year", new Date(2024, 6, 2, 0, 0, 0)), 50);
```

- [ ] **Step 2: Run tests and confirm the module is missing**

Run: `node --test tests/home-progress.test.js`  
Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement pure calendar calculations and DOM binding**

Export `periodProgress(period, now)` under CommonJS for tests. In browsers, find `[data-period]` rows, set native progress values and percentage text, run immediately, and refresh every 60 seconds. Week boundaries are Monday 00:00 through the next Monday.

- [ ] **Step 4: Run progress tests**

Run: `node --test tests/home-progress.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit progress behavior**

```powershell
git add assets/js/home-progress.js tests/home-progress.test.js
git commit -m "feat: add local time progress"
```

### Task 5: Implement and test playlist selection

**Files:**
- Create: `assets/js/home-player.js`
- Create: `tests/home-player.test.js`

- [ ] **Step 1: Write pure playlist-index tests**

Test `normalizeIndex(index, length)`, `nextIndex`, and `previousIndex`, including empty playlists and wraparound.

- [ ] **Step 2: Run tests and confirm the module is missing**

Run: `node --test tests/home-player.test.js`  
Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement state helpers and DOM/audio binding**

On track selection, pause, replace `audio.src`, call `load()`, update the active row and now-playing label, and only call `play()` when selection originated from an explicit play request. Previous and next controls wrap around. Catch rejected play promises and expose a readable status without throwing.

- [ ] **Step 4: Run player tests**

Run: `node --test tests/home-player.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit player behavior**

```powershell
git add assets/js/home-player.js tests/home-player.test.js
git commit -m "feat: add homepage playlist controls"
```

### Task 6: Add verified CC0 media and provenance

**Files:**
- Create: `static/media/music/calm-theme.ogg`
- Create: `static/media/music/contemplation.mp3`
- Create: `static/media/music/chill-lofi-inspired.mp3`
- Create: `THIRD_PARTY_NOTICES.md`

- [ ] **Step 1: Download only the files linked by the three OpenGameArt source pages**

Use the OGG/MP3 links shown on the corresponding pages. Reject a response unless its MIME type begins with `audio/` and its size matches the source page within a reasonable margin.

- [ ] **Step 2: Record SHA-256 hashes and license provenance**

`THIRD_PARTY_NOTICES.md` must list title, author, source page, local file, SHA-256, download date `2026-08-12`, and `CC0 1.0` link for each track.

- [ ] **Step 3: Verify media and total repository cost**

Run:

```powershell
Get-FileHash static/media/music/* -Algorithm SHA256
(Get-ChildItem static/media/music/* | Measure-Object Length -Sum).Sum
```

Expected: three non-empty files and a combined size below 10 MB.

- [ ] **Step 4: Commit audio and notices**

```powershell
git add static/media/music THIRD_PARTY_NOTICES.md
git commit -m "chore: add CC0 homepage music"
```

### Task 7: Generate the Hero and implement the approved visual system

**Files:**
- Create: `assets/images/home/hybrid-studio-hero.png`
- Modify: `assets/css/extended/custom.css`
- Modify: `config.yaml`

- [ ] **Step 1: Generate the real Hero bitmap**

Art direction: photorealistic wide editorial photograph of a cozy modern home-office desk at blue hour; warm amber lamp, laptop with a blurred non-readable interface, notebook, books and a small plant; indigo window view; generous negative space on the left for the headline; objects concentrated on the right; no people, logos, readable text, hacker imagery, neon or gradients.

- [ ] **Step 2: Change the default theme**

Set:

```yaml
params:
  defaultTheme: light
```

Keep the existing manual PaperMod theme toggle.

- [ ] **Step 3: Replace the global grid-heavy styling with light-first tokens**

Use off-white page background, white surfaces, near-black text, muted slate, restrained teal, and a small amber accent. Remove the fixed body grid and cyber glow. Keep the existing ask-page selectors working.

- [ ] **Step 4: Style the full homepage hierarchy**

Implement the full-bleed Hero, readable overlay, 2fr/1fr desktop grid, compact post rows, non-nested sidebar modules, bounded tag sizes, native audio controls, facilities band, and visible keyboard focus. Radius stays at or below 8px.

- [ ] **Step 5: Add responsive and motion rules**

At 900px collapse the main grid; at 720px stack navigation-adjacent homepage controls, preserve text wrapping, and keep 44px touch targets. Disable transitions under `prefers-reduced-motion: reduce`.

- [ ] **Step 6: Run all contract and unit tests**

Run: `node --test tests/*.test.js`  
Expected: PASS.

- [ ] **Step 7: Commit the visual implementation**

```powershell
git add assets config.yaml tests/homepage-contract.test.js
git commit -m "feat: apply adaptive evening homepage design"
```

### Task 8: Build, inspect, fix, and publish the review branch

**Files:**
- Verify and, when a concrete QA defect is found, modify only: `layouts/index.html`, `layouts/partials/home/*.html`, `assets/css/extended/custom.css`, `assets/js/home-progress.js`, or `assets/js/home-player.js`

- [ ] **Step 1: Build the production site**

Run: `hugo --gc --minify --environment production`  
Expected: exit 0 with no template or missing-resource errors.

- [ ] **Step 2: Run a local Hugo server**

Run: `hugo server --bind 127.0.0.1 --port 1313 --disableFastRender`  
Expected: homepage is available at `http://127.0.0.1:1313/`.

- [ ] **Step 3: Verify desktop and mobile in the user’s in-app browser**

Capture 1440×900 and 390×844. Check layout, image crop, light/dark themes, navigation, article links, tag links, progress values, collapsed player, track switching, no autoplay, keyboard focus, and horizontal overflow.

- [ ] **Step 4: Compare source, approved concept, and implementation together**

Inspect the current production screenshot, approved D3 concept, and implementation screenshots in one visual comparison. Fix concrete mismatches in hierarchy, spacing, crop, contrast, radius, wrapping, or control overlap, then capture again.

- [ ] **Step 5: Run final verification**

```powershell
node --test tests/*.test.js
hugo --gc --minify --environment production
git diff --check
git status --short
```

Also search tracked source for passwords, tokens, private keys, and local absolute paths.

- [ ] **Step 6: Commit QA fixes, push the branch, and open a review PR**

```powershell
git add layouts assets data config.yaml tests THIRD_PARTY_NOTICES.md static/media/music
git commit -m "fix: polish hybrid homepage across viewports"
git push -u origin codex/hybrid-studio-homepage
```

Open a PR against `main` summarizing the visual change, behavior, licenses, and verification results. Do not merge or deploy production in this task.
