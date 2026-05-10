# Community ECharts panel

A maintained fork of [bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel)
for Grafana 11–13. Authors a single function body in a CodeMirror editor
and renders the result with [Apache ECharts™](https://echarts.apache.org/).

The README on GitHub is the canonical install/migration reference. These
pages are the runtime cookbook — what to write inside the editor, and
what the panel gives you to work with.

[GitHub repo](https://github.com/jakobgabriel/bilibala-echarts-panel){ .md-button }
[Releases](https://github.com/jakobgabriel/bilibala-echarts-panel/releases){ .md-button }

## In this guide

| Page | What's there |
| --- | --- |
| [Install](install.md) | Pick a variant zip, drop it into `/var/lib/grafana/plugins`, register the unsigned id in `grafana.ini`. |
| [Editor contract](editor.md) | The function signature, the six positional parameters, lint + autocomplete + async-await behavior, side effects, theme follow. |
| [Cookbook](cookbook.md) | Worked examples — bar / pie / heatmap. The README links here. |
| [Dashboard variables](variables.md) | The `grafana` helper: read variables, interpolate templates, drive variables from clicks, trigger refresh. |
| [Maps](maps.md) | `loadMap(name)`, the bundled set, bring-your-own GeoJSON, the remote fallback. |
| [Troubleshooting](troubleshooting.md) | Decoding the error overlays; what's new in recent releases. |

## License

Apache-2.0. The original `LICENSE` from
[Billiballa/bilibala-echarts-panel](https://github.com/Billiballa/bilibala-echarts-panel)
is preserved unchanged.

Powered by **Apache ECharts™**, a trademark of The Apache Software
Foundation. This project is not affiliated with, endorsed by, or sponsored
by The Apache Software Foundation, Apache ECharts, or Grafana Labs.
