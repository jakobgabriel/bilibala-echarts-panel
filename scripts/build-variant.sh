#!/usr/bin/env bash
# Build the plugin against a specific ECharts major.
# Usage: scripts/build-variant.sh <4|5>
# Output: dist/  +  g-echarts-<version>-echarts<major>.zip(.sha256)
#
# The default `npm run build` produces a v4 build because package.json
# pins echarts@^4.9.0 plus matching add-on majors. This script swaps
# those four packages (plus removes @types/echarts on v5 since v5 ships
# its own types) and rebuilds. --no-save keeps package.json and the
# lockfile unchanged so the v4 baseline is preserved for `npm ci`.

set -euo pipefail
MAJOR="${1:?missing ECharts major (4 or 5)}"

case "$MAJOR" in
  4) ECHARTS=4.9.0; GL=1.1.2; LF=2.0.6; WC=1.1.3 ;;
  5) ECHARTS=5.6.0; GL=2.0.9; LF=3.1.0; WC=2.1.0 ;;
  *) echo "Unsupported ECharts major: $MAJOR (expected 4 or 5)" >&2; exit 1 ;;
esac

echo "==> Building variant: ECharts $MAJOR (echarts@$ECHARTS, gl@$GL, liquidfill@$LF, wordcloud@$WC)"

if [ "$MAJOR" = "5" ]; then
  # @types/echarts is DefinitelyTyped for v4 only and conflicts with
  # the bundled types ECharts 5 ships in its main package.
  npm uninstall --no-save @types/echarts
fi

npm install --no-save \
  "echarts@$ECHARTS" \
  "echarts-gl@$GL" \
  "echarts-liquidfill@$LF" \
  "echarts-wordcloud@$WC"

npm run build

VERSION=$(node -p "require('./dist/plugin.json').info.version")
PLUGIN_ID=$(node -p "require('./dist/plugin.json').id")
ARTIFACT="${PLUGIN_ID}-${VERSION}-echarts${MAJOR}.zip"

# Re-zip dist/ as <plugin-id>/ inside the archive — the layout
# `grafana-cli plugins install` and the manual unzip path expect.
rm -rf "_pkg/${PLUGIN_ID}"
mkdir -p _pkg
cp -r dist "_pkg/${PLUGIN_ID}"
(cd _pkg && zip -qr "../${ARTIFACT}" "${PLUGIN_ID}")
rm -rf _pkg

sha256sum "$ARTIFACT" > "${ARTIFACT}.sha256"
echo "==> produced ${ARTIFACT} ($(du -h "${ARTIFACT}" | cut -f1))"
echo "==> sha256 in   ${ARTIFACT}.sha256"
