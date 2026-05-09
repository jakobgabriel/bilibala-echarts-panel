#!/usr/bin/env bash
# Pin package.json + regenerate package-lock.json for the requested
# ECharts major. Run before `npm ci` / `npm install` / the canonical
# Grafana package-plugin action so the lockfile reflects the variant
# deps (the action runs `npm install` against whatever lockfile it
# finds; it does not respect `--no-save` swaps).
#
# Usage:
#   scripts/prep-variant.sh <4|5>
#
# After this runs, `npm ci` produces a working build for the chosen
# variant. To restore the v4 baseline, `git checkout -- package.json
# package-lock.json`.

set -euo pipefail
MAJOR="${1:?usage: scripts/prep-variant.sh <4|5>}"

case "$MAJOR" in
  4) ECHARTS=4.9.0; GL=1.1.2; LF=2.0.6; WC=1.1.3 ;;
  5) ECHARTS=5.6.0; GL=2.0.9; LF=3.1.0; WC=2.1.0 ;;
  *) echo "Unsupported ECharts major: $MAJOR (expected 4 or 5)" >&2; exit 1 ;;
esac

echo "==> Pinning ECharts $MAJOR variant: echarts@$ECHARTS, gl@$GL, liquidfill@$LF, wordcloud@$WC"

npm pkg set "dependencies.echarts=^$ECHARTS"
npm pkg set "dependencies.echarts-gl=^$GL"
npm pkg set "dependencies.echarts-liquidfill=^$LF"
npm pkg set "dependencies.echarts-wordcloud=^$WC"

if [ "$MAJOR" = "5" ]; then
  # @types/echarts is DefinitelyTyped for v4 only and conflicts with
  # the bundled types ECharts 5 ships in its main package.
  npm pkg delete devDependencies.@types/echarts || true
fi

npm install --package-lock-only
echo "==> package.json + package-lock.json now pinned to ECharts $MAJOR"
