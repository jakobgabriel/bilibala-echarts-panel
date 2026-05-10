import type { GrafanaTheme2 } from '@grafana/data';

type ThemeLike = Pick<GrafanaTheme2, 'colors' | 'typography' | 'visualization'> & { name?: string };

export function buildEChartsTheme(theme: ThemeLike): Record<string, unknown> {
  const palette = Array.isArray(theme.visualization?.palette) ? theme.visualization.palette : undefined;
  const axis = {
    axisLine: { lineStyle: { color: theme.colors.border.medium } },
    axisTick: { lineStyle: { color: theme.colors.border.medium } },
    axisLabel: { color: theme.colors.text.secondary },
    splitLine: { lineStyle: { color: [theme.colors.border.weak] } },
    splitArea: { areaStyle: { color: ['transparent'] } },
  };

  return {
    color: palette,
    backgroundColor: 'transparent',
    textStyle: {
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily,
    },
    title: {
      textStyle: { color: theme.colors.text.primary },
      subtextStyle: { color: theme.colors.text.secondary },
    },
    legend: {
      textStyle: { color: theme.colors.text.primary },
      inactiveColor: theme.colors.text.disabled,
    },
    tooltip: {
      backgroundColor: theme.colors.background.primary,
      borderColor: theme.colors.border.weak,
      textStyle: { color: theme.colors.text.primary },
    },
    categoryAxis: axis,
    valueAxis: axis,
    logAxis: axis,
    timeAxis: axis,
    grid: { borderColor: theme.colors.border.weak },
  };
}

export function themeKey(theme: ThemeLike): string {
  return `grafana-${theme.name ?? theme.colors.mode}`;
}
