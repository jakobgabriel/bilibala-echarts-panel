import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LoadingState, PanelProps } from '@grafana/data';
import { useTheme2 } from '@grafana/ui';
import debounce from 'lodash/debounce';
import * as echartsNs from 'echarts';
// ECharts 4 ships a default export; v5+ ships only a namespace. The shim
// makes both work so the same source compiles against either variant.
const echarts: typeof echartsNs = (echartsNs as { default?: typeof echartsNs }).default ?? echartsNs;
import { css, cx } from '@emotion/css';
import { SimpleOptions, funcParams, DEFAULT_REMOTE_MAP_BASE } from './types';
import { shimData, shimTheme } from './compat';
import { buildEChartsTheme, themeKey } from './grafanaTheme';
import { buildGrafanaHelpers } from './grafana';

// just comment it if don't need it
import 'echarts-wordcloud';
import 'echarts-liquidfill';
import 'echarts-gl';

const styles = {
  tips: css`
    padding: 0 10%;
    height: 100%;
    background: rgba(128, 128, 128, 0.1);
    overflow: auto;
  `,
  tipsTitle: css`
    margin: 48px 0 32px;
    text-align: center;
  `,
  wrapper: css`
    position: relative;
  `,
};

// Module-scoped registration cache. echarts.registerMap is global, so once a
// map has been loaded any panel in the same tab can reference it.
const mapRegistered = new Set<string>();
const mapInflight = new Map<string, Promise<void>>();

function pluginAssetBaseUrl(): string {
  // grafana-public-path.js (injected by the webpack config) sets
  // __webpack_public_path__ to the served plugin URL. Fall back to the
  // canonical Grafana path so this still works under tests.
  // @ts-expect-error - injected by webpack
  const wpp: string | undefined = typeof __webpack_public_path__ !== 'undefined' ? __webpack_public_path__ : undefined;
  return wpp || 'public/plugins/community-echarts-panel/';
}

function makeLoadMap(allowRemote: boolean, remoteBase: string) {
  return async function loadMap(name: string): Promise<void> {
    if (mapRegistered.has(name)) {
      return;
    }
    let inflight = mapInflight.get(name);
    if (!inflight) {
      inflight = (async () => {
        const localUrl = `${pluginAssetBaseUrl()}map/${name}.json`;
        let json: unknown;
        let localErr: string | undefined;
        try {
          const res = await fetch(localUrl);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          json = await res.json();
        } catch (err) {
          localErr = (err as Error).message;
          if (!allowRemote) {
            throw new Error(
              `Map "${name}" not found at ${localUrl}. Drop ${name}.json into src/map/ and rebuild, or enable "Allow remote maps" in panel options.`
            );
          }
          const remoteUrl = `${remoteBase.replace(/\/$/, '')}/${name}.json`;
          try {
            const res = await fetch(remoteUrl);
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            json = await res.json();
          } catch (remoteErr) {
            throw new Error(
              `Map "${name}" could not be loaded. Local (${localUrl}): ${localErr}. Remote (${remoteUrl}): ${(remoteErr as Error).message}.`
            );
          }
        }
        echarts.registerMap(name, json as Parameters<typeof echarts.registerMap>[1]);
        mapRegistered.add(name);
      })().finally(() => {
        mapInflight.delete(name);
      });
      mapInflight.set(name, inflight);
    }
    await inflight;
  };
}

interface Tip {
  title: string;
  body: string;
}

export const SimplePanel: React.FC<PanelProps<SimpleOptions>> = ({
  options,
  data,
  width,
  height,
  replaceVariables,
}) => {
  const theme = useTheme2();
  const compatTheme = useMemo(() => shimTheme(theme), [theme]);
  const compatData = useMemo(() => shimData(data), [data]);
  const echartsTheme = useMemo(() => buildEChartsTheme(theme), [theme]);
  // Rebuilt every render so `grafana.variables` always reflects the latest
  // values from getTemplateSrv(); cheap (a getVariables + array reduce) and
  // only ever read by the user's compiled fn via stateRef, so a fresh
  // identity per render does not trigger any extra React work.
  const grafana = buildGrafanaHelpers(replaceVariables);

  const echartRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<echarts.ECharts>();
  const [tips, setTips] = useState<Tip | undefined>();

  // Compile the user-supplied body once per source change. The body is
  // wrapped in an async IIFE so users can `await loadMap(...)` etc.; a
  // plain `return { ... }` still works because it's the arrow's return.
  const compiled = useMemo<{
    fn: ((...args: unknown[]) => Promise<unknown>) | null;
    error: Error | null;
  }>(() => {
    try {
      const fn = new Function(
        funcParams,
        `"use strict"; return (async () => {\n${options.getOption}\n})();`
      ) as (...args: unknown[]) => Promise<unknown>;
      return { fn, error: null };
    } catch (err) {
      return { fn: null, error: err as Error };
    }
  }, [options.getOption]);

  const loadMap = useMemo(
    () =>
      makeLoadMap(
        Boolean(options.allowRemoteMaps),
        options.remoteMapBaseUrl || DEFAULT_REMOTE_MAP_BASE
      ),
    [options.allowRemoteMaps, options.remoteMapBaseUrl]
  );

  // The debounced reset reads the latest props through a ref so we can keep
  // a single stable debounced instance across renders (the previous code
  // recreated the debounce on every render, which silently broke it).
  // The ref is refreshed in an effect so we don't write to it during render.
  const stateRef = useRef({ chart, compiled, compatData, compatTheme, data, loadMap, grafana });
  useEffect(() => {
    stateRef.current = { chart, compiled, compatData, compatTheme, data, loadMap, grafana };
  });

  const resetOption = useMemo(
    () =>
      debounce(
        // The callback is intentionally a closure over the ref; the lint
        // rule worries about reads during render but this only ever fires
        // from a debounced timer (or a useEffect-driven invocation).
        // eslint-disable-next-line react-hooks/refs
        () => {
          const s = stateRef.current;
          const c = s.chart;
          if (!c) {
            return;
          }
          // ECharts disposes asynchronously w.r.t. React; guard so a late
          // debounce fire after a teardown can't touch a dead instance.
          if (
            typeof (c as { isDisposed?: () => boolean }).isDisposed === 'function' &&
            (c as { isDisposed: () => boolean }).isDisposed()
          ) {
            return;
          }
          if (s.data.state === LoadingState.Error) {
            const errs = s.data.errors?.map((e) => e.message).filter(Boolean) || [];
            const body = errs.length
              ? errs.join('\n')
              : 'The query that feeds this panel failed; the chart will redraw when the query recovers.';
            setTips({ title: 'Query error', body });
            return;
          }
          if (
            s.data.state &&
            s.data.state !== LoadingState.Done &&
            s.data.state !== LoadingState.Streaming
          ) {
            return;
          }
          if (s.compiled.error) {
            setTips({ title: 'Editor content error!', body: s.compiled.error.message });
            return;
          }
          if (!s.compiled.fn) {
            return;
          }
          setTips(undefined);
          s.compiled
            .fn(s.compatData, s.compatTheme, c, echarts, s.loadMap, s.grafana)
            .then((o) => {
              if (o == null) {
                setTips({
                  title: 'Editor content error!',
                  body:
                    'Your function did not return anything. Add `return { ... }` with an ECharts option object.',
                });
                return;
              }
              if (typeof o !== 'object') {
                setTips({
                  title: 'Editor content error!',
                  body: `Your function returned a ${typeof o}. Return a plain ECharts option object.`,
                });
                return;
              }
              if (
                typeof (c as { isDisposed?: () => boolean }).isDisposed === 'function' &&
                (c as { isDisposed: () => boolean }).isDisposed()
              ) {
                return;
              }
              // ECharts 4 exports `EChartOption`; v5+ renamed it to
              // `EChartsOption`. The shape is the same and `setOption`
              // accepts an unknown record either way; cast loosely.
              c.setOption(o as Parameters<typeof c.setOption>[0], true);
            })
            .catch((err: Error) => {
              console.error('Editor content error!', err);
              setTips({ title: 'Editor content error!', body: err.stack || err.message });
            });
        },
        150,
        { leading: true }
      ),
    []
  );

  useEffect(() => () => resetOption.cancel(), [resetOption]);

  // Initialise / re-init the ECharts instance whenever the resolved theme
  // object or the followTheme toggle changes. ECharts requires a full
  // re-init for theme switching, so we cannot avoid the dispose+init pair.
  useEffect(() => {
    if (!echartRef.current) {
      return;
    }
    const key = themeKey(theme);
    echarts.registerTheme(key, echartsTheme);
    const next = echarts.init(echartRef.current, options.followTheme ? key : undefined);
    setChart(next);
    return () => {
      resetOption.cancel();
      next.clear();
      next.dispose();
    };
  }, [options.followTheme, theme, echartsTheme, resetOption]);

  useEffect(() => {
    chart?.resize();
  }, [chart, width, height]);

  useEffect(() => {
    if (chart) {
      resetOption();
    }
  }, [chart, options.getOption, data, options.allowRemoteMaps, options.remoteMapBaseUrl, resetOption]);

  return (
    <>
      {tips && (
        <div className={styles.tips}>
          <h5 className={styles.tipsTitle}>{tips.title}</h5>
          {tips.body.split('\n').map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
      )}
      <div
        ref={echartRef}
        className={cx(
          styles.wrapper,
          css`
            width: ${width}px;
            height: ${height}px;
          `
        )}
      />
    </>
  );
};
