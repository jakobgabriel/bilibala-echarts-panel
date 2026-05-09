import grafanaConfig from './.config/eslint.config.mjs';

export default [
  ...grafanaConfig,
  {
    ignores: ['dist/**', 'node_modules/**', '.config/**', 'src/map/*.json'],
  },
];
