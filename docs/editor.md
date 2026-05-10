# Editor contract

The **Echarts options** field is the body of:

```js
async function (data, theme, echartsInstance, echarts, loadMap, grafana) {
  // your code
  return /* an ECharts option object */;
}
```

* `return` an [ECharts option](https://echarts.apache.org/option.html) object.
* The body is wrapped in an async IIFE, so `await` works
  (e.g. `await loadMap('world')`).
* Throws are caught and shown in the panel — see
  [Troubleshooting](troubleshooting.md) for what each overlay means.
* `grafana` is the newest parameter; bodies written against the older
  five-argument signature continue to run unchanged. JavaScript ignores
  unreferenced positional parameters, so adding more never breaks
  pre-existing dashboards.

## Parameters

| Name | Shape | Notes |
| --- | --- | --- |
| `data` | `PanelData` | `data.series` is the array of DataFrames. `data.state` is `'Done' \| 'Loading' \| 'Streaming' \| 'Error' \| 'NotStarted'`. |
| `theme` | `GrafanaTheme2` | Has `theme.colors.*`, `theme.typography.*`, `theme.visualization.palette`. The legacy `theme.type` (`'dark' \| 'light'`) is shimmed in. |
| `echartsInstance` | `ECharts` | The live instance. Use `.on/.off` for events. |
| `echarts` | `typeof echarts` | The namespace (`registerMap`, `graphic`, …). |
| `loadMap` | `(name) => Promise<void>` | Lazy-load a map JSON. See [Maps](maps.md). |
| `grafana` | `{ variables, replace, setVariable, refresh }` | Read/write dashboard variables and trigger refresh. See [Dashboard variables](variables.md). |

## Editor features

### Linting

JSHint runs on every keystroke; red gutter markers point to the failing
line. The body is treated as already inside an async function, so
`await` and a top-level `return` are valid. Globals for the six
positional parameters (`data`, `theme`, `echartsInstance`, `echarts`,
`loadMap`, `grafana`) are pre-declared so they don't trigger
"undeclared identifier" warnings.

### Autocomplete

Press **Ctrl-Space** for hints scoped to the parameter surface. Typing
`data.` shows the DataFrame children; `theme.colors.` shows the palette
slots; `grafana.` shows `variables / replace / setVariable / refresh`.
The hint database is hand-curated and lives in
`src/components/echartsHints.ts` — pull requests welcome when ECharts
adds new top-level option keys.

### Async / `await`

The body is wrapped in an async IIFE before evaluation, so any of these
work:

```js
await loadMap('world');
const extra = await fetch('/api/foo').then((r) => r.json());
return { /* … */ };
```

`return` is the value the IIFE resolves with; ECharts receives it via
`setOption(value, true)`.

### Save behavior

Changes are committed when the editor loses focus. There is no explicit
"save" button — click outside the editor (or hit **Tab** out) and the
panel re-renders.

## Follow Grafana theme

Toggle **Follow Grafana Theme** in panel options. The chart inherits
Grafana's full theme palette: series colors come from
`theme.visualization.palette`; text, tooltip, axis, and grid-line colors
come from `theme.colors.*` and `theme.typography`. Custom themes shipped
in newer Grafana versions (e.g. high-contrast) are picked up
automatically.

## Side effects between renders

The body re-runs every time data refreshes. Clear side effects on each
invocation, otherwise listeners stack:

```js
echartsInstance.off('click');
echartsInstance.on('click', (params) => {
  console.log('Clicked:', params);
});
return { /* … */ };
```

This is also the right place to wire `grafana.setVariable` from a click
— see [Dashboard variables → Driving variables from chart interactions](variables.md#driving-variables-from-chart-interactions).

---

← [Home](index.md)
