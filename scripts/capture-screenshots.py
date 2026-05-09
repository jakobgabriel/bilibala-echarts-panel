"""Capture G-ECharts panel-edit screenshots across Grafana v11/v12/v13.

For each Grafana major, the script:
  1. Boots `grafana/grafana:<patch>` with the local dist mounted as the
     community-echarts-panel plugin and the demo dashboard provisioned.
  2. Creates the TestData datasource (uid=`testdata`) via Grafana's HTTP API.
  3. Opens the panel-edit view of the bar-chart panel (panel id 2).
  4. Screenshots the full 1600×1000 viewport — chart on the left,
     G-ECharts options pane (Follow Theme toggle + Echarts options
     Monaco editor) on the right.
  5. Writes `src/img/usage-edit-grafana-<major>.png`.
  6. Stops + removes the container.

Prerequisites:
  - Docker daemon running.
  - The plugin built (`npm run build` so dist/ exists).
  - Python playwright + a chromium binary reachable at $PLAYWRIGHT_BROWSERS_PATH.

Run:
  PLAYWRIGHT_BROWSERS_PATH=/path/to/ms-playwright \
  python3 scripts/capture-screenshots.py
"""

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent
GRAFANA = os.environ.get("GRAFANA_URL", "http://localhost:3000")
DASH_UID = "community-echarts-panel-demo"
OUT = Path(os.environ.get("OUT", REPO / "src" / "img"))

VERSIONS = [
    ("11", "11.6.14"),
    ("12", "12.4.3"),
    ("13", "13.0.1"),
]


def http_get(url, timeout=2):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def http_post(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, r.read()


def wait_for_health(timeout_s=60):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            status, _ = http_get(f"{GRAFANA}/api/health")
            if status == 200:
                return
        except (urllib.error.URLError, ConnectionError):
            pass
        time.sleep(1)
    raise RuntimeError(f"Grafana not healthy within {timeout_s}s")


def ensure_datasource():
    try:
        http_post(
            f"{GRAFANA}/api/datasources",
            {
                "name": "TestData",
                "type": "grafana-testdata-datasource",
                "uid": "testdata",
                "access": "proxy",
                "isDefault": True,
            },
        )
    except urllib.error.HTTPError as e:
        # 409 = already exists; fine
        if e.code != 409:
            raise


def wait_for_dashboard(timeout_s=20):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            status, body = http_get(
                f"{GRAFANA}/api/search?query=community-echarts-panel", timeout=2
            )
            if status == 200 and DASH_UID.encode() in body:
                return
        except (urllib.error.URLError, ConnectionError):
            pass
        time.sleep(1)
    raise RuntimeError(f"Dashboard {DASH_UID} not provisioned in {timeout_s}s")


def docker(*args, check=True):
    return subprocess.run(["docker", *args], check=check, capture_output=True, text=True)


def boot_grafana(version_tag, container_name):
    docker("rm", "-f", container_name, check=False)
    docker(
        "run", "-d",
        "--name", container_name,
        "-p", "3000:3000",
        "-v", f"{REPO}/dist:/var/lib/grafana/plugins/community-echarts-panel:ro",
        "-v", f"{REPO}/scripts/provisioning:/etc/grafana/provisioning:ro",
        "-v", f"{REPO}/scripts/dashboards:/var/lib/grafana/dashboards:ro",
        "-e", "GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=community-echarts-panel",
        "-e", "GF_AUTH_ANONYMOUS_ENABLED=true",
        "-e", "GF_AUTH_ANONYMOUS_ORG_ROLE=Admin",
        "-e", "GF_LOG_LEVEL=warn",
        f"grafana/grafana:{version_tag}",
    )
    wait_for_health()
    ensure_datasource()
    wait_for_dashboard()


def stop_grafana(container_name):
    docker("rm", "-f", container_name, check=False)


def capture_edit_view(page, out_path):
    page.set_viewport_size({"width": 1600, "height": 1000})
    page.goto(
        f"{GRAFANA}/d/{DASH_UID}/community-echarts-panel-demo?orgId=1&editPanel=2&theme=dark",
        wait_until="networkidle",
        timeout=45000,
    )
    page.wait_for_selector("canvas", state="visible", timeout=20000)
    # ECharts paints in animation frames; let layout settle
    page.wait_for_timeout(2000)
    # Best-effort: scroll right pane to the "Echarts options" group so the
    # Monaco editor is visible.
    try:
        page.get_by_text("Echarts options", exact=False).first \
            .scroll_into_view_if_needed(timeout=2000)
    except Exception:
        pass
    page.wait_for_timeout(800)
    page.screenshot(path=str(out_path))
    print(f"  saved {out_path}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 1600, "height": 1000})
        page = ctx.new_page()
        for major, tag in VERSIONS:
            container = f"community-echarts-panel-shots-{major}"
            print(f"• Grafana {tag}")
            boot_grafana(tag, container)
            try:
                capture_edit_view(
                    page, OUT / f"usage-edit-grafana-{major}.png"
                )
            finally:
                stop_grafana(container)
        browser.close()


if __name__ == "__main__":
    sys.exit(main() or 0)
