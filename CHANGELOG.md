# Change Log

All notable changes to this project will be documented in this file.

## v2.4.0

- **Plugin id renamed: `bilibala-echarts-panel` → `grafana-echarts`.**
  This is breaking for installs (the plugin folder, install URL, and
  `allow_loading_unsigned_plugins` entry all change). It is **not**
  breaking for dashboards: `plugin.json` declares
  `aliasIDs: ["bilibala-echarts-panel"]`, so existing dashboards
  (including those exported from a Grafana 8.5.x instance running the
  original `bilibala-echarts-panel`) resolve their panels to the new
  plugin transparently — no manual JSON edit needed.
- Charts now inherit Grafana's full theme palette when **Follow Grafana
  Theme** is on. Series colors come from `theme.visualization.palette`;
  text, tooltip, axis, and grid colors come from `theme.colors.*` and
  `theme.typography`. Custom themes shipped in newer Grafana versions
  (e.g. high-contrast) are picked up automatically. The previous
  behavior — a coarse switch between ECharts's built-in `'dark'` theme
  and its default — is replaced by a `GrafanaTheme2`-derived
  registered theme (`src/grafanaTheme.ts`).
- Bumped Node engine from `>=22` to `>=24` (matches `.nvmrc`).
- Smoke matrix expanded to the actual last patch of every supported
  major: `8.5.27`, `9.5.21`, `10.4.19`, `11.6.14`, `12.4.3`, `13.0.1`.

ECharts 5→6 migration note (also applies if you are coming from the
Grafana 8.5 era): if your `getOption` body uses the legacy
`series[].lineStyle.normal` / `series[].itemStyle.normal` syntax
(deprecated in ECharts 4, removed in 5), flatten it:
`series[].lineStyle` / `series[].itemStyle`. The vast majority of
chart code is data-driven and unaffected.

The user-visible chart function signature `(data, theme,
echartsInstance, echarts)` is unchanged. `theme.type` and
`field.values.buffer` are still shimmed for backwards compatibility.

## v2.3.0

- Compatible with Grafana 10, 11, 12, and 13.
- Migrated build tooling from `@grafana/toolkit` to `@grafana/create-plugin`
  (Webpack 5 + SWC + Jest 29).
- Replaced `withTheme` HOC + `GrafanaTheme` with the `useTheme2` hook.
- Added a transparent compatibility shim (`src/compat.ts`) so existing
  user-authored chart code keeps working unchanged: `field.values.buffer`
  and `theme.type` remain accessible on top of modern Grafana data and
  theme objects.
- Dropped the legacy Grafana 6 dual-plugin path (`SimpleEditor.tsx`,
  `MyField.tsx`).
- Replaced `emotion@10` with `@emotion/css`.
- Bumped Node engine to `>=22`.

The user-visible chart function signature `(data, theme, echartsInstance,
echarts)` is unchanged.

## v1.0.0

Initial Release
