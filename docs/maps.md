# Maps

Maps are no longer eagerly bundled into the JS — the plugin ships
GeoJSON files at `/public/plugins/community-echarts-panel/map/*.json`
and you opt in per chart via `loadMap(name)`:

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

`loadMap` is the sixth (and beyond) positional argument of the editor
function; it is also passed inside the `grafana` helper for newer
dashboards. See [Editor contract](editor.md) for the full signature.

## Bundled maps

Every name in the table below ships inside the plugin and loads
offline. Labels are in English unless otherwise noted; bind
`series.data[].name` to the values shown in the **Name example**
column.

| Name | Region | Features | Labels | Name example | License |
| --- | --- | --- | --- | --- | --- |
| `world` | Countries (Natural Earth 50m) | 242 | English | `"United States of America"` | Public domain |
| `usa` | United States (48 contiguous + DC) | 49 | English | `"California"` | MIT |
| `germany` | Bundesländer | 16 | English / German | `"Bayern"` | CC0 |
| `france` | Régions (post-2016) | 13 | French | `"Île-de-France"` | Open Licence 2.0 |
| `united-kingdom` | UK local authorities | 192 | English | `"Cornwall"` | MIT |
| `italy` | Regioni | 20 | Italian | `"Piemonte"` | CC-BY 4.0 |
| `spain` | Comunidades autónomas | 19 | English | `"Andalucia"` | MIT |
| `brazil` | Estados | 27 | Portuguese | `"São Paulo"` | MIT |
| `india` | States | 35 | English | `"Karnataka"` | MIT |
| `japan` | Prefectures | 47 | English (suffix stripped) | `"Kyoto"` | MIT |
| `china` | China provinces (inherited) | 34 | **Chinese only** | `"北京市"` | (upstream) |
| `china-en` | China provinces (English) | 34 | English | `"Beijing"` | MIT |

Total bundled size ~4 MB. Sources, license texts, and per-map quirks
(e.g. Japan's stripped administrative suffixes, the `Heilongjian`
typo fix on `china-en`) are documented in
[`src/map/SOURCES.md`](https://github.com/jakobgabriel/bilibala-echarts-panel/blob/master/src/map/SOURCES.md)
and [`src/map/LICENSES.md`](https://github.com/jakobgabriel/bilibala-echarts-panel/blob/master/src/map/LICENSES.md).

### A note on `nameAscii`

Every English-labeled feature also carries a `properties.nameAscii`
companion with diacritics stripped (`"Île-de-France"` →
`"Ile-de-France"`). Useful when you bind data from a Grafana variable
whose values are ASCII-only:

```js
return {
  series: [{
    type: 'map',
    map: 'france',
    nameMap: Object.fromEntries(
      // Map ASCII variable values back to the canonical feature names.
      yourFranceMapData.features.map((f) => [f.properties.nameAscii, f.properties.name])
    ),
    data: data.series.map(/* … */),
  }],
};
```

## Picking the right China map

The plugin ships two China geometries side-by-side:

```js
// English labels — pick this for international dashboards.
await loadMap('china-en');
return {
  geo: { map: 'china-en', roam: true },
  series: [{ type: 'map', map: 'china-en', data: [
    { name: 'Beijing', value: 12 },
    { name: 'Shanghai', value: 9 },
  ]}],
};

// Chinese labels — preserved for dashboards that bind data by
// Chinese province names. Higher geometry detail than china-en.
await loadMap('china');
return {
  geo: { map: 'china', roam: true },
  series: [{ type: 'map', map: 'china', data: [
    { name: '北京市', value: 12 },
    { name: '上海市', value: 9 },
  ]}],
};
```

`china` is the upstream geometry inherited from the original
`bilibala-echarts-panel` and is preserved unchanged. `china-en` is a
new English-labeled sibling sourced from
[click_that_hood](https://github.com/codeforgermany/click_that_hood)
under MIT; it has slightly lower border detail in exchange for
readable labels and clear provenance.

## Bring your own map

Drop `MyRegion.json` into `src/map/` and rebuild. CopyWebpackPlugin
puts it under `dist/map/`, and `loadMap('MyRegion')` will fetch it
from there. For consistency with the bundled set, run your file
through the same normalization the fetch script applies:

```sh
jq '.features[].properties.name = (.features[].properties.NAME // .features[].properties.name)' \
  MyRegion.geojson > src/map/MyRegion.json
```

## Refreshing the bundled set

Maintainers regenerate the maps with `scripts/fetch-maps.sh`. The
script is idempotent — it downloads each upstream, simplifies via
mapshaper to fit the per-file budget (~600 KB), normalizes label
keys, applies known fixups, and rewrites `src/map/SOURCES.md`. Commit
the resulting JSON files.

```sh
# Refresh everything:
scripts/fetch-maps.sh

# Refresh a subset (e.g., after upstream renamed a region):
scripts/fetch-maps.sh france italy
```

## Remote maps

If you need a region the bundle doesn't ship — or a higher-resolution
variant — toggle **Allow remote maps** in panel options. `loadMap()`
then falls back to `{remoteMapBaseUrl}/<name>.json` (default
jsDelivr's `echarts-maps` package) when the local fetch 404s. Off by
default for air-gapped Grafana installs.

If the remote fetch also fails, the panel shows a `Map "<name>" not
found` overlay. See
[Troubleshooting → Map didn't load](troubleshooting.md#map-not-found)
for the recovery checklist.

---

← [Home](index.md)
