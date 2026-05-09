# Grafana ECharts Panel

![release](https://img.shields.io/github/v/release/jakobgabriel/bilibala-echarts-panel)
![issues](https://img.shields.io/github/issues-closed/jakobgabriel/bilibala-echarts-panel)
![stars](https://img.shields.io/github/stars/jakobgabriel/bilibala-echarts-panel?style=social)

ECharts panel for Grafana 10–13, written in React.

A code editor is attached to the panel options to configure the option object passed to [Apache ECharts™](https://echarts.apache.org/).

Supports [echarts-wordcloud](https://github.com/ecomfe/echarts-wordcloud), [echarts-liquidfill](https://github.com/ecomfe/echarts-liquidfill), and [echarts-gl](https://github.com/ecomfe/echarts-gl).

![screenshot](src/img/screenshot.png)

## Install

This plugin is distributed as a GitHub Release zip. The Grafana plugin id is `grafana-echarts`.

```sh
grafana-cli --pluginUrl https://github.com/jakobgabriel/bilibala-echarts-panel/releases/download/v2.4.0/grafana-echarts.zip plugins install grafana-echarts
```

Or unpack the zip into `/var/lib/grafana/plugins/grafana-echarts` and restart Grafana.

The plugin is unsigned (community-tier signing); allow it explicitly:

```ini
# grafana.ini
[plugins]
allow_loading_unsigned_plugins = grafana-echarts
```

## Migrating from `bilibala-echarts-panel`

If you have dashboards from a Grafana 8.5.x instance that used the original `bilibala-echarts-panel`, **no manual edit is needed**. This plugin declares `aliasIDs: ["bilibala-echarts-panel"]` in its `plugin.json`, so Grafana transparently resolves panels with the legacy `"type": "bilibala-echarts-panel"` to `grafana-echarts`. The stored panel options (`followTheme`, `getOption`, …) deserialize cleanly.

The bundled ECharts version was bumped from 4.x to 6.x. Most user-authored `getOption` code is data-driven and unaffected, but if your chart used the legacy `series[].lineStyle.normal` / `series[].itemStyle.normal` syntax (deprecated in ECharts 4, removed in 5), flatten it: `series[].lineStyle` / `series[].itemStyle`.

## Usage notes

The function body in the panel's options receives `(data, theme, echartsInstance, echarts)`. Side effects (event listeners, intervals) must be cleared on each invocation:

```js
function (data, theme, echartsInstance, echarts) {
  echartsInstance.off('click'); // clear previous handler
  echartsInstance.on('click', () => {
    console.log('Click!');
  });
  return { /* ECharts option */ };
}
```

`theme` is the modern `GrafanaTheme2`; legacy `theme.type` (`'dark' | 'light'`) is shimmed in for backwards compatibility. `data.series[i].fields[j].values` is a plain array; legacy `.values.buffer` access is also shimmed.

When **Follow Grafana Theme** is on the chart inherits Grafana's full theme palette — series colors, text, tooltip, axis, and grid line colors all come from `theme.visualization.palette` and `theme.colors.*`. Custom themes shipped in newer Grafana versions are picked up automatically.

To register a map, add `YourMap.json` to `src/map/`, run `npm run build`, and the panel auto-registers it (`echarts.registerMap('YourMap', …)`).

## Develop

```sh
nvm use         # Node 24
npm install
npm run dev     # webpack watch
npm run server  # docker compose up grafana with the plugin mounted
npm run test:ci
npm run typecheck
npm run lint
npm run build
```

## Fork notice

This is a maintained fork of [Billiballa/bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel) (Apache-2.0). The fork modernizes the build for Grafana 10–13 (drops `@grafana/toolkit`, migrates to `@grafana/create-plugin`, ECharts 6, React 18, Node 24) while keeping the user-facing `(data, theme, echartsInstance, echarts)` contract intact via the compatibility shim in `src/compat.ts`.

The original `LICENSE` (Apache-2.0) is preserved unchanged.

## Trademarks

Powered by **Apache ECharts™**, a trademark of The Apache Software Foundation.

This project is not affiliated with, endorsed by, or sponsored by The Apache Software Foundation, Apache ECharts, or Grafana Labs.

## License

Apache-2.0. See [LICENSE](./LICENSE).
