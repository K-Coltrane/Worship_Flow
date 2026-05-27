const { app, BrowserWindow, dialog, shell } = require('electron');
const { createReadStream, statSync } = require('node:fs');
const { createServer } = require('node:http');
const path = require('node:path');

const BACKEND_PORT = 3001;

let backendApp;
let uiServer;

function appFile(...segments) {
  const root = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..');
  return path.join(root, ...segments);
}

function contentTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.gif':
      return 'image/gif';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function resolveStaticFile(root, requestPath) {
  const normalizedRoot = path.resolve(root);
  const safeRequestPath = decodeURIComponent(requestPath).replace(/\\/g, '/');
  const requestedPath = path.resolve(
    normalizedRoot,
    safeRequestPath === '/' ? 'index.html' : `.${safeRequestPath}`,
  );

  if (requestedPath !== normalizedRoot && !requestedPath.startsWith(`${normalizedRoot}${path.sep}`)) {
    return undefined;
  }

  try {
    const stats = statSync(requestedPath);
    if (stats.isFile()) {
      return requestedPath;
    }
  } catch {
    // Fall through to the SPA entry point.
  }

  return path.join(normalizedRoot, 'index.html');
}

function startStaticServer(root) {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      const filePath = resolveStaticFile(root, requestUrl.pathname);

      if (!filePath) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentTypeFor(filePath),
      });
      createReadStream(filePath).pipe(response);
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      uiServer = server;
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function startBackend() {
  if (!process.env.PORT) {
    process.env.PORT = String(BACKEND_PORT);
  }
  if (!process.env.WORSHIP_DB_PATH) {
    process.env.WORSHIP_DB_PATH = path.join(app.getPath('userData'), 'worship.sqlite');
  }

  const backend = require(appFile('server', 'dist', 'main.js'));
  backendApp = await backend.bootstrap();
}

async function createMainWindow(uiUrl) {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#020617',
    title: 'Lumina Worship',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const backendUrl = `http://127.0.0.1:${process.env.PORT ?? BACKEND_PORT}`;
  await mainWindow.loadURL(`${uiUrl}/?api=${encodeURIComponent(backendUrl)}`);
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    const uiUrl = await startStaticServer(appFile('dist'));
    await createMainWindow(uiUrl);
  } catch (error) {
    console.error(error);
    dialog.showErrorBox(
      'Lumina Worship failed to start',
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0 && uiServer) {
    const address = uiServer.address();
    await createMainWindow(`http://127.0.0.1:${address.port}`);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  uiServer?.close();
  void backendApp?.close();
});
