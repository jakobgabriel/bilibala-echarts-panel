# Troubleshooting

## Decoding the panel overlays

| You see... | Likely cause |
| --- | --- |
| `Editor content error!` overlay | A syntax error or a runtime throw inside your body. The message is the JS error; check the lint markers in the editor too. |
| `Your function did not return anything.` | You forgot `return` (or returned `undefined`). |
| `Your function returned a <type>.` | You returned a primitive (`string`, `number`, …) instead of a plain ECharts option object. |
| `Map "name" not found` | Either run `scripts/fetch-maps.sh`, drop your own JSON in `src/map/`, or enable **Allow remote maps**. See [Maps](maps.md). |
| `Query error` overlay | The upstream Grafana query failed. The chart will redraw automatically when the query recovers. |

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
