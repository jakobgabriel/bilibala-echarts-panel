import type { DataFrame, Field, GrafanaTheme2, PanelData } from '@grafana/data';

const SHIMMED = Symbol.for('bilibala-echarts-panel/shimmed');

export interface CompatTheme extends GrafanaTheme2 {
  type: 'dark' | 'light';
}

function shimField(field: Field): Field {
  const values: any = field.values;
  if (!values || values[SHIMMED]) {
    return field;
  }
  try {
    if (Array.isArray(values)) {
      if (!('buffer' in values)) {
        Object.defineProperty(values, 'buffer', {
          get() {
            return values;
          },
          configurable: true,
        });
      }
    } else if (typeof values.toArray === 'function' && !('buffer' in values)) {
      const arr = values.toArray();
      Object.defineProperty(values, 'buffer', {
        value: arr,
        configurable: true,
      });
    }
    Object.defineProperty(values, SHIMMED, { value: true });
  } catch {
    // values is frozen; nothing we can do — modern Grafana doesn't freeze field values.
  }
  return field;
}

function shimFrame(frame: DataFrame): DataFrame {
  frame.fields.forEach(shimField);
  return frame;
}

export function shimData(data: PanelData): PanelData {
  if ((data as any)[SHIMMED]) {
    return data;
  }
  data.series.forEach(shimFrame);
  try {
    Object.defineProperty(data, SHIMMED, { value: true });
  } catch {
    // ignore
  }
  return data;
}

export function shimTheme(theme: GrafanaTheme2): CompatTheme {
  const compat = theme as CompatTheme;
  if (typeof (compat as any).type === 'undefined') {
    try {
      Object.defineProperty(compat, 'type', {
        get() {
          return theme.isDark ? 'dark' : 'light';
        },
        configurable: true,
      });
    } catch {
      // theme is frozen; user code accessing theme.type will fail loudly which is acceptable.
    }
  }
  return compat;
}
