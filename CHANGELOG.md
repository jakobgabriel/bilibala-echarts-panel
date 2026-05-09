# Change Log

All notable changes to this project will be documented in this file.

## v2.6.0

**Breaking**: plugin id renamed `g-echarts` → `community-echarts-panel`,
and `aliasIDs` removed from `plugin.json`. The plugin now passes the
`@grafana/plugin-validator` schema check, which is the same gate
Grafana's catalog submission flow runs.

- **Plugin id rename: `g-echarts` → `community-echarts-panel`.** Forced
  by the validator's regex
  `^[0-9a-z]+\-([0-9a-z]+\-)?(app|panel|datasource)$` and the
  "org-name-type" naming convention. The new id has 3 hyphen-separated
  parts and ends with `-panel` as required.
- **`aliasIDs` removed from `plugin.json`.** The validator's bundled
  schema rejects `aliasIDs` as an additional property; keeping it via a
  validator config override would still block catalog submission since
  Grafana's catalog-side schema is the same. Trade-off: dashboards
  exported from older versions (`bilibala-echarts-panel`,
  `grafana-echarts`, or v2.5.0 `g-echarts`) no longer transparently
  resolve. Users have to find-replace the panel `type` in dashboard
  JSON; the README's Migration section documents the manual rewrite
  plus a one-liner `find … sed` for bulk migration of provisioned
  dashboards.
- **Variant zips renamed.** Release artifacts are now
  `community-echarts-panel-2.6.0-echarts4.zip` and
  `community-echarts-panel-2.6.0-echarts5.zip` (plus `.sha256`
  sidecars). The plugin folder name and the
  `allow_loading_unsigned_plugins` value also change.
- **Display name updated.** `plugin.json#name`: `"G-ECharts"` →
  `"Community ECharts"`. The visualization picker in Grafana now shows
  "Community ECharts".

### Migration steps

1. Upgrade the plugin (`grafana-cli plugins install` with the new URL,
   or unzip the new zip into `/var/lib/grafana/plugins/`).
2. Set `allow_loading_unsigned_plugins = community-echarts-panel` in
   `grafana.ini` (replacing any earlier id).
3. Find-replace `"type"` values in dashboard JSON using the table in
   the README's Migration section.
4. Restart Grafana.

## v2.5.0

This is the first published release of the Grafana 10–13 fork.
v2.4.0 was developed but never tagged; everything below is the
consolidated changeset between Billiballa's last upstream release
and this one.

- **Plugin id renamed: `bilibala-echarts-panel` → `g-echarts`.**
  Breaking for installs (the plugin folder, install URL, and
  `allow_loading_unsigned_plugins` entry all change). **Not** breaking
  for dashboards: `plugin.json` declares
  `aliasIDs: ["bilibala-echarts-panel", "grafana-echarts"]`, so
  existing dashboards (including those exported from a Grafana 8.5.x
  instance running Billiballa's original `bilibala-echarts-panel`)
  resolve their panels to the new plugin transparently — no manual
  JSON edit needed. The `grafana-echarts` alias also covers anyone who
  built locally from the never-released intermediate commit.
- **Support floor bumped from Grafana 10 to Grafana 11.** `aliasIDs`
  is a Grafana 11+ field; on Grafana 10 the unknown key causes the
  plugin loader to reject `plugin.json` outright (`error="can not set
  alias in plugin.json"`). Grafana 10 has been EOL since August 2024,
  so the cleanest fix is to drop it from the supported range. Users
  on 10.x who need transparent dashboard migration should upgrade to
  Grafana 11+; users who can't upgrade should stay on the upstream
  `bilibala-echarts-panel`.
- Charts now inherit Grafana's full theme palette when **Follow Grafana
  Theme** is on. Series colors come from `theme.visualization.palette`;
  text, tooltip, axis, and grid colors come from `theme.colors.*` and
  `theme.typography`. Custom themes shipped in newer Grafana versions
  (e.g. high-contrast) are picked up automatically. The previous
  behavior — a coarse switch between ECharts's built-in `'dark'` theme
  and its default — is replaced by a `GrafanaTheme2`-derived
  registered theme (`src/grafanaTheme.ts`).
- README overhauled with prominent attribution to **@Billiballa** as
  the originator of the plugin, an explicit credits section, a new
  **Compatibility** section showing the panel-edit view (chart on the
  left, G-ECharts options pane on the right) live-captured from
  Grafana 11.6.14 / 12.4.3 / 13.0.1, and a usage guide with worked
  examples (bar / pie / heatmap). The capture pipeline is checked in
  at `scripts/capture-screenshots.py` (Python Playwright) plus
  `scripts/provisioning/` and `scripts/dashboards/`, and is fully
  reproducible from a freshly built `dist/`.
- Bumped Node engine from `>=22` to `>=24` (matches `.nvmrc`).
- Smoke matrix split into a **gate** (`11.6.14`, `12.4.3`, `13.0.1` —
  must pass) and an **informational** matrix (`8.5.27`, `9.5.21`,
  `10.4.19` — `continue-on-error: true`).
- **Two ECharts variants per release.** The release pipeline now
  publishes two signed zips per tag: `g-echarts-<version>-echarts4.zip`
  (default — bundles ECharts 4.9, the same major upstream
  `bilibala-echarts-panel` shipped) and `g-echarts-<version>-echarts5.zip`
  (bundles ECharts 5.6 + the matching add-on majors). Both share the
  same plugin id, schema, and `aliasIDs`, so dashboards are
  interchangeable; the choice only matters for user-authored
  `getOption` code that targets a specific ECharts API. ECharts 6 is
  intentionally not bundled — at the time of this release the add-on
  ecosystem (`echarts-gl`, `echarts-liquidfill`, `echarts-wordcloud`)
  had not shipped v6-compatible majors. The `package.json` dep stays
  on `^4.9.0` so local `npm install` produces a working v4 build; the
  v5 variant is built in CI via `scripts/build-variant.sh`.
- **`echarts` import is now cross-version-safe.** `src/SimplePanel.tsx`
  switched from a default import (`import echarts from 'echarts'`,
  v4-only) to a namespace import with a `.default` shim, so the same
  source compiles against the v4 or v5 variant.
- **Renovate auto-tracks Grafana versions.** A `renovate.json` config
  watches the smoke matrix (via `# renovate:` comments scoped to the
  gate matrix only — the EOL informational matrix is left alone) and
  the `@grafana/*` npm deps. Patch bumps to `grafana/grafana` are
  marked for auto-merge once CI is green; minor / major remain manual.
  The four ECharts ecosystem packages are explicitly disabled in
  Renovate because `scripts/build-variant.sh` is the source of truth
  for those pins.
- README **Install** section restructured. Three paths are now
  documented (`grafana-cli --pluginUrl`, manual unzip, Docker bind
  mount), each with the variant zip URL and a SHA256-verification
  snippet.
- README image references are absolute (`raw.githubusercontent.com`)
  so they render outside GitHub (e.g. on the Grafana plugin catalog
  if we ever publish there).
- **`@grafana/plugin-validator` is wired into CI.** Every push runs
  `scripts/validate.sh dist` (in `smoke.yml`); the release workflow
  validates each variant zip before signing and publishing
  (`release.yml`). The validator catches catalog-blocking issues
  (relative README links, malformed `plugin.json`, missing fields)
  before they reach a release. Warnings (e.g. shields.io / external
  link-check false positives, sponsorship-link recommendation) are
  surfaced but non-fatal.

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
