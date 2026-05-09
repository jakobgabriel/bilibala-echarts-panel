import { buildEChartsTheme, themeKey } from './grafanaTheme';

function mockTheme(overrides?: { mode?: 'dark' | 'light'; name?: string }) {
  const mode = overrides?.mode ?? 'dark';
  const palette = ['#FF780A', '#73BF69', '#F2CC0C', '#FADE2A'];
  return {
    name: overrides?.name,
    colors: {
      mode,
      text: {
        primary: '#ccccdc',
        secondary: '#9b9c9e',
        disabled: '#6e6f73',
      },
      border: {
        weak: '#34353a',
        medium: '#404149',
        strong: '#5c5d63',
      },
      background: {
        primary: '#181b1f',
        secondary: '#22252b',
        canvas: '#0e0f12',
      },
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
    },
    visualization: {
      palette,
    },
  } as any;
}

describe('buildEChartsTheme', () => {
  it('uses theme.visualization.palette for series colors', () => {
    const theme = mockTheme();
    const echartsTheme = buildEChartsTheme(theme);
    expect(echartsTheme.color).toEqual(theme.visualization.palette);
  });

  it('routes text and tooltip colors from GrafanaTheme2 paths', () => {
    const theme = mockTheme();
    const echartsTheme = buildEChartsTheme(theme) as any;
    expect(echartsTheme.textStyle.color).toBe(theme.colors.text.primary);
    expect(echartsTheme.textStyle.fontFamily).toBe(theme.typography.fontFamily);
    expect(echartsTheme.tooltip.backgroundColor).toBe(theme.colors.background.primary);
    expect(echartsTheme.tooltip.borderColor).toBe(theme.colors.border.weak);
    expect(echartsTheme.legend.inactiveColor).toBe(theme.colors.text.disabled);
  });

  it('applies the same axis style to category/value/log/time axes', () => {
    const theme = mockTheme();
    const t = buildEChartsTheme(theme) as any;
    expect(t.categoryAxis).toEqual(t.valueAxis);
    expect(t.valueAxis).toEqual(t.logAxis);
    expect(t.logAxis).toEqual(t.timeAxis);
    expect(t.categoryAxis.axisLabel.color).toBe(theme.colors.text.secondary);
  });

  it('uses transparent backgroundColor so the Grafana panel bg shows through', () => {
    expect((buildEChartsTheme(mockTheme()) as any).backgroundColor).toBe('transparent');
  });

  it('does not mutate the input theme', () => {
    const theme = mockTheme();
    const before = JSON.stringify(theme);
    buildEChartsTheme(theme);
    expect(JSON.stringify(theme)).toBe(before);
  });

  it('falls back gracefully when palette is missing', () => {
    const theme = mockTheme();
    delete (theme.visualization as any).palette;
    const t = buildEChartsTheme(theme) as any;
    expect(t.color).toBeUndefined();
    expect(t.textStyle.color).toBe(theme.colors.text.primary);
  });
});

describe('themeKey', () => {
  it('differs between dark and light modes', () => {
    expect(themeKey(mockTheme({ mode: 'dark' }))).not.toBe(themeKey(mockTheme({ mode: 'light' })));
  });

  it('uses theme.name when present (custom theme support)', () => {
    expect(themeKey(mockTheme({ mode: 'dark', name: 'high-contrast' }))).toBe('grafana-high-contrast');
  });

  it('falls back to colors.mode when name is absent', () => {
    expect(themeKey(mockTheme({ mode: 'light' }))).toBe('grafana-light');
  });
});
