const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("GitHub workflow verifies once and deploys a protected artifact", () => {
  const workflowPath = path.join(root, ".github", "workflows", "site.yml");
  assert.equal(fs.existsSync(workflowPath), true, "site workflow should exist");
  const workflow = read(".github/workflows/site.yml");

  for (const marker of [
    "pull_request:",
    "push:",
    "workflow_dispatch:",
    "contents: read",
    "HUGO_VERSION: 0.164.0",
    "node --test tests/*.test.js",
    "hugo --gc --minify",
    "actions/upload-artifact@",
    "actions/download-artifact@",
    "environment:",
    "name: production",
    "vars.ENABLE_VPS_DEPLOY == 'true'",
    "secrets.VPS_SSH_KEY",
    "cancel-in-progress: false",
    "rsync",
    "scripts/deploy-site.sh",
  ]) {
    assert.ok(workflow.includes(marker), `${marker} should be present`);
  }

  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(workflow, /uses:\s*[^\s]+@v\d+/);
  for (const ref of workflow.matchAll(/uses:\s*[^\s]+@([a-f0-9]{40})/g)) {
    assert.equal(ref[1].length, 40);
  }
  assert.ok([...workflow.matchAll(/uses:\s*[^\s]+@[a-f0-9]{40}/g)].length >= 4);
});

test("remote deployment validates, swaps atomically, probes, and rolls back", () => {
  const scriptPath = path.join(root, "scripts", "deploy-site.sh");
  assert.equal(fs.existsSync(scriptPath), true, "remote deployment script should exist");
  const script = read("scripts/deploy-site.sh");

  for (const marker of [
    "#!/usr/bin/env bash",
    "set -Eeuo pipefail",
    "/tmp/estevancyber-release-",
    "^[a-f0-9]{40}$",
    "index.html",
    "curtain-homepage-design-and-deployment",
    "tar -czf",
    "mv --",
    "nginx -t",
    "curl",
    "rollback",
    "trap",
  ]) {
    assert.ok(script.includes(marker), `${marker} should be present`);
  }

  assert.doesNotMatch(script, /rm\s+-rf\s+[^\n]*\/var\/www\/blog/);
  assert.doesNotMatch(script, /systemctl\s+restart/);

  const probeSection = script.slice(
    script.indexOf('homepage="$(curl'),
    script.lastIndexOf("trap - ERR INT TERM"),
  );
  assert.match(probeSection, /rollback 1/);
  assert.doesNotMatch(probeSection, /\|\| fail/);
});

test("shell scripts keep Unix line endings", () => {
  const attributesPath = path.join(root, ".gitattributes");
  assert.equal(fs.existsSync(attributesPath), true, ".gitattributes should exist");
  assert.match(read(".gitattributes"), /scripts\/\*\.sh\s+text\s+eol=lf/);
});
