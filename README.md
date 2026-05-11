# Community ECharts — an Apache ECharts™ panel for Grafana

> **A maintained fork of [bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel) by [@Billiballa](https://github.com/Billiballa).**
> All credit for the original plugin design, panel UX, and the
> `(data, theme, echartsInstance, echarts)` function-body API goes to
> Billiballa. This fork modernizes the build for Grafana 11–13 while
> preserving Billiballa's user-facing contract verbatim, so existing
> chart code keeps working.

![release](https://img.shields.io/github/v/release/jakobgabriel/bilibala-echarts-panel)
![issues](https://img.shields.io/github/issues-closed/jakobgabriel/bilibala-echarts-panel)
![stars](https://img.shields.io/github/stars/jakobgabriel/bilibala-echarts-panel?style=social)

![hero](https://raw.githubusercontent.com/jakobgabriel/bilibala-echarts-panel/master/src/img/screenshot.png)

## Origin & credits

This plugin is a fork of [Billiballa/bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel) (Apache-2.0). **Billiballa** designed and shipped the original Grafana ECharts panel — the panel-options code editor, the `(data, theme, echartsInstance, echarts)` signature, the auto-registered map directory, and the default chart all originate from that work. Please give the upstream repo a star if you find this fork useful.

This fork's contribution is limited to:

- modernizing the build (drop `@grafana/toolkit`, move to `@grafana/create-plugin`, Webpack 5, SWC, Jest 29, React 18, Node 24);
- making the user-facing API survive the modernization via a transparent compatibility shim (`src/compat.ts`) so `theme.type` and `field.values.buffer` keep working;
- making charts inherit Grafana's full theme palette via a derived ECharts theme (`src/grafanaTheme.ts`);
- shipping two ECharts variants (4.9 and 5.6) per release so users can pick the API their chart code targets.

## Compatibility

The CI gate runs `@grafana/plugin-validator`, type-check, unit tests, and a smoke load against Grafana **11.6.14**, **12.4.3**, and **13.0.1**. The screenshot below is captured live from a fresh Grafana 13.0.1 container against the dashboard at `scripts/dashboards/community-echarts-panel-demo.json` and the same `dist/` artifact that's published in the GitHub Release; the panel-edit view on 11.x and 12.x is visually equivalent.

![Community ECharts panel-edit view on Grafana 13.0.1](https://raw.githubusercontent.com/jakobgabriel/bilibala-echarts-panel/master/src/img/usage-edit-grafana-13.png)

To reproduce the captures locally:

```sh
npm run build
PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright \
  python3 scripts/capture-screenshots.py
```

## Install

The Grafana plugin id is `community-echarts-panel`. Distribution is via GitHub Releases. **Requires Grafana >= 11.**

### Pick an ECharts variant

Each tagged release ships **two zips** corresponding to the bundled ECharts major. Both share the same plugin id, the same `plugin.json` schema, and the same panel-options surface, so dashboards are interchangeable across variants — but **user-authored `getOption` code can break** at the v4 → v5 boundary (e.g. `series[].lineStyle.normal` was removed in v5). Pick the variant that matches your existing chart code; switching later is a re-install.

| Bundled ECharts | Asset | Best for |
|---|---|---|
| 4.9 (default) | `community-echarts-panel-2.6.0-echarts4.zip` | Direct upgrade from upstream `bilibala-echarts-panel`; existing v8.5.x dashboards |
| 5.x           | `community-echarts-panel-2.6.0-echarts5.zip` | New panels, modern ECharts API |

ECharts 6 is intentionally not bundled — at the time of release the add-on ecosystem (`echarts-gl`, `echarts-liquidfill`, `echarts-wordcloud`) had not yet shipped v6-compatible majors.

### Required Grafana setting

The plugin is community-tier signed (or unsigned, depending on the release). Allow it explicitly:

```ini
# grafana.ini
[plugins]
allow_loading_unsigned_plugins = community-echarts-panel
```

### Quick install (one-liner)

Always-latest URL (auto-resolves to the newest published release):

```sh
wget -qO /tmp/p.zip \
  https://github.com/jakobgabriel/bilibala-echarts-panel/releases/latest/download/community-echarts-panel-echarts5.zip \
  && sudo unzip -q /tmp/p.zip -d /var/lib/grafana/plugins \
  && rm /tmp/p.zip \
  && sudo systemctl restart grafana-server
```

Swap `-echarts5` → `-echarts4` for the v4 variant.

To pin to a specific release (recommended for production):

```sh
wget -qO /tmp/p.zip \
  https://github.com/jakobgabriel/bilibala-echarts-panel/releases/download/v2.6.0/community-echarts-panel-2.6.0-echarts5.zip \
  && sudo unzip -q /tmp/p.zip -d /var/lib/grafana/plugins \
  && rm /tmp/p.zip
```

### Dockerfile

```dockerfile
FROM grafana/grafana:13.0.1
USER root
RUN apt-get update && apt-get install -y --no-install-recommends wget unzip ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN wget -qO /tmp/p.zip https://github.com/jakobgabriel/bilibala-echarts-panel/releases/latest/download/community-echarts-panel-echarts5.zip \
 && unzip -q /tmp/p.zip -d /var/lib/grafana/plugins \
 && rm /tmp/p.zip
ENV GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=community-echarts-panel
USER grafana
```

### Path A — `grafana-cli` (with SHA verification)

```sh
grafana-cli --pluginUrl https://github.com/jakobgabriel/bilibala-echarts-panel/releases/latest/download/community-echarts-panel-echarts4.zip plugins install community-echarts-panel
sudo systemctl restart grafana-server
```

Verify the integrity sidecar first (each release publishes a `.sha1` next to the zip):

```sh
curl -sLO https://github.com/jakobgabriel/bilibala-echarts-panel/releases/latest/download/community-echarts-panel-echarts4.zip
curl -sL  https://github.com/jakobgabriel/bilibala-echarts-panel/releases/latest/download/community-echarts-panel-echarts4.zip.sha1
sha1sum community-echarts-panel-echarts4.zip   # compare to the .sha1 contents
```

### Path B — Docker bind mount (dev / CI)

```sh
docker run -d -p 3000:3000 \
  -v /path/to/community-echarts-panel:/var/lib/grafana/plugins/community-echarts-panel:ro \
  -e GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=community-echarts-panel \
  grafana/grafana:13.0.1
```

This is the path `scripts/capture-screenshots.py` uses; the plugin is loaded from the host filesystem, so iteration is `npm run build` (or `scripts/build-variant.sh 5`) → restart container.

## Migrating from `bilibala-echarts-panel`, `grafana-echarts`, or `g-echarts`

The plugin id changed from earlier identifiers (`bilibala-echarts-panel` upstream, briefly `grafana-echarts` and `g-echarts` during this fork's evolution) to `community-echarts-panel`. The new id is required by the Grafana plugin-validator (3 hyphen-separated parts ending in `-panel`); the older ids do not pass.

If you have dashboards that reference any earlier id, edit each dashboard's JSON (Settings → JSON Model → Save) and replace every panel's `type` field:

| Old `type` value           | New `type` value           |
| -------------------------- | -------------------------- |
| `bilibala-echarts-panel`   | `community-echarts-panel`  |
| `grafana-echarts`          | `community-echarts-panel`  |
| `g-echarts`                | `community-echarts-panel`  |

For bulk migration of provisioned dashboard JSON files:

```sh
find /etc/grafana/provisioning/dashboards -name '*.json' -exec sed -i \
  -e 's/"type": *"bilibala-echarts-panel"/"type": "community-echarts-panel"/g' \
  -e 's/"type": *"grafana-echarts"/"type": "community-echarts-panel"/g' \
  -e 's/"type": *"g-echarts"/"type": "community-echarts-panel"/g' \
  {} \;
```

The stored panel options (`followTheme`, `getOption`, `tickContent`, …) deserialize cleanly into the modern `SimpleOptions` shape regardless of which legacy id the dashboard originated from (`src/migration.test.ts` asserts this).

The variant zip you pick at install time decides which ECharts major your charts run against. The default `community-echarts-panel-*-echarts4.zip` ships ECharts 4.9 — the same major upstream `bilibala-echarts-panel` shipped — so any `getOption` code from a Grafana 8.5.x dashboard runs unchanged. If you switch to the `-echarts5.zip` variant and your chart uses the legacy `series[].lineStyle.normal` / `series[].itemStyle.normal` syntax (deprecated in ECharts 4, removed in 5), flatten it: `series[].lineStyle` / `series[].itemStyle`.

## Usage

### 1. Add the panel to a dashboard

Open a dashboard → **Add panel** → search for **Community ECharts**. The default chart (Billiballa's original area-line example) renders immediately from any time-series query, with no edits required.

### 2. Edit the chart options

The **Echarts options** editor in the panel options pane is the function body of `async (data, theme, echartsInstance, echarts, loadMap, grafana) => { ... }`. The function must `return` an [ECharts option object](https://echarts.apache.org/option.html). `data.series[i].fields[j].values` is a plain array; legacy `.values.buffer` access is also supported via the compat shim (`src/compat.ts`).

See the [Compatibility](#compatibility) section above for what the panel-edit view looks like on each supported Grafana major.

> **What you get in the editor.** JSHint marks syntax errors in the
> gutter as you type. **Ctrl-Space** opens an autocomplete popup scoped
> to the parameter surface (`data.series.`, `theme.colors.`,
> `grafana.variables.`, …). The body is wrapped in an async IIFE, so
> `await` works at the top level (e.g. `await loadMap('world')`).
> Full reference: [Editor contract](https://jakobgabriel.github.io/bilibala-echarts-panel/editor/).

### 3. Worked examples

The full cookbook (bar / pie / heatmap and more) lives on the docs site:
[**Cookbook → community-echarts-panel docs**](https://jakobgabriel.github.io/bilibala-echarts-panel/cookbook/).

### 4. Follow Grafana theme

Toggle **Follow Grafana Theme** in the panel options. The chart inherits Grafana's full theme palette: series colors come from `theme.visualization.palette`; text, tooltip, axis, and grid-line colors come from `theme.colors.*` and `theme.typography`. Custom themes shipped in newer Grafana versions (e.g. high-contrast) are picked up automatically.

### 5. Side effects (event listeners, intervals)

The function body re-runs every time data refreshes. Clear side effects on each invocation, otherwise listeners will stack:

```js
echartsInstance.off('click');
echartsInstance.on('click', (params) => {
  console.log('Clicked:', params);
});
return { /* … */ };
```

### 6. Custom maps

Maps are no longer bundled into `module.js`. They ship as separate JSON
files under `/public/plugins/community-echarts-panel/map/` and you opt in
via the new `loadMap(name)` helper, which is passed as the 5th positional
argument to your `getOption` body:

```js
await loadMap('world');
return {
  geo: { map: 'world', roam: true },
  series: [{ type: 'map', map: 'world', data: [/* … */] }],
};
```

Bundled names: `world`, `usa`, `germany`, `france`, `united-kingdom`,
`italy`, `spain`, `brazil`, `india`, `japan`, `china-en` (English
labels), and `china` (the original upstream geometry with Chinese
labels, preserved for backwards compatibility). All maps load offline
and are normalized so `feature.properties.name` is the canonical
English label (a `nameAscii` companion strips diacritics). Sources,
licenses, and per-map quirks are in
[`src/map/SOURCES.md`](https://github.com/jakobgabriel/bilibala-echarts-panel/blob/master/src/map/SOURCES.md)
and [`src/map/LICENSES.md`](https://github.com/jakobgabriel/bilibala-echarts-panel/blob/master/src/map/LICENSES.md);
maintainers refresh them with `scripts/fetch-maps.sh`. See the
[Maps docs page](https://jakobgabriel.github.io/bilibala-echarts-panel/maps/)
for the full bundled-maps table and the
[Picking the right China map](https://jakobgabriel.github.io/bilibala-echarts-panel/maps/#picking-the-right-china-map)
side-by-side.

To bring your own map: drop `YourMap.json` into `src/map/`, run
`npm run build`, then call `await loadMap('YourMap')`. Webpack's
CopyWebpackPlugin will copy it to `dist/map/`.

If your dashboard needs a region the bundle doesn't ship, toggle
**Allow remote maps** in panel options. `loadMap()` then falls back to
`{remoteMapBaseUrl}/<name>.json` (default jsDelivr) when the local fetch
404s. Off by default for air-gapped Grafana installs.

> **Migrating from the eager-registration behavior**: dashboards
> previously written against the upstream `geo: { map: 'china' }` need a
> one-liner prepended to their `getOption`: `await loadMap('china');`.
> The default function body in this fork now uses `field.values`
> directly; the legacy `.values.buffer` access pattern still works via
> the compat shim (`src/compat.ts`) for saved panels.

Full reference: [Maps → community-echarts-panel docs](https://jakobgabriel.github.io/bilibala-echarts-panel/maps/).

### 7. Dashboard variables

A sixth positional parameter, `grafana`, exposes
`{ variables, replace, setVariable, refresh }` so chart code can read the
current variable values, run Grafana's `$var` / `${var:csv}` / `[[var]]`
interpolation, push a value back into the URL, or fire a refresh:

```js
echartsInstance.off('click');
echartsInstance.on('click', (p) => grafana.setVariable('region', p.name));
return { title: { text: grafana.replace('Region: $region') }, /* … */ };
```

Existing 5-arg `getOption` bodies keep working unchanged. Full reference:
[Dashboard variables → community-echarts-panel docs](https://jakobgabriel.github.io/bilibala-echarts-panel/variables/).

For a hosted reference and runtime cookbook, see the docs site:
**https://jakobgabriel.github.io/bilibala-echarts-panel/**.

## Develop

```sh
nvm use            # Node 24
npm install
npm run dev        # webpack watch
npm run server     # docker compose up grafana with the plugin mounted
npm run test:ci    # 19 unit tests across compat / grafanaTheme / migration
npm run typecheck
npm run lint
npm run build
```

## Trademarks

Powered by **Apache ECharts™**, a trademark of The Apache Software Foundation.

This project is not affiliated with, endorsed by, or sponsored by The Apache Software Foundation, Apache ECharts, or Grafana Labs.

## License

Apache-2.0. The original `LICENSE` from [Billiballa/bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel) is preserved unchanged in this repo.
