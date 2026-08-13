# Curtain Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-viewport, daily rotating local-image curtain hero and move annual progress, tags, and playlist into the first revealed content band.

**Architecture:** Hugo renders one fallback hero image plus processed URL metadata for the complete local gallery. A small testable JavaScript module selects one image deterministically from the visitor's local date, promotes only that image into the `<picture>`, and leaves natural document scrolling intact. The content below the Hero is reorganized into an overview band and a two-column reading area.

**Tech Stack:** Hugo Extended 0.164.0, Go templates, CSS, vanilla JavaScript, Node.js built-in test runner, built-in ImageGen.

---

## File Map

- Create `data/hero-images.yaml`: editable gallery metadata and focal positions.
- Create `assets/js/home-curtain.js`: pure date-selection functions and DOM binding.
- Create `assets/images/home/curtain/*.png`: six local original hero sources.
- Create `layouts/partials/home/overview.html`: overview band composition.
- Create `tests/home-curtain.test.js`: deterministic date and fallback behavior.
- Modify `layouts/partials/home/hero.html`: minimal full-viewport curtain markup.
- Modify `layouts/partials/home/progress.html`: annual progress only.
- Modify `layouts/index.html`: overview-first reveal hierarchy and script pipeline.
- Modify `assets/css/extended/custom.css`: curtain, overview, reading grid, and responsive rules.
- Modify `tests/homepage-contract.test.js`: structural contract for the new hierarchy.

### Task 1: Lock the new homepage contract

**Files:**
- Modify: `tests/homepage-contract.test.js`
- Test: `tests/homepage-contract.test.js`

- [x] **Step 1: Write failing structural tests**

Add assertions that `layouts/index.html` renders `home/overview.html`, includes `id="home-content"`, and loads `js/home-curtain.js`. Assert that the Hero contains `data-curtain-hero`, `data-hero-image`, and a link to `#home-content`. Assert that progress contains only `period: year`.

```js
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
  assert.doesNotMatch(progress, /data-period="day"|data-period="week"|data-period="month"/);
});
```

- [x] **Step 2: Verify the contract fails**

Run: `node --test tests/homepage-contract.test.js`

Expected: FAIL because `home/overview.html`, `home-curtain.js`, and curtain attributes do not exist.

- [x] **Step 3: Keep the test red and commit it**

```powershell
git add tests/homepage-contract.test.js
git commit -m "test: define curtain homepage contract"
```

### Task 2: Implement deterministic daily image selection with TDD

**Files:**
- Create: `tests/home-curtain.test.js`
- Create: `assets/js/home-curtain.js`
- Test: `tests/home-curtain.test.js`

- [x] **Step 1: Write failing unit tests**

Test the wished-for CommonJS API:

```js
const {
  dateKey,
  hashString,
  selectDailyIndex,
  selectDailyImage,
} = require("../assets/js/home-curtain.js");

test("dateKey uses local calendar fields", () => {
  assert.equal(dateKey(new Date(2026, 7, 13, 23, 59)), "2026-08-13");
});

test("hashString is stable", () => {
  assert.equal(hashString("2026-08-13"), hashString("2026-08-13"));
  assert.notEqual(hashString("2026-08-13"), hashString("2026-08-14"));
});

test("selectDailyIndex stays inside the gallery", () => {
  const index = selectDailyIndex(new Date(2026, 7, 13), 6);
  assert.ok(index >= 0 && index < 6);
  assert.equal(index, selectDailyIndex(new Date(2026, 7, 13), 6));
});

test("empty galleries return a safe fallback", () => {
  assert.equal(selectDailyIndex(new Date(2026, 7, 13), 0), -1);
  assert.equal(selectDailyImage([], new Date(2026, 7, 13)), null);
});
```

- [x] **Step 2: Verify tests fail for the missing module**

Run: `node --test tests/home-curtain.test.js`

Expected: FAIL with `MODULE_NOT_FOUND`.

- [x] **Step 3: Implement the minimal pure functions and DOM binder**

Use the existing universal module pattern from `home-progress.js`. The exported API must include the four tested functions and `bindHero`. `bindHero` reads JSON from `[data-hero-gallery]`, selects the current item, writes `src`, `srcset`, `alt`, caption, and category into the one real image element, then adds `is-ready` on image load or immediately when cached.

The first gallery item remains the no-JavaScript fallback. Non-active gallery entries must appear only as JSON metadata and never as additional `<img src>` nodes.

- [x] **Step 4: Verify the new tests and existing tests pass**

Run: `node --test tests/home-curtain.test.js tests/home-progress.test.js tests/home-player.test.js`

Expected: all tests PASS.

- [x] **Step 5: Commit the rotation module**

```powershell
git add tests/home-curtain.test.js assets/js/home-curtain.js
git commit -m "feat: add daily curtain image rotation"
```

### Task 3: Generate and register the local gallery

**Files:**
- Create: `assets/images/home/curtain/dawn-coast.png`
- Create: `assets/images/home/curtain/alpine-lake.png`
- Create: `assets/images/home/curtain/rainy-cinema.png`
- Create: `assets/images/home/curtain/evening-studio.png`
- Create: `assets/images/home/curtain/quiet-portrait.png`
- Create: `assets/images/home/curtain/window-cat.png`
- Create: `data/hero-images.yaml`

- [x] **Step 1: Reuse the existing original studio image**

Copy `assets/images/home/hybrid-studio-hero.png` to `assets/images/home/curtain/evening-studio.png`. It is already an original generated asset and fits the cinematic category.

- [x] **Step 2: Generate five distinct wide images with built-in ImageGen**

Issue one built-in generation call per asset. All prompts require a photorealistic editorial image, 16:9 landscape framing, no text, logo, watermark, trademark, celebrity, recognizable fictional character, or UI. Preserve usable negative space and clear focal subjects for responsive `cover` cropping.

Prompt subjects:

1. `dawn-coast.png`: windswept coast at dawn, sea mist, warm sunlight, natural color.
2. `alpine-lake.png`: quiet alpine lake after rain, reflective water, dramatic clouds, restrained color.
3. `rainy-cinema.png`: original cinematic rainy city street viewed through a cafe window, anonymous silhouettes only.
4. `quiet-portrait.png`: anonymous adult reading beside a large window, face not identity-defining, candid editorial composition.
5. `window-cat.png`: charming domestic cat watching rain from a bright windowsill, realistic fur, calm mood.

- [x] **Step 3: Inspect every generated image**

Use `view_image` for all five outputs. Reject and regenerate any image with garbled text, branded objects, distorted face/paws, poor subject crop, or unusable 16:9 composition.

- [x] **Step 4: Copy approved outputs into the workspace**

Use stable filenames listed above. Do not reference files under `.codex/generated_images` from the site.

- [x] **Step 5: Add gallery metadata**

Create six YAML records with `id`, `src`, `title`, `category`, `alt`, and `position`. Use `position: center`, `center 40%`, or a side-biased focal point only when visual inspection proves it is needed.

- [x] **Step 6: Commit gallery sources and data**

```powershell
git add assets/images/home/curtain data/hero-images.yaml
git commit -m "feat: add daily curtain gallery"
```

### Task 4: Build the curtain and overview templates

**Files:**
- Modify: `layouts/partials/home/hero.html`
- Create: `layouts/partials/home/overview.html`
- Modify: `layouts/partials/home/progress.html`
- Modify: `layouts/index.html`
- Test: `tests/homepage-contract.test.js`

- [x] **Step 1: Render responsive processed image metadata**

In `hero.html`, iterate over `hugo.Data.hero-images`, resolve each global image with `resources.Get`, and create mobile `Fill "900x1200 ... webp q82"` and desktop `Fill "1920x1080 ... webp q84"` resources. Serialize URLs, dimensions, alt, caption, category, and position to a JSON script with `data-hero-gallery`.

Render exactly one `<picture>` and one `<img data-hero-image>`, initialized with the first item as a no-JavaScript fallback. Keep `loading="eager"`, `fetchpriority="high"`, explicit dimensions, and a `<noscript>`-safe result.

- [x] **Step 2: Reduce Hero content**

Keep only the eyebrow, H1, one subtitle, daily image caption, and an accessible down link:

```html
<a class="ec-hero__discover" href="#home-content" aria-label="向下探索首页内容">
  <span>向下探索</span>
  <span aria-hidden="true">↓</span>
</a>
```

- [x] **Step 3: Create the overview partial**

`overview.html` must compose progress, tag cloud, and playlist in that order inside `.ec-overview` with an introductory heading that is visually compact.

- [x] **Step 4: Simplify progress to the annual value**

Render one item with `data-period="year"`, `今年已经走过`, percentage text, and one progress bar.

- [x] **Step 5: Recompose the homepage**

After Hero, render:

```html
<div class="ec-home-curtain" id="home-content">
  {{ partial "home/overview.html" . }}
  <div class="ec-reading-grid">
    {{ partial "home/article-list.html" . }}
    <aside>{{ partial "home/focus.html" . }}</aside>
  </div>
  {{ partial "home/facilities.html" . }}
</div>
```

Add the fingerprinted `home-curtain.js` before the existing progress and player scripts.

- [x] **Step 6: Run the red contract test to green**

Run: `node --test tests/homepage-contract.test.js tests/home-curtain.test.js`

Expected: all tests PASS.

- [x] **Step 7: Build with Hugo and fix template errors**

Run: `.\.tools\hugo\hugo.exe --gc --minify --environment production`

Expected: exit 0; all six sources are processed without a missing resource.

- [x] **Step 8: Commit template composition**

```powershell
git add layouts tests/homepage-contract.test.js
git commit -m "feat: compose curtain homepage reveal"
```

### Task 5: Apply curtain visual design and responsive layout

**Files:**
- Modify: `assets/css/extended/custom.css`

- [x] **Step 1: Implement full-viewport Hero**

Use normal document flow with `min-height: 100vh; min-height: 100svh`. The media fills the Hero with `object-fit: cover` and its data-driven `object-position`. Use one restrained dark overlay for text contrast. Keep content bottom-left, bounded by the existing content width.

- [x] **Step 2: Implement natural reveal**

Give `.ec-home-curtain` a solid page background, `position: relative`, `z-index: 2`, and a subtle top shadow. Do not use fixed Hero positioning, scroll locking, or mandatory snap. Give `#home-content` a correct `scroll-margin-top`.

- [x] **Step 3: Lift and compact overview modules**

Desktop `.ec-overview__grid` uses `0.8fr 1.35fr 1fr`. Remove repeated large card headings and nested surfaces. Use borders and whitespace for structure. Keep the playlist collapsed by default.

- [x] **Step 4: Rebuild reading hierarchy**

Use a `2fr 1fr` reading grid. Preserve compact article rows and render focus as the only sidebar module.

- [x] **Step 5: Add responsive rules**

At 1023px use two overview columns with playlist spanning both. At 719px use one column, stack content, keep the Hero copy readable, and provide a 44px discover control. Protect text and subject crops.

- [x] **Step 6: Respect reduced motion**

Under `prefers-reduced-motion: reduce`, disable smooth scrolling, image fade, arrow movement, and transition effects.

- [x] **Step 7: Commit visual implementation**

```powershell
git add assets/css/extended/custom.css
git commit -m "feat: style natural curtain homepage"
```

### Task 6: Browser QA and polish

**Files:**
- Modify only when a concrete defect is observed: `layouts/partials/home/*.html`, `layouts/index.html`, `assets/css/extended/custom.css`, `assets/js/home-curtain.js`

- [x] **Step 1: Start the local server**

Run: `.\.tools\hugo\hugo.exe server --bind 127.0.0.1 --port 1313 --disableFastRender`

Expected: `http://127.0.0.1:1313/` returns 200.

- [x] **Step 2: Verify desktop at 1440×900**

Check first-screen information density, daily caption, discover link, natural reveal, overview alignment, article/focus hierarchy, light and dark themes, playlist behavior, and console errors.

- [x] **Step 3: Verify tablet at 768×1024**

Check the two-column overview, full-width playlist row, navigation, image crop, and no overflow.

- [x] **Step 4: Verify mobile at 390×844**

Check `svh` behavior, copy wrapping, 44px discover target, one-column overview order, tag wrapping, collapsed playlist, and no overflow.

- [x] **Step 5: Verify daily rotation without loading six images**

In the browser, confirm one real Hero `<img>` exists, the selected metadata matches one YAML record, and only the chosen picture has network-fetchable `src`/`srcset`. Use the pure unit tests to validate date changes rather than altering production time.

- [x] **Step 6: Verify reduced motion**

Emulate `prefers-reduced-motion: reduce` where supported or inspect the matching computed styles. Confirm smooth scrolling and transitions are disabled.

- [x] **Step 7: Fix concrete QA defects and commit**

```powershell
git add layouts assets tests
git commit -m "fix: polish curtain homepage across viewports"
```

Skip the commit only if QA produces no changes.

### Task 7: Final verification and PR update

**Files:**
- Modify: `docs/superpowers/plans/2026-08-13-curtain-homepage.md`

- [x] **Step 1: Run all automated tests**

Run: `node --test tests/*.test.js`

Expected: all tests PASS with zero failures.

- [x] **Step 2: Run the production build**

Run: `.\.tools\hugo\hugo.exe --gc --minify --environment production`

Expected: exit 0 with no missing image or template errors. Existing PaperMod language deprecation warnings may remain.

- [x] **Step 3: Run repository checks**

Run: `git diff --check main..HEAD` and scan changed files for passwords, tokens, private keys, old VPS credentials, and local absolute paths.

Expected: no findings.

- [x] **Step 4: Mark this plan complete and commit the record**

Change all completed checkboxes to `[x]`, then:

```powershell
git add docs/superpowers/plans/2026-08-13-curtain-homepage.md
git commit -m "docs: complete curtain homepage plan"
```

- [x] **Step 5: Push and update PR #4**

Push `codex/hybrid-studio-homepage`, update the draft PR summary with the curtain experience, daily local gallery, verification results, and image provenance. Do not merge or deploy production.
