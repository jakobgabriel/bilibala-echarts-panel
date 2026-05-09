import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig, { type Env } from './.config/webpack/webpack.config';

// JSHint (used by the CodeMirror lint addon at runtime) pulls in
// `console-browserify`, which transitively requires Node's `util` and
// `assert` modules. Webpack 5 dropped automatic Node-core polyfills; the
// linter never actually exercises those paths, so resolving them as
// `false` (i.e. ignored) is sufficient.
const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);
  return merge(baseConfig, {
    resolve: {
      fallback: {
        util: false,
        assert: false,
      },
    },
  });
};

export default config;
