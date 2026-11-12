#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

VPS_WORKDIR=${VPS_WORKDIR:-/opt/clucky}
ROOT="$VPS_WORKDIR/frontend"
RELEASES="$ROOT/releases"
PROJECT=clucky-frontend
ACTION=${1:-}
RELEASE_ID=${2:-}

fail() { printf '%s\n' "$*" >&2; exit 1; }
valid_id() { [[ "$1" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]; }
[[ "$VPS_WORKDIR" =~ ^/([A-Za-z0-9_-][A-Za-z0-9._-]*/)*[A-Za-z0-9_-][A-Za-z0-9._-]*$ ]] || fail 'Invalid VPS_WORKDIR.'
[[ "$ACTION" == apply || "$ACTION" == rollback ]] || fail 'Usage: deploy.sh apply RELEASE_ID | deploy.sh rollback'
command -v flock >/dev/null || fail 'flock is required.'
command -v docker >/dev/null || fail 'Docker is required.'
docker compose version >/dev/null
[[ -d "$ROOT" && ! -L "$ROOT" ]] || fail "Prepare $ROOT on the VPS first."
mkdir -p "$RELEASES"
exec 9>"$ROOT/deploy.lock"
flock -w 300 9 || fail 'Another frontend deployment is still running.'

compose() {
  local release=$1
  shift
  local overrides=()
  if [[ -f "$RELEASES/$release/images.json" ]]; then
    overrides=(-f "$RELEASES/$release/images.json")
  fi
  docker compose --project-name "$PROJECT" --project-directory "$RELEASES/$release" \
    --env-file "$RELEASES/$release/release.env" \
    -f "$RELEASES/$release/compose.yml" "${overrides[@]}" "$@"
}

linked_release() {
  local name=$1 target
  [[ -L "$ROOT/$name" ]] || return 0
  target=$(readlink -f "$ROOT/$name")
  [[ "$(dirname "$target")" == "$RELEASES" ]] || fail "Invalid $name release link."
  valid_id "$(basename "$target")" || fail "Invalid $name release ID."
  printf '%s' "$(basename "$target")"
}

set_link() {
  local name=$1 release=$2
  ln -sfn "releases/$release" "$ROOT/.$name.new"
  mv -Tf "$ROOT/.$name.new" "$ROOT/$name"
}

previous=$(linked_release current)
if [[ "$ACTION" == apply ]]; then
  valid_id "$RELEASE_ID" || fail 'Invalid release ID.'
  incoming="$ROOT/incoming/$RELEASE_ID"
  [[ -d "$incoming" && ! -L "$incoming" ]] || fail 'Release upload is missing.'
  [[ ! -e "$RELEASES/$RELEASE_ID" ]] || fail 'Release already exists; rerun the workflow with a new attempt.'
  (
    cd "$incoming"
    sha256sum --check --strict SHA256SUMS
    [[ $(cat release.env) == "IMAGE_TAG=$RELEASE_ID" ]] || fail 'Image tag does not match the release.'
    if [[ ! -f images.json ]]; then
      docker load --input customer.tar.gz
      docker load --input admin.tar.gz
    fi
  )
  mv "$incoming" "$RELEASES/$RELEASE_ID"
else
  RELEASE_ID=$(linked_release previous)
  [[ -n "$RELEASE_ID" ]] || fail 'No previous release is available.'
fi

rollback_on_error() {
  local exit_code=${1:-$?}
  trap - ERR HUP INT TERM
  printf 'Frontend release %s failed; restoring the previous state.\n' "$RELEASE_ID" >&2
  compose "$RELEASE_ID" ps >&2 || true
  if [[ -n "$previous" ]]; then
    if ! compose "$previous" up -d --no-build --pull never --remove-orphans --wait --wait-timeout 120; then
      printf 'Automatic rollback also failed. Inspect the frontend containers.\n' >&2
    fi
  else
    compose "$RELEASE_ID" down --remove-orphans || true
  fi
  exit "$exit_code"
}
trap rollback_on_error ERR
trap 'rollback_on_error 129' HUP
trap 'rollback_on_error 130' INT
trap 'rollback_on_error 143' TERM

if [[ "$ACTION" == apply && -f "$RELEASES/$RELEASE_ID/images.json" ]]; then
  SECONDS=0
  compose "$RELEASE_ID" pull
  printf 'Frontend image pull: %ss\n' "$SECONDS"
fi
SECONDS=0
# --wait uses the image healthchecks and does not require a running backend.
compose "$RELEASE_ID" up -d --no-build --pull never --remove-orphans --wait --wait-timeout 120
printf 'Frontend activation and readiness: %ss\n' "$SECONDS"
if [[ -n "$previous" && "$previous" != "$RELEASE_ID" ]]; then
  set_link previous "$previous"
fi
set_link current "$RELEASE_ID"
trap - ERR HUP INT TERM

# Images stay cached for rollback; discard only this release's transfer archives.
rm -f -- "$RELEASES/$RELEASE_ID/customer.tar.gz" "$RELEASES/$RELEASE_ID/admin.tar.gz"
printf 'Frontend release is healthy: %s\n' "$RELEASE_ID"
compose "$RELEASE_ID" ps
