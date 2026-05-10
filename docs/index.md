# Community ECharts panel

A maintained fork of [bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel)
for Grafana 11–13. Authors a single function body in a CodeMirror editor
and renders the result with [Apache ECharts™](https://echarts.apache.org/).

The README on GitHub is the canonical install/migration reference. This
page is the runtime cookbook — what to write inside the editor.

[GitHub repo](https://github.com/jakobgabriel/bilibala-echarts-panel){ .md-button }
[Releases](https://github.com/jakobgabriel/bilibala-echarts-panel/releases){ .md-button }

## Install

Pick a variant zip from the [latest release](https://github.com/jakobgabriel/bilibala-echarts-panel/releases/latest):

| Bundled ECharts | Asset                                          | Best for                                       |
| ---             | ---                                            | ---                                            |
| 4.9 (default)   | `community-echarts-panel-echarts4.zip`         | Direct upgrade from upstream `bilibala-echarts-panel` |
| 5.x             | `community-echarts-panel-echarts5.zip`         | New panels, modern ECharts API                 |

```sh
wget -qO /tmp/p.zip https://github.com/jakobgabriel/bilibala-echarts-panel/releases/latest/download/community-echarts-panel-echarts5.zip
sudo unzip -q /tmp/p.zip -d /var/lib/grafana/plugins
sudo systemctl restart grafana-server
```

Add to `grafana.ini`:

```ini
[plugins]
allow_loading_unsigned_plugins = community-echarts-panel
```

## The editor contract

The **Echarts options** field is the body of:

```js
async function (data, theme, echartsInstance, echarts, loadMap, grafana) {
  // your code
  return /* an ECharts option object */;
}
```

* `return` an [ECharts option](https://echarts.apache.org/option.html) object.
* The body is wrapped in an async IIFE, so `await` works (e.g. `await loadMap('world')`).
* Throws are caught and shown in the panel.
* `grafana` is the newest parameter; bodies written against the older 5-arg
  signature continue to run unchanged — extra positional parameters that the
  body never references are simply ignored by JavaScript.

### Parameters

| Name | Shape | Notes |
| --- | --- | --- |
| `data` | `PanelData` | `data.series` is the array of DataFrames. `data.state` is `'Done' \| 'Loading' \| 'Streaming' \| 'Error' \| 'NotStarted'`. |
| `theme` | `GrafanaTheme2` | Has `theme.colors.*`, `theme.typography.*`, `theme.visualization.palette`. The legacy `theme.type` (`'dark' \| 'light'`) is shimmed in. |
| `echartsInstance` | `ECharts` | The live instance. Use `.on/.off` for events. |
| `echarts` | `typeof echarts` | The namespace (registerMap, graphic, ...). |
| `loadMap` | `(name) => Promise<void>` | Lazy-load a map JSON. See [Maps](#maps). |
| `grafana` | `{ variables, replace, setVariable, refresh }` | Read/write dashboard variables and trigger refresh. See [Dashboard variables](#dashboard-variables). |

### Editor features

* **Linting** — JSHint runs on every keystroke; red gutter markers point to
  the failing line. The body is treated as already inside an async function,
  so `await` and a top-level `return` are valid.
* **Autocomplete** — Press **Ctrl-Space** for hints scoped to the parameter
  surface (e.g. `data.series.`, `theme.colors.text.`).
* **Save** — Changes are committed when the editor loses focus.

## Cookbook

### Bar chart from a single time-series

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

### Pie aggregated across series

```js
return {
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [{
    type: 'pie',
    radius: '70%',
    data: data.series.map((s) => ({
      name: s.name,
      value: s.fields.find((f) => f.type === 'number').values.reduce((a, b) => a + b, 0),
    })),
  }],
};
```

### Heatmap from a multi-series time query

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

## Dashboard variables

The `grafana` parameter exposes the four most common variable interactions
without having to import anything from the Grafana runtime yourself.

### Reading the current values

```js
// grafana.variables is a flat { name: currentValue } map. Multi-select
// variables come through as arrays; single-value as strings.
return {
  title: { text: `Region: ${grafana.variables.region ?? '(unset)'}` },
  series: [/* ... */],
};
```

### Interpolating templates

```js
// grafana.replace runs Grafana's standard $var / ${var:csv} / [[var]]
// substitution. Use it for any string the chart will render.
return {
  title: { text: grafana.replace('Latency for $region — last $__interval') },
  series: [/* ... */],
};
```

### Driving variables from chart interactions

```js
// Click a slice → set a dashboard variable → every other panel re-queries.
echartsInstance.off('click');
echartsInstance.on('click', (params) => {
  grafana.setVariable('region', params.name);
});
return { /* ... */ };
```

For multi-select variables, pass an array: `grafana.setVariable('servers', ['a', 'b'])`.

### Manually triggering a refresh

```js
// Equivalent to clicking the dashboard refresh button. Rare — variable
// changes already trigger a refresh — but useful for "refresh now" buttons
// drawn with echarts.graphic.
grafana.refresh();
```

> Use `current.value` (what queries see), not the visible label. For "All"
> selections Grafana exposes `'$__all'` — pass it through unchanged; queries
> already understand it.

## Maps

Maps are no longer eagerly bundled into the JS — the plugin ships GeoJSON
files at `/public/plugins/community-echarts-panel/map/*.json` and you opt
in via `loadMap(name)`:

```js
await loadMap('world');
return {
  geo: { map: 'world', roam: true },
  series: [{
    type: 'map',
    map: 'world',
    data: data.series.map((s) => ({
      name: s.name,
      value: s.fields.find((f) => f.type === 'number').values.reduce((a, b) => a + b, 0),
    })),
  }],
};
```

Bundled names: `china`, `world`, `usa`, `germany`, `france`, `united-kingdom`,
`italy`, `spain`, `brazil`, `india`, `japan`. Sources and licenses live in
[`src/map/SOURCES.md`](https://github.com/jakobgabriel/bilibala-echarts-panel/blob/master/src/map/SOURCES.md).

### Bring your own map

Drop `MyRegion.json` into `src/map/` and rebuild. The CopyWebpackPlugin
puts it under `dist/map/`, and `loadMap('MyRegion')` will fetch it.

### Remote maps

If your dashboard authors need a region the bundle doesn't ship, toggle
**Allow remote maps** in panel options. `loadMap()` then falls back to
`{remoteMapBaseUrl}/<name>.json` (default jsDelivr) when the local fetch
404s. Off by default for air-gapped Grafana installs.

## Follow Grafana theme

Toggle **Follow Grafana Theme** in panel options. The chart inherits
Grafana's full theme palette: series colors come from
`theme.visualization.palette`; text, tooltip, axis, and grid-line colors
come from `theme.colors.*` and `theme.typography`. Custom themes shipped
in newer Grafana versions (e.g. high-contrast) are picked up automatically.

## Side effects (event listeners, intervals)

The body re-runs every time data refreshes. Clear side effects on each
invocation, otherwise listeners stack:

```js
echartsInstance.off('click');
echartsInstance.on('click', (params) => {
  console.log('Clicked:', params);
});
return { /* … */ };
```

## Troubleshooting

| You see... | Likely cause |
| --- | --- |
| `Editor content error!` overlay | A syntax error or a runtime throw inside your body. The message is the JS error; check the lint markers in the editor too. |
| `Your function did not return anything.` | You forgot `return` (or returned `undefined`). |
| `Map "name" not found` | Either run `scripts/fetch-maps.sh`, drop your own JSON in `src/map/`, or enable **Allow remote maps**. |
| `Query error` overlay | The upstream Grafana query failed. The chart will redraw automatically when the query recovers. |

## License

Apache-2.0. The original `LICENSE` from
[Billiballa/bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel)
is preserved unchanged.

Powered by **Apache ECharts™**, a trademark of The Apache Software
Foundation. This project is not affiliated with, endorsed by, or sponsored
by The Apache Software Foundation, Apache ECharts, or Grafana Labs.
