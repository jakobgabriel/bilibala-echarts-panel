import type { ScopedVars, TypedVariableModel } from '@grafana/data';
import {
  getAppEvents as runtimeGetAppEvents,
  getTemplateSrv as runtimeGetTemplateSrv,
  locationService as runtimeLocationService,
  RefreshEvent,
} from '@grafana/runtime';

export type VariableValue = string | string[];

// Mirrors the @grafana/data InterpolateFunction shape so PanelProps's
// `replaceVariables` plugs in directly (value is required, not optional).
export type ReplaceFn = (
  value: string,
  scopedVars?: ScopedVars,
  format?: string | Function
) => string;

export interface GrafanaHelpers {
  variables: Record<string, VariableValue>;
  replace: (target: string, scopedVars?: ScopedVars, format?: string | Function) => string;
  setVariable: (name: string, value: VariableValue) => void;
  refresh: () => void;
}

export interface GrafanaHelpersDeps {
  getTemplateSrv?: typeof runtimeGetTemplateSrv;
  locationService?: typeof runtimeLocationService;
  getAppEvents?: typeof runtimeGetAppEvents;
}

function readVariables(
  models: TypedVariableModel[]
): Record<string, VariableValue> {
  const out: Record<string, VariableValue> = {};
  for (const v of models) {
    const current = (v as { current?: { value?: unknown } }).current;
    const value = current?.value;
    if (typeof value === 'string' || Array.isArray(value)) {
      out[v.name] = value as VariableValue;
    }
  }
  return out;
}

export function buildGrafanaHelpers(
  replaceVariables: ReplaceFn,
  deps: GrafanaHelpersDeps = {}
): GrafanaHelpers {
  const getTemplateSrv = deps.getTemplateSrv ?? runtimeGetTemplateSrv;
  const locationService = deps.locationService ?? runtimeLocationService;
  const getAppEvents = deps.getAppEvents ?? runtimeGetAppEvents;

  return {
    variables: readVariables(getTemplateSrv().getVariables()),
    replace: (target, scopedVars, format) => replaceVariables(target, scopedVars, format),
    setVariable: (name, value) => {
      locationService.partial({ [`var-${name}`]: value }, true);
    },
    refresh: () => {
      getAppEvents().publish(new RefreshEvent());
    },
  };
}
