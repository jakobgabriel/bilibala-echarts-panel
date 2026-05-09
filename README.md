# G-ECharts — an Apache ECharts™ panel for Grafana

> **A maintained fork of [bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel) by [@Billiballa](https://github.com/Billiballa).**
> All credit for the original plugin design, panel UX, and the
> `(data, theme, echartsInstance, echarts)` function-body API goes to
> Billiballa. This fork modernizes the build for Grafana 11–13 while
> preserving Billiballa's user-facing contract verbatim, so existing
> dashboards keep rendering without edits.

![release](https://img.shields.io/github/v/release/jakobgabriel/bilibala-echarts-panel)
![issues](https://img.shields.io/github/issues-closed/jakobgabriel/bilibala-echarts-panel)
![stars](https://img.shields.io/github/stars/jakobgabriel/bilibala-echarts-panel?style=social)

![screenshot](src/img/screenshot.png)

## Origin & credits

This plugin is a fork of [Billiballa/bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel) (Apache-2.0). **Billiballa** designed and shipped the original Grafana ECharts panel — the panel-options code editor, the `(data, theme, echartsInstance, echarts)` signature, the auto-registered map directory, and the default chart all originate from that work. Please give the upstream repo a star if you find this fork useful.

This fork's contribution is limited to:

- modernizing the build (drop `@grafana/toolkit`, move to `@grafana/create-plugin`, Webpack 5, SWC, Jest 29, React 18, Node 24);
- making the user-facing API survive the modernization via a transparent compatibility shim (`src/compat.ts`) so `theme.type` and `field.values.buffer` keep working;
- making charts inherit Grafana's full theme palette via a derived ECharts theme (`src/grafanaTheme.ts`);
- declaring `aliasIDs: ["bilibala-echarts-panel"]` in `plugin.json` so existing dashboards resolve transparently to this plugin.

## Install

This plugin is distributed as a GitHub Release zip. The Grafana plugin id is `g-echarts`. **Requires Grafana >= 11.** (Grafana 10 is EOL and rejects the `aliasIDs` field that powers transparent dashboard migration; users on 10.x can stay on the upstream `bilibala-echarts-panel` until they upgrade.)

```sh
grafana-cli --pluginUrl https://github.com/jakobgabriel/bilibala-echarts-panel/releases/download/v2.4.0/g-echarts.zip plugins install g-echarts
```

Or unpack the zip into `/var/lib/grafana/plugins/g-echarts` and restart Grafana.

The plugin is unsigned (community-tier signing); allow it explicitly:

```ini
# grafana.ini
[plugins]
allow_loading_unsigned_plugins = g-echarts
```

## Migrating from `bilibala-echarts-panel`

If you have dashboards from a Grafana 8.5.x instance that used Billiballa's original `bilibala-echarts-panel`, **no manual edit is needed on Grafana 11+**. This plugin declares `aliasIDs: ["bilibala-echarts-panel", "grafana-echarts"]` in its `plugin.json`, so Grafana transparently resolves panels with the legacy `"type": "bilibala-echarts-panel"` to `g-echarts`. The stored panel options (`followTheme`, `getOption`, …) deserialize cleanly into the modern `SimpleOptions` shape (asserted by `src/migration.test.ts`).

The bundled ECharts version was bumped from 4.x to 6.x. Most user-authored `getOption` code is data-driven and unaffected, but if your chart used the legacy `series[].lineStyle.normal` / `series[].itemStyle.normal` syntax (deprecated in ECharts 4, removed in 5), flatten it: `series[].lineStyle` / `series[].itemStyle`.

## Usage

### 1. Add the panel to a dashboard

<!-- TODO screenshot: src/img/usage-add-panel.png — the panel picker showing G-ECharts -->

- Open a dashboard → **Add panel** → search for **G-ECharts**.
- The default chart (Billiballa's original area-line example) renders immediately from any time-series query, with no edits required.

### 2. Edit the chart options

<!-- TODO screenshot: src/img/usage-options-editor.png — the "Echarts options" code editor pane -->

- The **Echarts options** editor in the panel options pane is the function body of `(data, theme, echartsInstance, echarts) => { ... }`.
- The function must `return` an [ECharts option object](https://echarts.apache.org/option.html).
- `data.series[i].fields[j].values` is a plain array. Legacy `.values.buffer` access is also supported via the compat shim (`src/compat.ts`).

### 3. Worked examples

#### Bar chart from a single time-series query

<!-- TODO screenshot: src/img/usage-bar-chart.png -->

```js
const valueField = data.series[0].fields.find((f) => f.type === 'number');
const timeField  = data.series[0].fields.find((f) => f.type === 'time');
return {
  xAxis: {
    type: 'category',
    data: timeField.values.map((t) => new Date(t).toLocaleTimeString()),
  },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: valueField.values }],
};
```

#### Pie chart aggregated across series

<!-- TODO screenshot: src/img/usage-pie-chart.png -->

```js
return {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: '70%',
      data: data.series.map((s) => ({
        name: s.name,
        value: s.fields
          .find((f) => f.type === 'number')
          .values.reduce((a, b) => a + b, 0),
      })),
    },
  ],
};
```

#### Heatmap from a multi-series time query

```js
const points = [];
data.series.forEach((s, y) => {
  const valueField = s.fields.find((f) => f.type === 'number');
  valueField.values.forEach((v, x) => points.push([x, y, v]));
});
return {
  xAxis: { type: 'category', data: data.series[0].fields.find((f) => f.type === 'time').values },
  yAxis: { type: 'category', data: data.series.map((s) => s.name) },
  visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', bottom: 0 },
  series: [{ type: 'heatmap', data: points }],
};
```

### 4. Follow Grafana theme

<!-- TODO screenshot: src/img/usage-theme-dark.png — chart in Grafana's dark theme -->
<!-- TODO screenshot: src/img/usage-theme-light.png — same chart in light theme -->

- Toggle **Follow Grafana Theme** in the panel options.
- The chart inherits Grafana's full theme palette: series colors come from `theme.visualization.palette`; text, tooltip, axis, and grid-line colors come from `theme.colors.*`. Custom themes shipped in newer Grafana versions (e.g. high-contrast) are picked up automatically.

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

Drop `YourMap.json` into `src/map/`, run `npm run build`, and the panel auto-registers it via `echarts.registerMap('YourMap', …)`. Reference it in your chart with `geo: { map: 'YourMap' }`. (The auto-registration loop at `src/SimplePanel.tsx:14-25` is Billiballa's original — unchanged in this fork.)

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
