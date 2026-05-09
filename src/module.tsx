import { PanelPlugin } from '@grafana/data';
import { SimpleOptions, defaults } from './types';
import { SimplePanel } from './SimplePanel';
import { FieldCMEditor } from './components/FieldCMEditor';
import './style.css';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions((builder) =>
  builder
    .addBooleanSwitch({
      path: 'followTheme',
      name: 'Follow Grafana Theme',
      description: 'Use default theme or follow theme of grafana (light or dark).',
      defaultValue: defaults.followTheme,
    })
    .addCustomEditor({
      id: 'getOption',
      path: 'getOption',
      name: 'Echarts options',
      description: 'Return options called by echarts or just use echartsInstance.setOption(...).',
      defaultValue: defaults.getOption,
      editor: FieldCMEditor,
    })
);
