import type { GrafanaTheme2, PanelData } from '@grafana/data';
import { shimData, shimTheme } from './compat';

function makeData(): PanelData {
  return {
    state: 'Done' as any,
    series: [
      {
        name: 'A',
        length: 3,
        fields: [
          { name: 'time', type: 'time' as any, config: {}, values: [1, 2, 3] as any },
          { name: 'value', type: 'number' as any, config: {}, values: [10, 20, 30] as any },
        ],
      },
    ],
    timeRange: {} as any,
  };
}

describe('shimData', () => {
  it('exposes .buffer on plain-array values', () => {
    const data = shimData(makeData());
    const numField = data.series[0].fields[1];
    expect((numField.values as any).buffer).toBe(numField.values);
    expect((numField.values as any).buffer[2]).toBe(30);
  });

  it('is idempotent', () => {
    const data = makeData();
    shimData(data);
    const before = (data.series[0].fields[0].values as any).buffer;
    shimData(data);
    const after = (data.series[0].fields[0].values as any).buffer;
    expect(after).toBe(before);
  });

  it('handles legacy Vector-like values exposing toArray()', () => {
    const arr = [7, 8, 9];
    const vector = {
      length: 3,
      get: (i: number) => arr[i],
      toArray: () => arr.slice(),
    };
    const data: PanelData = {
      state: 'Done' as any,
      series: [
        {
          name: 'A',
          length: 3,
          fields: [{ name: 'v', type: 'number' as any, config: {}, values: vector as any }],
        },
      ],
      timeRange: {} as any,
    };
    shimData(data);
    expect((data.series[0].fields[0].values as any).buffer).toEqual([7, 8, 9]);
  });
});

describe('shimTheme', () => {
  it('adds .type=dark when isDark', () => {
    const theme = { isDark: true, colors: { mode: 'dark' } } as unknown as GrafanaTheme2;
    expect(shimTheme(theme).type).toBe('dark');
  });

  it('adds .type=light when not isDark', () => {
    const theme = { isDark: false, colors: { mode: 'light' } } as unknown as GrafanaTheme2;
    expect(shimTheme(theme).type).toBe('light');
  });

  it('preserves modern accessors', () => {
    const theme = { isDark: true, colors: { mode: 'dark' } } as unknown as GrafanaTheme2;
    const shimmed = shimTheme(theme);
    expect(shimmed.isDark).toBe(true);
    expect(shimmed.colors.mode).toBe('dark');
  });
});
