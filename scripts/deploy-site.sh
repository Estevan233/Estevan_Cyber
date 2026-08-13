#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

readonly RELEASE_DIR="${1:-}"
readonly RELEASE_SHA="${2:-}"
readonly SITE_ROOT="/var/www/blog"
readonly WEB_ROOT="/var/www"
readonly BACKUP_ROOT="/var/backups/estevancyber"
readonly PROBE_HOST="estevancyber.net"
readonly ARTICLE_PATH="/posts/curtain-homepage-design-and-deployment/"

fail() {
  printf 'deploy error: %s\n' "$*" >&2
  exit 1
}

[[ "$RELEASE_DIR" =~ ^/tmp/estevancyber-release-[A-Za-z0-9._-]+$ ]] || fail "unsafe release directory"
[[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]] || fail "release SHA must match ^[a-f0-9]{40}$"
[[ -d "$RELEASE_DIR" && ! -L "$RELEASE_DIR" ]] || fail "release directory is missing or is a symlink"
[[ -z "$(find "$RELEASE_DIR" -type l -print -quit)" ]] || fail "release contains symlinks"

required_files=(
  "index.html"
  "posts/curtain-homepage-design-and-deployment/index.html"
  "posts/curtain-homepage-design-and-deployment/homepage-architecture.svg"
  "posts/curtain-homepage-design-and-deployment/deployment-pipeline.svg"
)

for relative_path in "${required_files[@]}"; do
  [[ -s "$RELEASE_DIR/$relative_path" ]] || fail "missing artifact file: $relative_path"
done

[[ -n "$(find "$RELEASE_DIR/assets/css" -type f -name '*.css' -size +0c -print -quit)" ]] || fail "CSS artifact is missing"
[[ -n "$(find "$RELEASE_DIR/assets/js" -type f -name '*.js' -size +0c -print -quit)" ]] || fail "JavaScript artifact is missing"
grep -q 'data-period=day' "$RELEASE_DIR/index.html" || fail "day progress marker is missing"
grep -q 'data-period=week' "$RELEASE_DIR/index.html" || fail "week progress marker is missing"
grep -q 'data-period=month' "$RELEASE_DIR/index.html" || fail "month progress marker is missing"
grep -q 'data-period=year' "$RELEASE_DIR/index.html" || fail "year progress marker is missing"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
short_sha="${RELEASE_SHA:0:12}"
new_root="$WEB_ROOT/.estevancyber-new-${short_sha}-${timestamp}"
rollback_root="$WEB_ROOT/.estevancyber-rollback-${timestamp}"
failed_root="$WEB_ROOT/.estevancyber-failed-${short_sha}-${timestamp}"
backup_file="$BACKUP_ROOT/blog-${timestamp}-${short_sha}.tar.gz"
swap_started=0

rollback() {
  status="${1:-1}"
  trap - ERR INT TERM
  printf 'deploy failed with status %s; attempting rollback\n' "$status" >&2
  if (( swap_started == 1 )); then
    if [[ -d "$SITE_ROOT" ]]; then
      mv -- "$SITE_ROOT" "$failed_root" || true
    fi
    if [[ -d "$rollback_root" ]]; then
      mv -- "$rollback_root" "$SITE_ROOT" || true
    fi
    nginx -t || true
  fi
  exit "$status"
}
trap 'rollback $?' ERR
trap 'rollback 130' INT
trap 'rollback 143' TERM

install -d -m 0755 "$BACKUP_ROOT"
install -d -m 0755 "$new_root"
cp -a -- "$RELEASE_DIR/." "$new_root/"
find "$new_root" -type d -exec chmod 0755 {} +
find "$new_root" -type f -exec chmod 0644 {} +
chown -R www-data:www-data "$new_root"

nginx -t
[[ -d "$SITE_ROOT" && ! -L "$SITE_ROOT" ]] || fail "active site root is missing or is a symlink"
tar -czf "$backup_file" -C "$WEB_ROOT" "$(basename "$SITE_ROOT")"

mv -- "$SITE_ROOT" "$rollback_root"
swap_started=1
mv -- "$new_root" "$SITE_ROOT"
printf '%s\n' "$RELEASE_SHA" > "$SITE_ROOT/.release-sha"
chown www-data:www-data "$SITE_ROOT/.release-sha"
chmod 0644 "$SITE_ROOT/.release-sha"

nginx -t
homepage="$(curl --insecure --fail --silent --show-error --max-time 15 \
  --resolve "${PROBE_HOST}:443:127.0.0.1" \
  "https://${PROBE_HOST}/?release=${short_sha}")"
if [[ "$homepage" != *"Estevan Cyber"* ]]; then
  printf 'deploy error: homepage probe returned unexpected content\n' >&2
  rollback 1
fi

article="$(curl --insecure --fail --silent --show-error --max-time 15 \
  --resolve "${PROBE_HOST}:443:127.0.0.1" \
  "https://${PROBE_HOST}${ARTICLE_PATH}?release=${short_sha}")"
if [[ "$article" != *"从毛坯首页到幕布式个人网站"* ]]; then
  printf 'deploy error: tutorial probe returned unexpected content\n' >&2
  rollback 1
fi

trap - ERR INT TERM
find "$RELEASE_DIR" -depth -delete
logger -t estevancyber-deploy "deployed ${RELEASE_SHA}; backup=${backup_file}; rollback=${rollback_root}"
printf 'deployed %s\nbackup: %s\nrollback: %s\n' "$RELEASE_SHA" "$backup_file" "$rollback_root"
