#!/usr/bin/env bash
# Build the plugin against a specific ECharts major.
# Usage: scripts/build-variant.sh <4|5>
# Output: dist/  +  community-echarts-panel-<version>-echarts<major>.zip(.sha256)
#
# Local-only convenience wrapper. CI uses the canonical Grafana action
# (grafana/plugin-actions/package-plugin@main) which signs and produces
# a SHA1 sidecar; this local path produces SHA256 because that's what
# `sha256sum` writes by default and it's good enough for hand-verifying
# a local artifact. To restore the v4 baseline after running this:
#   git checkout -- package.json package-lock.json

set -euo pipefail
MAJOR="${1:?usage: scripts/build-variant.sh <4|5>}"

scripts/prep-variant.sh "$MAJOR"
npm ci
npm run build

PLUGIN_ID=$(node -p "require('./dist/plugin.json').id")
VERSION=$(node -p "require('./dist/plugin.json').info.version")
ARTIFACT="${PLUGIN_ID}-${VERSION}-echarts${MAJOR}.zip"

rm -rf .vpkg && mkdir .vpkg && cp -r dist ".vpkg/${PLUGIN_ID}"
(cd .vpkg && zip -qr "../${ARTIFACT}" "${PLUGIN_ID}")
rm -rf .vpkg

sha256sum "$ARTIFACT" > "${ARTIFACT}.sha256"
echo "==> produced ${ARTIFACT} ($(du -h "${ARTIFACT}" | cut -f1))"
echo "==> sha256 in   ${ARTIFACT}.sha256"
