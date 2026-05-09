# Change Log

All notable changes to this project will be documented in this file.

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
