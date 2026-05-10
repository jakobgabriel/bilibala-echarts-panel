# Maps

Maps are no longer eagerly bundled into the JS — the plugin ships
GeoJSON files at `/public/plugins/community-echarts-panel/map/*.json`
and you opt in via `loadMap(name)`:

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

Bundled names: `china`, `world`, `usa`, `germany`, `france`,
`united-kingdom`, `italy`, `spain`, `brazil`, `india`, `japan`. Sources
and licenses live in
[`src/map/SOURCES.md`](https://github.com/jakobgabriel/bilibala-echarts-panel/blob/master/src/map/SOURCES.md).

## Bring your own map

Drop `MyRegion.json` into `src/map/` and rebuild. The CopyWebpackPlugin
puts it under `dist/map/`, and `loadMap('MyRegion')` will fetch it.

## Remote maps

If your dashboard authors need a region the bundle doesn't ship, toggle
**Allow remote maps** in panel options. `loadMap()` then falls back to
`{remoteMapBaseUrl}/<name>.json` (default jsDelivr) when the local fetch
404s. Off by default for air-gapped Grafana installs.

---

← [Home](index.md)
