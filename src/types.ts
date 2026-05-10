export const funcParams = 'data, theme, echartsInstance, echarts, loadMap, grafana';

export const DEFAULT_REMOTE_MAP_BASE =
  'https://cdn.jsdelivr.net/npm/echarts-maps@latest';

const funcBody = `const series = data.series.map((s) => {
  const valueField = s.fields.find((f) => f.type === 'number');
  const timeField = s.fields.find((f) => f.type === 'time');
  if (!valueField || !timeField) {
    return null;
  }
  return {
    name: s.name,
    type: 'line',
    showSymbol: false,
    areaStyle: {
      opacity: 0.1,
    },
    lineStyle: {
      width: 1,
    },
    data: valueField.values.map((d, i) => [timeField.values[i], Number(d).toFixed(2)]),
  };
}).filter(Boolean);

const axisOption = {
  axisTick: {
    show: false,
  },
  axisLine: {
    show: false,
  },
  axisLabel: {
    color: 'rgba(128, 128, 128, .9)',
  },
  splitLine: {
    lineStyle: {
      color: 'rgba(128, 128, 128, .2)',
    },
  },
};

return {
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
  },
  legend: {
    left: '0',
    bottom: '0',
    data: data.series.map((s) => s.name),
    textStyle: {
      color: 'rgba(128, 128, 128, .9)',
    },
  },
  xAxis: Object.assign(
    {
      type: 'time',
    },
    axisOption
  ),
  yAxis: Object.assign(
    {
      type: 'value',
      min: 'dataMin',
    },
    axisOption
  ),
  grid: {
    left: 0,
    right: 16,
    top: 6,
    bottom: 24,
    containLabel: true,
  },
  series,
};`;

export interface SimpleOptions {
  followTheme: boolean;
  getOption: string;
  allowRemoteMaps: boolean;
  remoteMapBaseUrl: string;
}

export const defaults: SimpleOptions = {
  followTheme: false,
  getOption: funcBody,
  allowRemoteMaps: false,
  remoteMapBaseUrl: DEFAULT_REMOTE_MAP_BASE,
};
