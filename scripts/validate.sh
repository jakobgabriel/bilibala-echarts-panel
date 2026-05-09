#!/usr/bin/env bash
# Run @grafana/plugin-validator (https://github.com/grafana/plugin-validator)
# against either a directory (dist/) or an existing zip artifact.
#
# Usage:
#   scripts/validate.sh dist                                 # zip dist/ and validate
#   scripts/validate.sh g-echarts-2.5.0-echarts4.zip         # validate an existing zip
#
# The validator only fetches plugins via URL, so we serve the zip on a
# local HTTP port and point the validator at it. Errors fail the build;
# warnings (e.g. shields.io / external URLs that are flaky from CI
# runners) and recommendations are informational.

set -euo pipefail
INPUT="${1:?usage: scripts/validate.sh <dir-or-zip>}"

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then kill "$SERVER_PID" 2>/dev/null || true; fi
  if [ -n "${TMP_ZIP:-}" ] && [ -f "$TMP_ZIP" ]; then rm -f "$TMP_ZIP"; fi
}
trap cleanup EXIT

if [ -d "$INPUT" ]; then
  # Package the dir into a temp zip with the plugin id as the top-level folder.
  PLUGIN_ID=$(node -p "require('./${INPUT}/plugin.json').id")
  TMP_ZIP="$(pwd)/.validator-input.zip"
  rm -rf .vpkg
  mkdir .vpkg
  cp -r "$INPUT" ".vpkg/${PLUGIN_ID}"
  (cd .vpkg && zip -qr "$TMP_ZIP" "${PLUGIN_ID}")
  rm -rf .vpkg
  ZIP_PATH="$TMP_ZIP"
elif [ -f "$INPUT" ]; then
  ZIP_PATH="$(realpath "$INPUT")"
else
  echo "validate.sh: '$INPUT' is neither a directory nor a file" >&2
  exit 2
fi

ZIP_DIR="$(dirname "$ZIP_PATH")"
ZIP_NAME="$(basename "$ZIP_PATH")"
PORT="${VALIDATOR_PORT:-8765}"

# Serve the zip locally for the validator to fetch.
python3 -m http.server "$PORT" --directory "$ZIP_DIR" > /tmp/validator-http.log 2>&1 &
SERVER_PID=$!
# Wait for the server to bind.
for _ in $(seq 1 20); do
  if curl -sfI "http://localhost:${PORT}/${ZIP_NAME}" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

set +e
npx -y @grafana/plugin-validator@latest "http://localhost:${PORT}/${ZIP_NAME}"
EXIT=$?
set -e

exit $EXIT
