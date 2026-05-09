// Static, hand-written autocomplete schema for the FieldCMEditor.
// Goal: surface the four parameters and a small, accurate slice of their
// shapes so users discover the API without us shipping a TypeScript
// language server. Intentionally shallow — the real ECharts option surface
// is huge and fully covered upstream at https://echarts.apache.org/option.html.
export interface HintNode {
  // Children that show up after a `.` or top-level.
  children?: Record<string, HintNode>;
  // Optional one-line documentation rendered in the autocomplete popup.
  doc?: string;
}

const dataFrame: HintNode = {
  doc: 'A Grafana DataFrame: one query result series.',
  children: {
    name: { doc: 'Series name (string).' },
    refId: { doc: 'Query refId (e.g. "A").' },
    length: { doc: 'Row count of this frame.' },
    fields: { doc: 'Array of Field objects (one per column).' },
  },
};

export const ECHARTS_HINTS: Record<string, HintNode> = {
  data: {
    doc: 'PanelData passed to your function.',
    children: {
      series: {
        doc: 'Array of DataFrames returned by the query.',
        children: dataFrame.children,
      },
      state: {
        doc: 'LoadingState: "Done" | "Loading" | "Streaming" | "Error" | "NotStarted".',
      },
      timeRange: {
        doc: 'Selected time range. Has from/to (DateTime) and raw.',
      },
      request: { doc: 'Original DataQueryRequest.' },
    },
  },
  theme: {
    doc: 'GrafanaTheme2 (with a legacy `.type` shim for backwards compat).',
    children: {
      isDark: { doc: 'true when the dark Grafana theme is active.' },
      isLight: { doc: 'true when the light Grafana theme is active.' },
      type: { doc: 'Legacy: "dark" | "light" (provided by the compat shim).' },
      colors: {
        doc: 'theme.colors.{text,border,background,primary,...}',
        children: {
          text: { children: { primary: {}, secondary: {}, disabled: {} } },
          border: { children: { weak: {}, medium: {}, strong: {} } },
          background: { children: { primary: {}, secondary: {}, canvas: {} } },
        },
      },
      typography: {
        children: { fontFamily: {}, fontSize: {} },
      },
      visualization: {
        children: { palette: { doc: 'String[] of series colors.' } },
      },
    },
  },
  echartsInstance: {
    doc: 'The live ECharts instance. Use .on/.off to wire event listeners.',
    children: {
      on: { doc: '(eventName, handler) — subscribe.' },
      off: { doc: '(eventName) — unsubscribe.' },
      setOption: { doc: '(option, notMerge?) — manually update the chart.' },
      getOption: { doc: '() — return the currently merged option.' },
      resize: { doc: '() — re-layout to the container size.' },
      dispatchAction: { doc: '(action) — trigger highlight/select/etc.' },
    },
  },
  echarts: {
    doc: 'The ECharts namespace. Use registerMap, graphic helpers, etc.',
    children: {
      registerMap: { doc: '(name, geoJson) — register a custom map.' },
      registerTheme: { doc: '(name, theme) — register a derived theme.' },
      graphic: { doc: 'Helpers for custom shapes/gradients.' },
      number: { doc: 'Number-formatting helpers (e.g. parseDate).' },
      format: { doc: 'String-formatting helpers (e.g. formatTime).' },
    },
  },
  loadMap: {
    doc:
      'async (name) — fetch and register a map JSON. Looks under the plugin\'s dist/map/ first; falls back to remoteMapBaseUrl if "Allow remote maps" is on.',
  },
};

// Resolve a dotted path like "data.series" or "theme.colors.text" against
// the schema and return the children of the deepest matched node.
export function lookupHints(path: string[]): Record<string, HintNode> | undefined {
  if (path.length === 0) {
    return ECHARTS_HINTS;
  }
  let node: HintNode | undefined = ECHARTS_HINTS[path[0]];
  for (let i = 1; i < path.length; i++) {
    if (!node?.children) {
      return undefined;
    }
    node = node.children[path[i]];
  }
  return node?.children;
}
