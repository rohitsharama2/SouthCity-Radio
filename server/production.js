import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { accountsMiddleware, createAccounts } from './accounts.js';
import { liveStationMiddleware } from './liveStation.js';

// Hosted SouthCity server: serves the built web app (npm run build) and the same API as the
// Vite dev and preview servers, for browsers and the Android app. Accounts use SUPABASE_URL and
// SUPABASE_PUBLISHABLE_KEY from the environment; published live settings are kept in
// .local/live-station.json, so mount persistent storage there.
const root = path.resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const accounts = createAccounts(process.env);
const api = [accountsMiddleware(accounts), liveStationMiddleware({ accounts })];

async function findFile(pathname) {
  const file = path.join(root, path.normalize(decodeURIComponent(pathname)));
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  const info = await stat(file).catch(() => null);
  if (info?.isFile()) return file;
  if (info?.isDirectory()) return findFile(path.posix.join(pathname, 'index.html'));
  // Screens use hash routes, so only extensionless paths fall back to the app shell.
  return path.extname(pathname) ? null : path.join(root, 'index.html');
}
async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let file;
  try {
    file = await findFile(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  const body = await readFile(file);
  res.writeHead(200, {
    'Content-Type': types[path.extname(file)] || 'application/octet-stream',
    'Content-Length': body.length,
    // Built assets carry content hashes; everything else revalidates.
    'Cache-Control': file.startsWith(path.join(root, 'assets') + path.sep)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = createServer((req, res) => {
  const run = (index) =>
    index < api.length
      ? api[index](req, res, () => run(index + 1))
      : serveStatic(req, res).catch(() => {
          if (!res.headersSent) res.writeHead(500);
          res.end();
        });
  run(0);
});
const port = Number(process.env.PORT) || 4180;
server.listen(port, '0.0.0.0', () =>
  console.log(`SouthCity server on port ${port} (accounts ${accounts.configured ? 'on' : 'off'}).`),
);
