import { defaults, type SimpleOptions } from './types';

// Sample panel JSON shape exported from a Grafana 8.5.3 dashboard that
// used `bilibala-echarts-panel`. Grafana stores `panel.type` and
// `panel.options` verbatim; on load it's resolved against the plugin
// declared with `id` matching `panel.type` OR an entry in `aliasIDs`.
//
// `aliasIDs: ["bilibala-echarts-panel"]` in plugin.json is what makes
// these legacy panels resolve to the new `grafana-echarts` plugin
// without any manual edit. The remaining concern is that the stored
// `options` deserializes cleanly into the current SimpleOptions shape.
const legacyPanelOptions = {
  followTheme: true,
  getOption: 'return { series: [] };',
};

const legacyPanelOptionsWithExtras = {
  ...legacyPanelOptions,
  // Older bilibala builds may have persisted these keys; Grafana
  // hands the raw object to the panel and the panel reads only what
  // it knows. Extras must not break loading.
  tickContent: '',
  baidumapKey: '',
  baidumapToken: '',
  googlemapKey: '',
  googlemapToken: '',
  themeName: '',
};

describe('v8.5.3 dashboard migration', () => {
  it('legacy panel options shape contains every current SimpleOptions key', () => {
    const currentKeys = Object.keys(defaults) as Array<keyof SimpleOptions>;
    for (const key of currentKeys) {
      expect(legacyPanelOptions).toHaveProperty(key);
    }
  });

  it('legacy panel options assign cleanly to SimpleOptions', () => {
    const opts: SimpleOptions = { ...defaults, ...legacyPanelOptions };
    expect(opts.followTheme).toBe(true);
    expect(opts.getOption).toBe('return { series: [] };');
  });

  it('extra unknown keys from older bilibala builds do not break the merge', () => {
    const opts: SimpleOptions = { ...defaults, ...legacyPanelOptionsWithExtras };
    expect(opts.followTheme).toBe(true);
    expect(opts.getOption).toBe('return { series: [] };');
  });

  it('a panel with no stored options falls back to current defaults', () => {
    const opts: SimpleOptions = { ...defaults };
    expect(opts.followTheme).toBe(defaults.followTheme);
    expect(opts.getOption).toBe(defaults.getOption);
  });
});
