# Troubleshooting

## Decoding the panel overlays

| You see... | Likely cause |
| --- | --- |
| `Editor content error!` overlay | A syntax error or a runtime throw inside your body. The message is the JS error; check the lint markers in the editor too. |
| `Your function did not return anything.` | You forgot `return` (or returned `undefined`). |
| `Your function returned a <type>.` | You returned a primitive (`string`, `number`, …) instead of a plain ECharts option object. |
| `Map "name" not found` | See [Map didn't load](#map-not-found) below. |
| `Query error` overlay | The upstream Grafana query failed. The chart will redraw automatically when the query recovers. |

## Map didn't load { #map-not-found }

When `loadMap('foo')` 404s, the panel surfaces
`Map "foo" not found at /public/plugins/community-echarts-panel/map/foo.json`.
Pick the matching scenario:

1. **You typed a name that isn't bundled.** Check the
   [bundled-maps table](maps.md#bundled-maps). Names are case-sensitive
   and kebab-case (`united-kingdom`, not `United Kingdom`).
2. **You dropped a custom JSON into `src/map/` but didn't rebuild.**
   Run `npm run build` so CopyWebpackPlugin copies it into `dist/map/`.
   The plugin only serves files that exist under `dist/`.
3. **You want a region the bundle doesn't ship.** Enable **Allow
   remote maps** in panel options. `loadMap()` then falls back to
   the configured `remoteMapBaseUrl` (default jsDelivr's
   `echarts-maps` package). Off by default for air-gapped installs.
4. **You're refreshing the bundled set.** Run
   `scripts/fetch-maps.sh` to re-fetch all upstreams; the script is
   idempotent and rewrites `src/map/SOURCES.md`. See
   [Maps → Refreshing the bundled set](maps.md#refreshing-the-bundled-set).

If you also see "register map failed" or the chart renders without
any features, double-check that the JSON has a `features` array and
that each feature's `properties.name` matches the strings you bind in
`series.data[].name`. The
[`nameAscii` companion property](maps.md#a-note-on-nameascii) helps
when binding via Grafana variables that use ASCII-only values.

## What's new

### Friendlier error overlays

`undefined` and non-object returns no longer silently no-op — they show
a specific message. Compile errors (e.g. missing `}` in your body) are
distinguished from runtime throws and surface immediately, before any
data tick. Upstream query errors (`data.state === 'Error'`) get their
own "Query error" overlay so the panel stops silently masking failed
queries.

### Async `getOption` bodies

The body is wrapped in an async IIFE, so `await` works inside it
without any opt-in. Synchronous `return { ... }` is unchanged. See
[Editor contract → Async / `await`](editor.md#async-await).

### `grafana` helper

A sixth positional parameter exposes `{ variables, replace,
setVariable, refresh }` so chart code can read and write dashboard
variables without importing from `@grafana/runtime` itself. Existing
five-argument bodies keep working unchanged. See
[Dashboard variables](variables.md).

---

← [Home](index.md)
