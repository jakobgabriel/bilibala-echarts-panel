import path from 'path';
import { Compilation, sources, type Compiler } from 'webpack';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

interface LiveReloadPluginOptions {
  port?: number;
  delay?: number;
  appendScriptTag?: boolean;
  protocol?: string;
}

class LiveReloadPlugin {
  options: LiveReloadPluginOptions;
  httpServer: ReturnType<typeof createServer> | null = null;
  server: WebSocketServer | null = null;
  constructor(options: LiveReloadPluginOptions = {}) {
    this.options = Object.assign(
      {
        port: 35729,
        delay: 0,
        appendScriptTag: true,
        protocol: 'http',
      },
      options
    );
  }

  apply(compiler: Compiler) {
    compiler.hooks.afterEmit.tap('LiveReloadPlugin', () => {
      this._startServer();
      this._notifyClient();
    });

    compiler.hooks.done.tap('LiveReloadPlugin', (stats) => {
      if (this.options.appendScriptTag) {
        this._injectLiveReloadScript(stats.compilation);
      }
    });
  }

  _startServer() {
    if (this.server) {
      return;
    }

    const port = this.options.port;

    this.httpServer = createServer((req, res) => {
      if (req.url === '/livereload.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(this._getLiveReloadScript());
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.server = new WebSocketServer({ server: this.httpServer });
    this.httpServer.listen(port, () => {
      console.log(`LiveReload server started on http://localhost:${port}`);
    });
  }

  _notifyClient() {
    if (!this.server) {
      return;
    }

    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ action: 'reload' }));
      }
    });
  }

  _injectLiveReloadScript(compilation: Compilation) {
    compilation.hooks.processAssets.tap(
      {
        name: 'LiveReloadPlugin',
        stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
      },
      (assets) => {
        Object.keys(assets).forEach((filename) => {
          if (path.extname(filename) === '.html') {
            const assetSource = compilation.getAsset(filename)?.source;
            if (!assetSource) {
              return;
            }

            const updatedSource = assetSource
              .source()
              .toString()
              .replace('</body>', `<script src="http://localhost:${this.options.port}/livereload.js"></script></body>`);

            compilation.updateAsset(filename, new sources.RawSource(updatedSource));
          }
        });
      }
    );
  }

  _getLiveReloadScript() {
    return `
      (function() {
        if (typeof WebSocket === 'undefined') return;
        const ws = new WebSocket('${this.options.protocol}://localhost:${this.options.port}');
        ws.onmessage = function(event) {
          const data = JSON.parse(event.data);
          if (data.action === 'reload') {
            window.location.reload();
          }
        };
      })();
    `;
  }
}

export default LiveReloadPlugin;
