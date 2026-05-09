"""Capture G-ECharts panel screenshots from a running Grafana instance.

Prerequisites:
- A running Grafana 12+ at $GRAFANA_URL (default http://localhost:3000)
  with anonymous Admin access (GF_AUTH_ANONYMOUS_ENABLED=true,
  GF_AUTH_ANONYMOUS_ORG_ROLE=Admin), the g-echarts plugin loaded
  (GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=g-echarts), a TestData
  datasource with uid "testdata", and the dashboard at
  scripts/provisioning/dashboards/g-echarts-demo.json provisioned
  (uid `g-echarts-demo`, panels 1=default, 2=bar, 3=pie).
- Python playwright installed: pip install playwright && playwright install chromium

Output:
- Six PNGs written to $OUT (default src/img/) named usage-*.png.
"""

import os
from playwright.sync_api import sync_playwright

GRAFANA = os.environ.get("GRAFANA_URL", "http://localhost:3000")
DASH_UID = "g-echarts-demo"
OUT = os.environ.get("OUT", "src/img")


def wait_for_canvas(page, timeout_ms=15000):
    """Wait for the ECharts <canvas> inside the visible panel to render."""
    page.wait_for_selector("canvas", state="visible", timeout=timeout_ms)
    # ECharts paints in animation frames; give it a beat
    page.wait_for_timeout(1500)


def screenshot_panel(page, panel_id, out_path, theme="dark"):
    """Open d-solo (single-panel kiosk view) and screenshot the panel area."""
    url = (
        f"{GRAFANA}/d-solo/{DASH_UID}/g-echarts-demo"
        f"?orgId=1&panelId={panel_id}&theme={theme}"
        f"&from=now-6h&to=now&__feature.dashboardSceneSolo=true"
    )
    page.set_viewport_size({"width": 900, "height": 520})
    page.goto(url, wait_until="networkidle")
    wait_for_canvas(page)
    page.screenshot(path=out_path, full_page=False)
    print(f"  saved {out_path}")


def screenshot_dashboard(page, out_path, theme="dark"):
    page.set_viewport_size({"width": 1600, "height": 1000})
    page.goto(
        f"{GRAFANA}/d/{DASH_UID}/g-echarts-demo?orgId=1&theme={theme}&kiosk",
        wait_until="networkidle",
    )
    wait_for_canvas(page)
    page.screenshot(path=out_path, full_page=False)
    print(f"  saved {out_path}")


def screenshot_panel_picker(page, out_path):
    """Visualization picker showing G-ECharts."""
    page.set_viewport_size({"width": 1600, "height": 1000})
    # Open the dashboard, then the bar panel's edit view
    page.goto(
        f"{GRAFANA}/d/{DASH_UID}/g-echarts-demo?orgId=1&editPanel=2&theme=dark",
        wait_until="networkidle",
    )
    wait_for_canvas(page)
    # Click the visualization-picker dropdown — Grafana 12 puts the current viz
    # type as a button near the top of the right pane.
    candidates = [
        'button:has-text("G-ECharts")',
        'button:has-text("Visualization")',
        '[aria-label*="visualization" i]',
        '[data-testid*="visualization" i]',
    ]
    opened = False
    for sel in candidates:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=1000):
                el.click()
                opened = True
                break
        except Exception:
            continue
    if not opened:
        print("  WARN: could not find visualization picker button; "
              "saving plain edit view instead")
    page.wait_for_timeout(1500)
    # Type into the search if possible
    try:
        search = page.get_by_placeholder("Search for...", exact=False).first
        if search.is_visible(timeout=1000):
            search.fill("g-echarts")
            page.wait_for_timeout(800)
    except Exception:
        pass
    page.screenshot(path=out_path, full_page=False)
    print(f"  saved {out_path}")


def screenshot_options_editor(page, out_path):
    """Panel edit view focused on the right-hand options pane."""
    page.set_viewport_size({"width": 1600, "height": 1000})
    page.goto(
        f"{GRAFANA}/d/{DASH_UID}/g-echarts-demo?orgId=1&editPanel=2&theme=dark",
        wait_until="networkidle",
    )
    wait_for_canvas(page)
    # Try to scroll the options pane to the "Echarts options" code editor
    try:
        page.get_by_text("Echarts options", exact=False).first.scroll_into_view_if_needed(timeout=2000)
    except Exception:
        pass
    page.wait_for_timeout(800)
    page.screenshot(path=out_path, full_page=False)
    print(f"  saved {out_path}")


def main():
    os.makedirs(OUT, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        ctx = browser.new_context(
            viewport={"width": 1600, "height": 1000},
            device_scale_factor=1,
        )
        page = ctx.new_page()

        # Grafana boot can finish before the plugin is ready in the frontend
        # asset map; warm the assets.
        page.goto(f"{GRAFANA}/login", wait_until="networkidle")
        page.wait_for_timeout(1500)

        print("• bar chart (dark)")
        screenshot_panel(page, 2, f"{OUT}/usage-bar-chart.png", theme="dark")

        print("• pie chart (dark)")
        screenshot_panel(page, 3, f"{OUT}/usage-pie-chart.png", theme="dark")

        print("• default chart, theme=dark")
        screenshot_panel(page, 2, f"{OUT}/usage-theme-dark.png", theme="dark")

        print("• default chart, theme=light")
        screenshot_panel(page, 2, f"{OUT}/usage-theme-light.png", theme="light")

        print("• panel picker")
        screenshot_panel_picker(page, f"{OUT}/usage-add-panel.png")

        print("• options editor")
        screenshot_options_editor(page, f"{OUT}/usage-options-editor.png")

        browser.close()


if __name__ == "__main__":
    main()
