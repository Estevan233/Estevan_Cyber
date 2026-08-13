# Progress, Tutorial, and CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the homepage time progress module, publish a learning-oriented implementation article, document the repository, and replace manual production publishing with a guarded GitHub Actions pipeline.

**Architecture:** Keep Hugo as the single source of truth and build the static artifact once in CI. Deployment copies that exact artifact to an isolated directory on the Oracle VPS, validates it, creates a rollback archive, atomically replaces `/var/www/blog`, and probes Nginx before accepting the release.

**Tech Stack:** Hugo Extended 0.164.0, vanilla JavaScript, Node.js test runner, GitHub Actions, SSH, rsync, Bash, Nginx, Cloudflare.

---

## Task 1: Render four local-time progress periods

**Files:**
- Modify: `tests/homepage-contract.test.js`
- Modify: `layouts/partials/home/progress.html`
- Modify: `assets/css/extended/custom.css`
- Verify: `tests/home-progress.test.js`

- [ ] Change the homepage contract to require `day`, `week`, `month`, and `year` in that order.
- [ ] Run `node --test tests/homepage-contract.test.js` and confirm the new assertion fails.
- [ ] Render 今天、本周、本月、今年 with native `<progress>` elements and explicit accessible labels.
- [ ] Add a two-column desktop layout and one-column mobile layout without changing the calculation API.
- [ ] Run `node --test tests/homepage-contract.test.js tests/home-progress.test.js` and confirm both pass.

## Task 2: Publish the design and deployment tutorial

**Files:**
- Create: `tests/content-contract.test.js`
- Create: `content/posts/curtain-homepage-design-and-deployment/index.md`
- Create: `content/posts/curtain-homepage-design-and-deployment/homepage-architecture.svg`
- Create: `content/posts/curtain-homepage-design-and-deployment/deployment-pipeline.svg`
- Copy: `.tools/prod-desktop.png` to the article bundle
- Copy: `.tools/prod-mobile-expanded.png` to the article bundle

- [ ] Write a failing content contract for the article metadata, required learning sections, and four local assets.
- [ ] Run `node --test tests/content-contract.test.js` and confirm it fails because the bundle does not exist.
- [ ] Add sanitized desktop and mobile screenshots with no origin IP or private paths.
- [ ] Draw an architecture diagram and an artifact-to-production deployment diagram.
- [ ] Write the Chinese tutorial covering design intent, progressive disclosure, Hugo resources, JavaScript calculations, accessibility, tests, deployment, rollback, and a learning path.
- [ ] Cite primary documentation for Hugo, GitHub Actions, Cloudflare, and WCAG claims.
- [ ] Run the content contract and a production Hugo build.

## Task 3: Turn README into an operating guide

**Files:**
- Create: `tests/readme-contract.test.js`
- Modify: `README.md`

- [ ] Write a failing README contract for project identity, architecture, local development, writing, testing, deployment, and security sections.
- [ ] Replace the placeholder README with a concise repository guide and Mermaid architecture diagram.
- [ ] Document how to create a page bundle, update homepage data, run tests, build production output, and configure the production environment.
- [ ] Run `node --test tests/readme-contract.test.js`.

## Task 4: Add guarded GitHub Actions deployment

**Files:**
- Create: `tests/deployment-contract.test.js`
- Create: `.github/workflows/site.yml`
- Create: `scripts/deploy-site.sh`
- Create or modify: `.gitattributes`

- [ ] Write a failing deployment contract for verification, artifacts, protected environment, explicit enable flag, concurrency, staging, backup, probes, and rollback.
- [ ] Pin official GitHub actions to immutable commit SHAs.
- [ ] Build and test on pull requests, `main` pushes, and manual dispatches.
- [ ] Upload `public/` once and deploy the downloaded artifact only when `ENABLE_VPS_DEPLOY=true`.
- [ ] Add a remote deployment script that rejects unsafe paths and malformed SHAs, validates markers, archives the active release, swaps directories, probes Nginx, and rolls back on failure.
- [ ] Enforce LF line endings for shell scripts.
- [ ] Run `node --test tests/deployment-contract.test.js` and `bash -n scripts/deploy-site.sh`.

## Task 5: Verify responsive behavior and production output

**Files:**
- Verify: generated `public/`
- Capture: local browser screenshots as QA evidence

- [ ] Run the complete Node test suite.
- [ ] Run `hugo --gc --minify --environment production --cleanDestinationDir`.
- [ ] Check generated homepage and article markers.
- [ ] Inspect homepage progress and tutorial article at desktop and mobile widths.
- [ ] Confirm no horizontal overflow, clipped controls, missing images, or console errors.

## Task 6: Review, merge, and deploy the exact release

**Files:**
- Update: Git history and GitHub pull request
- Deploy: built `public/` artifact to the Oracle VPS

- [ ] Review the branch diff for secrets, real origin IPs, unrelated changes, and generated `public/` files.
- [ ] Commit the implementation and push `codex/progress-blog-cicd`.
- [ ] Open a pull request and require the verification job to pass.
- [ ] Merge the pull request and synchronize local `main`.
- [ ] Package the merged production build, upload it to an isolated VPS path, and execute `scripts/deploy-site.sh`.
- [ ] Verify homepage, tutorial, tools, API health, Nginx, and existing containers without changing other ports.
- [ ] Leave automatic deployment disabled until the GitHub `production` environment, variables, and SSH key secret are configured.
