#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

VPS_WORKDIR=${VPS_WORKDIR:-/opt/clucky}
ROOT="$VPS_WORKDIR/backend"
ACTION=${1:-}
RELEASE_ID=${2:-}
SERVICES=(config-server discovery-server identity-service catalog-store-service cart-order-service payment-service promotion-loyalty-service shipping-service notification-service review-report-service audit-service api-gateway)
fail() { printf '%s\n' "$*" >&2; exit 1; }
valid_id() { [[ "$1" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]; }
[[ "$VPS_WORKDIR" =~ ^/([A-Za-z0-9_-][A-Za-z0-9._-]*/)*[A-Za-z0-9_-][A-Za-z0-9._-]*$ ]] || fail 'Invalid VPS_WORKDIR.'
[[ "$ACTION" == apply || "$ACTION" == rollback ]] || fail 'Usage: deploy.sh apply RELEASE_ID | rollback RELEASE_ID'
valid_id "$RELEASE_ID" || fail 'Invalid release ID.'
[[ ! -L "$ROOT" && ! -L "$ROOT/releases" && ! -L "$ROOT/backups" ]] || fail 'Invalid backend directory.'
mkdir -p "$ROOT/releases" "$ROOT/backups"
exec 9>"$ROOT/deploy.lock"
flock -w 600 9 || fail 'Another backend deploy is running.'
docker compose version >/dev/null

compose() {
  docker compose --project-name clucky-backend --project-directory "$ROOT/releases/$RELEASE_ID" \
    --env-file "$ROOT/releases/$RELEASE_ID/runtime.env" -f "$ROOT/releases/$RELEASE_ID/compose.yml" "$@"
}

if [[ "$ACTION" == apply ]]; then
  incoming="$ROOT/incoming/$RELEASE_ID"
  [[ -d "$incoming" && ! -L "$incoming" && ! -e "$ROOT/releases/$RELEASE_ID" ]] || fail 'Release missing or already applied; rerun all jobs for a new release ID.'
  if [[ ! -L "$ROOT/current" ]] && docker container inspect clucky-postgres >/dev/null 2>&1; then
    fail 'Legacy clucky-postgres found. Plan data migration before starting the new stack; nothing was deleted.'
  fi
  (
    cd "$incoming"
    sha256sum --check --strict SHA256SUMS
    docker load --input backend.tar.gz
  )
  for service in "${SERVICES[@]}"; do docker image inspect "clucky-$service:$RELEASE_ID" >/dev/null; done
  mv "$incoming" "$ROOT/releases/$RELEASE_ID"
else
  [[ "${SCHEMA_COMPATIBLE_ROLLBACK:-}" == yes ]] || fail 'Review schema compatibility, then explicitly set SCHEMA_COMPATIBLE_ROLLBACK=yes. No database downgrade is performed.'
  [[ -d "$ROOT/releases/$RELEASE_ID" && ! -L "$ROOT/releases/$RELEASE_ID" ]] || fail 'Unknown rollback release.'
fi

on_failure() {
  local code=$?
  trap - ERR
  printf 'Backend release failed. Data/backup retained; do not down -v or reset Flyway. Review health and schema compatibility before rollback.\n' >&2
  compose ps >&2 || true
  exit "$code"
}
trap on_failure ERR

compose config --quiet
# ponytail: in-place deployment; use blue/green plus compatible migrations when zero downtime is required.
compose up -d --wait --wait-timeout 240 postgres redis kafka
backup="$ROOT/backups/$RELEASE_ID-$(date -u +%Y%m%dT%H%M%SZ).dump"
compose exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$backup.tmp"
mv "$backup.tmp" "$backup"
compose up -d --no-build --pull never --wait --wait-timeout 240 config-server
compose up -d --no-build --pull never --wait --wait-timeout 240 discovery-server
compose up -d --no-build --pull never --wait --wait-timeout 360 identity-service catalog-store-service cart-order-service payment-service promotion-loyalty-service shipping-service notification-service review-report-service audit-service
compose up -d --no-build --pull never --wait --wait-timeout 240 api-gateway

registered=false
for attempt in $(seq 1 60); do
  if compose exec -T api-gateway curl --fail --silent --max-time 5 -H 'Accept: application/json' http://discovery-server:8761/eureka/apps |
    python3 -c 'import json,sys; data=json.load(sys.stdin)["applications"].get("application", []); apps=data if isinstance(data,list) else [data]; expected=set(sys.argv[1:]); healthy={app["name"].lower() for app in apps if any(item.get("status")=="UP" for item in (app.get("instance",[]) if isinstance(app.get("instance",[]),list) else [app["instance"]]))}; sys.exit(0 if expected <= healthy else 1)' "${SERVICES[@]:2}"; then
    registered=true; break
  fi
  sleep 5
done
[[ "$registered" == true ]] || fail 'Not all business services and Gateway registered UP in Eureka.'
if [[ -L "$ROOT/current" ]]; then
  previous=$(readlink "$ROOT/current")
  [[ "$previous" =~ ^releases/[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || fail 'Invalid current release link.'
  ln -sfn "$previous" "$ROOT/.previous.new"
  mv -Tf "$ROOT/.previous.new" "$ROOT/previous"
fi
ln -sfn "releases/$RELEASE_ID" "$ROOT/.current.new"
mv -Tf "$ROOT/.current.new" "$ROOT/current"
trap - ERR
rm -f -- "$ROOT/releases/$RELEASE_ID/backend.tar.gz"
printf 'Backend release healthy: %s. Sample accounts/passwords were kept unchanged.\n' "$RELEASE_ID"
compose ps
