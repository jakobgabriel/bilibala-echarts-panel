#!/usr/bin/env bash
#
# Smoke test: spins up Grafana in Docker with the freshly built plugin
# mounted, waits for /api/health, and verifies the plugin is loaded and
# its module.js is served.
#
# Usage:   scripts/smoke.sh <grafana-version>
# Example: scripts/smoke.sh 12.4.2
#          scripts/smoke.sh main           # nightly == v13 dev
#
# Requires: docker, curl, jq, a built dist/ (run `npm run build` first).

set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "usage: $0 <grafana-version>" >&2
  exit 2
fi

PLUGIN_ID="g-echarts"
PORT="${SMOKE_PORT:-3000}"
CONTAINER="grafana-smoke-${PLUGIN_ID}-$$"
PLUGIN_DIR="$(cd "$(dirname "$0")/.." && pwd)/dist"

if [[ ! -f "$PLUGIN_DIR/plugin.json" ]]; then
  echo "ERROR: $PLUGIN_DIR/plugin.json not found - run 'npm run build' first" >&2
  exit 1
fi

cleanup() {
  if docker inspect "$CONTAINER" >/dev/null 2>&1; then
    echo "--- Grafana logs (last 80 lines) ---" >&2
    docker logs --tail 80 "$CONTAINER" >&2 || true
    echo "------------------------------------" >&2
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "==> Starting grafana/grafana:${VERSION} on :${PORT}"
docker run -d --rm \
  --name "$CONTAINER" \
  -p "${PORT}:3000" \
  -e GF_DEFAULT_APP_MODE=development \
  -e GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS="$PLUGIN_ID" \
  -e GF_LOG_LEVEL=info \
  -v "${PLUGIN_DIR}:/var/lib/grafana/plugins/${PLUGIN_ID}:ro" \
  "grafana/grafana:${VERSION}" >/dev/null

echo "==> Waiting for /api/health"
ready=0
for _ in $(seq 1 90); do
  if curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
if [[ "$ready" -ne 1 ]]; then
  echo "FAIL: Grafana ${VERSION} did not become healthy within 180s" >&2
  exit 1
fi

# Give the plugin scanner a moment to finish.
sleep 3

echo "==> Querying /api/plugins/${PLUGIN_ID}/settings"
http_code=$(curl -s -o /tmp/smoke-settings.json -w '%{http_code}' \
  -u admin:admin "http://localhost:${PORT}/api/plugins/${PLUGIN_ID}/settings" || true)

if [[ "$http_code" != "200" ]]; then
  echo "FAIL: plugin settings endpoint returned HTTP ${http_code}" >&2
  cat /tmp/smoke-settings.json >&2 || true
  exit 1
fi

returned_id=$(jq -r '.id // empty' /tmp/smoke-settings.json)
if [[ "$returned_id" != "$PLUGIN_ID" ]]; then
  echo "FAIL: expected plugin id '$PLUGIN_ID', got '$returned_id'" >&2
  cat /tmp/smoke-settings.json >&2
  exit 1
fi

echo "==> Fetching /public/plugins/${PLUGIN_ID}/module.js"
curl -fsS -o /dev/null "http://localhost:${PORT}/public/plugins/${PLUGIN_ID}/module.js"

echo
echo "PASS: ${PLUGIN_ID} loaded on grafana/grafana:${VERSION}"
