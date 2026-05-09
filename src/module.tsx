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
    .addBooleanSwitch({
      path: 'allowRemoteMaps',
      name: 'Allow remote maps',
      description:
        'When loadMap("name") cannot find the map locally (under dist/map/), fall back to fetching it from the remote base URL below. Off by default for air-gapped installs.',
      defaultValue: defaults.allowRemoteMaps,
      category: ['Maps'],
    })
    .addTextInput({
      path: 'remoteMapBaseUrl',
      name: 'Remote map base URL',
      description:
        'CDN base used when "Allow remote maps" is on. The map name is appended as `${base}/${name}.json`.',
      defaultValue: defaults.remoteMapBaseUrl,
      category: ['Maps'],
      showIf: (config) => Boolean(config.allowRemoteMaps),
    })
);
