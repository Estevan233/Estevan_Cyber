# Homepage Progress, Tutorial, README, and CI/CD Design

## 1. Goal

Turn the latest homepage work into something that is both richer for visitors and understandable to its owner:

1. Restore four concrete local-time progress indicators: today, this week, this month, and this year.
2. Publish a tutorial article that explains the design decisions, implementation, validation, and deployment architecture.
3. Replace the minimal repository README with a useful project entry point.
4. Add an opt-in GitHub Actions pipeline that verifies every change and can deploy `main` to the existing Oracle/Nginx origin.

The existing Oracle VPS, Nginx routes, Cloudflare DNS, Knowledge Agent, tools site, Beszel, and proxy services remain unchanged.

## 2. Homepage Progress

### Information model

The progress module renders four rows in this fixed order:

| Period | Label | Boundary |
| --- | --- | --- |
| `day` | 今天 | Local midnight to next local midnight |
| `week` | 本周 | Monday 00:00 to next Monday 00:00 |
| `month` | 本月 | First day of the local month to first day of next month |
| `year` | 今年 | January 1 to January 1 of next year |

The existing `home-progress.js` already computes all four periods and refreshes once per minute. This change restores the missing template rows rather than inventing a second time algorithm.

### Layout

- Desktop: compact `2 x 2` grid inside the first overview band.
- Mobile: one column with all four labels, values, and native progress bars visible.
- The section title becomes `时间进度`, not `年度进度`.
- Each bar retains an exact accessible `aria-label`.
- JavaScript-disabled visitors continue to receive the existing explanatory fallback.

The module should feel informative but restrained. Four giant percentages would turn a useful glance into a train-station departure board, so percentage type is smaller than the previous year-only treatment.

## 3. Tutorial Article

### Article identity

- Bundle: `content/posts/curtain-homepage-design-and-deployment/`
- Title: `从毛坯首页到幕布式个人网站：设计、实现与自动部署`
- Status: published, not draft.
- Audience: the site owner and readers learning Hugo/front-end/deployment fundamentals.

### Required sections

1. Why the homepage needed redesigning.
2. Progressive disclosure and the curtain interaction.
3. Visual direction: light-first editorial layout instead of a stereotypical hacker dashboard.
4. Technical stack and responsibility boundaries.
5. Deterministic daily local image selection.
6. Responsive Hugo image processing and focal cropping.
7. Today/week/month/year progress calculations.
8. Self-hosted playlist behavior and licensing.
9. Responsive and accessibility decisions, including reduced motion.
10. Test strategy and browser QA.
11. Old manual deployment versus the new CI/CD pipeline.
12. GitHub Environment variables/secrets and how to enable production deployment.
13. Rollback design and operational checklist.
14. What the owner should learn next instead of treating generated code as unexplained furniture.

### Visual assets

The article includes semantically exact visuals stored in its page bundle:

- `curtain-homepage-desktop.png`: production desktop screenshot.
- `curtain-homepage-mobile.png`: production mobile revealed-content screenshot.
- `homepage-architecture.svg`: browser-to-Hugo-module architecture diagram.
- `deployment-pipeline.svg`: GitHub-to-Oracle atomic deployment flow.

The SVG diagrams use simple labeled shapes and arrows, with accessible alt text in Markdown. They must not contain credentials, real VPS IPs, or local filesystem paths.

### Sources

The tutorial links to primary documentation near the relevant claims:

- Hugo image processing and page bundle documentation.
- GitHub Actions environments, secrets, artifacts, and concurrency documentation.
- Cloudflare Pages Hugo documentation as a future alternative, not the current implementation.

## 4. Repository README

`README.md` becomes a practical project front page with:

- Project name, live-site link, and concise purpose.
- Feature overview.
- Architecture diagram using GitHub-supported Mermaid syntax.
- Technology stack.
- Repository structure.
- Local development commands.
- Automated test and production build commands.
- Article-authoring workflow.
- Current Oracle deployment architecture.
- GitHub Actions setup instructions.
- Required repository variable and production environment settings.
- Security notes covering `.env`, SSH keys, API keys, and public logs.
- Links to the published design/deployment tutorial and third-party notices.

The README will not include fake badges, unverifiable performance claims, private infrastructure details, or secret-shaped examples copied from production.

## 5. CI/CD Architecture

### Workflow scope

Create `.github/workflows/site.yml` with two jobs:

#### `verify`

Runs on pull requests, pushes to `main`, and manual dispatch:

1. Checkout the repository.
2. Install Node.js.
3. Run `node --test tests/*.test.js`.
4. Install the pinned Hugo Extended version.
5. Run a minified production build.
6. Assert that the homepage contains the curtain and overview markers.
7. Upload `public/` as a short-retention workflow artifact.

This job never receives production credentials.

#### `deploy`

Runs only when all conditions are true:

- `verify` passed.
- The ref is `refs/heads/main`.
- Repository variable `ENABLE_VPS_DEPLOY` equals `true`.

The job references the `production` GitHub Environment, downloads the exact artifact produced by `verify`, configures SSH from Environment secrets/variables, transfers to a unique temporary release directory, and runs the repository deployment script remotely.

### GitHub configuration

Repository variable:

- `ENABLE_VPS_DEPLOY=true` enables the deploy job. If missing or false, verification still runs and deployment is skipped.

Production Environment variables:

- `VPS_HOST`: Oracle host name or IP.
- `VPS_USER`: SSH user, currently `ubuntu`.
- `VPS_PORT`: optional, defaults to `22` in the workflow.

Production Environment secret:

- `VPS_SSH_KEY`: dedicated deployment private key. It must not be committed to the repository.

Recommended Environment protection:

- Restrict deployment branches to `main`.
- Add a required reviewer while the workflow is new.
- Remove required review later only if fully automatic publishing is genuinely desired.

### Concurrency

Use one production concurrency group with `cancel-in-progress: false`. A second deployment must wait rather than interrupt a release halfway through its atomic switch.

## 6. Remote Deployment Contract

Create `scripts/deploy-site.sh`. It receives exactly two arguments:

1. The unique staging directory created under `/tmp/estevancyber-release-*`.
2. The 40-character Git commit SHA.

It must:

1. Validate both arguments before invoking `sudo`.
2. Refuse paths outside the expected `/tmp/estevancyber-release-*` prefix.
3. Verify `index.html`, `data-curtain-hero`, `ec-overview`, and a playlist media file.
4. Normalize ownership to `www-data:www-data` and permissions to `755` directories / `644` files.
5. Save a compressed backup under `/var/backups/estevancyber/`.
6. Move the current `/var/www/blog` to a timestamped rollback directory.
7. Atomically move the validated release into `/var/www/blog`.
8. Run `nginx -t` and local HTTPS probes for the apex and blog hosts.
9. Restore the rollback directory automatically if validation fails.
10. Print the deployed SHA and backup paths for the Actions log.

The script does not delete old backups automatically. Retention is a separate, explicit maintenance decision; combining release and cleanup makes a failed deployment harder to reason about.

## 7. Testing

### Automated tests

Extend `tests/homepage-contract.test.js` to require all four progress periods and reject duplicate/missing rows.

Add `tests/deployment-contract.test.js` to assert that:

- The workflow has PR, `main`, and manual triggers.
- Deployment depends on verification.
- Production deployment is gated by `ENABLE_VPS_DEPLOY`.
- The workflow references `production` and never embeds the current VPS address or a private key.
- The remote script validates its staging prefix, creates a backup, tests Nginx, and contains a rollback path.
- The script contains no `rm -rf`.

### Build and browser QA

- Run all Node tests.
- Run Hugo production build.
- Check the new article and README links.
- Verify homepage at `1440 x 900`, `768 x 1024`, and `390 x 844`.
- Verify four progress values update and no horizontal overflow occurs.
- Verify the new article images render and the browser console has no errors.

### Deployment QA

The first deployment of this change remains manual because GitHub secrets cannot be safely invented or committed. After GitHub configuration is complete, run the workflow manually once with required review enabled, then verify the deployment history before relying on push-to-main automation.

## 8. Rollout

1. Implement on `codex/progress-blog-cicd`.
2. Open a draft PR and let `verify` run without deployment.
3. Review the generated article and README locally.
4. Merge after tests and browser QA.
5. Deploy this release manually using the already proven package/hash/atomic-switch process.
6. Create the `production` Environment and repository variables in GitHub.
7. Manually dispatch the workflow once.
8. Enable ongoing push-to-main deployment only after that run succeeds.

Cloudflare Pages remains a future option. It can remove static-site deployment from the VPS and add preview deployments, but switching DNS and origin ownership is intentionally outside this change.
