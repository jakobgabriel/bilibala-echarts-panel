# Install

Pick a variant zip from the [latest release](https://github.com/jakobgabriel/bilibala-echarts-panel/releases/latest):

| Bundled ECharts | Asset                                          | Best for                                       |
| ---             | ---                                            | ---                                            |
| 4.9 (default)   | `community-echarts-panel-echarts4.zip`         | Direct upgrade from upstream `bilibala-echarts-panel` |
| 5.x             | `community-echarts-panel-echarts5.zip`         | New panels, modern ECharts API                 |

```sh
wget -qO /tmp/p.zip https://github.com/jakobgabriel/bilibala-echarts-panel/releases/latest/download/community-echarts-panel-echarts5.zip
sudo unzip -q /tmp/p.zip -d /var/lib/grafana/plugins
sudo systemctl restart grafana-server
```

Add to `grafana.ini`:

```ini
[plugins]
allow_loading_unsigned_plugins = community-echarts-panel
```

For Dockerfile, `grafana-cli`, and bind-mount install paths plus the
upgrade-from-`bilibala-echarts-panel` migration, see the
[README on GitHub](https://github.com/jakobgabriel/bilibala-echarts-panel#install).

---

← [Home](index.md)
