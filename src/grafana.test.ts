import { buildGrafanaHelpers } from './grafana';
import { funcParams } from './types';
import { RefreshEvent } from '@grafana/runtime';

function makeStubs(variables: Array<{ name: string; current: { value: unknown } }> = []) {
  const partial = jest.fn();
  const publish = jest.fn();
  return {
    partial,
    publish,
    deps: {
      getTemplateSrv: () => ({ getVariables: () => variables }) as unknown as ReturnType<typeof import('@grafana/runtime').getTemplateSrv>,
      locationService: { partial } as unknown as typeof import('@grafana/runtime').locationService,
      getAppEvents: () => ({ publish }) as unknown as ReturnType<typeof import('@grafana/runtime').getAppEvents>,
    },
  };
}

describe('buildGrafanaHelpers', () => {
  it('exposes the four documented members', () => {
    const { deps } = makeStubs();
    const g = buildGrafanaHelpers(() => '', deps);
    expect(typeof g.replace).toBe('function');
    expect(typeof g.setVariable).toBe('function');
    expect(typeof g.refresh).toBe('function');
    expect(g.variables).toEqual({});
  });

  it('flattens variables to a name → current.value map', () => {
    const { deps } = makeStubs([
      { name: 'region', current: { value: 'us-west' } },
      { name: 'servers', current: { value: ['a', 'b'] } },
      { name: 'broken', current: { value: undefined } },
    ]);
    const g = buildGrafanaHelpers(() => '', deps);
    expect(g.variables).toEqual({
      region: 'us-west',
      servers: ['a', 'b'],
    });
  });

  it('passes replace through to the supplied replaceVariables', () => {
    const replace = jest.fn().mockReturnValue('hello us-west');
    const { deps } = makeStubs();
    const g = buildGrafanaHelpers(replace, deps);
    const out = g.replace('hello $region', { foo: { text: 'x', value: 'x' } }, 'csv');
    expect(out).toBe('hello us-west');
    expect(replace).toHaveBeenCalledWith('hello $region', { foo: { text: 'x', value: 'x' } }, 'csv');
  });

  it('setVariable writes ?var-<name>=<value> via locationService.partial (replace=true)', () => {
    const { deps, partial } = makeStubs();
    const g = buildGrafanaHelpers(() => '', deps);
    g.setVariable('region', 'us-east');
    expect(partial).toHaveBeenCalledWith({ 'var-region': 'us-east' }, true);
  });

  it('setVariable forwards arrays untouched for multi-select variables', () => {
    const { deps, partial } = makeStubs();
    const g = buildGrafanaHelpers(() => '', deps);
    g.setVariable('servers', ['a', 'b']);
    expect(partial).toHaveBeenCalledWith({ 'var-servers': ['a', 'b'] }, true);
  });

  it('refresh publishes a RefreshEvent on the app event bus', () => {
    const { deps, publish } = makeStubs();
    const g = buildGrafanaHelpers(() => '', deps);
    g.refresh();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][0]).toBeInstanceOf(RefreshEvent);
  });
});

describe('funcParams (backwards compatibility)', () => {
  it('keeps the legacy 5 params at the same positions so older getOption bodies still bind correctly', () => {
    // The compiled function is built as `new Function(funcParams, body)`.
    // Existing dashboards reference data/theme/echartsInstance/echarts/loadMap
    // by the names declared here; reordering would silently rebind them.
    const names = funcParams.split(',').map((s) => s.trim());
    expect(names.slice(0, 5)).toEqual([
      'data',
      'theme',
      'echartsInstance',
      'echarts',
      'loadMap',
    ]);
    expect(names[5]).toBe('grafana');
  });

  it('a body written for the old 5-arg signature still runs against the new 6-arg compiled fn', () => {
    // Simulates a dashboard authored before `grafana` existed: only references
    // data and theme. Passing a 6th arg must not change behavior.
    const body = 'return { ok: true, mode: theme.type, n: data.series.length };';
    const fn = new Function(funcParams, body) as (...args: unknown[]) => unknown;
    const out = fn(
      { series: [{}, {}] },
      { type: 'dark' },
      null,
      null,
      () => undefined,
      { variables: {}, replace: () => '', setVariable: () => undefined, refresh: () => undefined }
    );
    expect(out).toEqual({ ok: true, mode: 'dark', n: 2 });
  });
});
