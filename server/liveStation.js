import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  liveEndpoints,
  liveMetadataPath,
  liveStationDefaults,
  validateLiveStation,
} from '../src/data/liveStream.js';

// Local SouthCity server for the Vite dev and preview servers. It publishes SouthCity Live's
// settings from the admin workspace to the consumer app and proxies the stream's public
// metadata, which has no CORS headers. It is not production auth: writes are accepted only
// from this machine. Production needs the authenticated SouthCity API (docs/INTEGRATION.md).
const configFile = path.resolve('.local/live-station.json');
const metadataPaths = ['/stats', '/played'];

async function readConfig() {
  try {
    const saved = JSON.parse(await readFile(configFile, 'utf8'));
    const { value } = validateLiveStation(saved);
    if (value) return { ...value, updatedAt: saved.updatedAt ?? null };
  } catch {
    // Missing or unreadable config falls back to the defaults.
  }
  return { ...liveStationDefaults, updatedAt: null };
}
async function writeConfig(value) {
  const config = { ...value, updatedAt: new Date().toISOString() };
  await mkdir(path.dirname(configFile), { recursive: true });
  const temporary = `${configFile}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`);
  await rename(temporary, configFile);
  return config;
}
// Connects to the stream and stops after the response headers; audio is never downloaded.
async function checkStream(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    controller.abort();
    const type = response.headers.get('content-type') || '';
    if (!response.ok) return `The stream answered with HTTP ${response.status}.`;
    if (!/^audio\/|mpegurl|octet-stream/i.test(type))
      return `That address answered with ${type || 'unknown content'}, not audio.`;
    return null;
  } catch (error) {
    const reason = error.cause?.code || (error.name === 'AbortError' ? 'timed out' : error.message);
    if (url.startsWith('https:') && /ECONNRESET|EPROTO|CERT|SSL/i.test(reason))
      return `The server refused a secure (HTTPS) connection (${reason}). SSL may not be enabled for this stream yet.`;
    return `The stream couldn’t be reached (${reason}).`;
  } finally {
    clearTimeout(timeout);
  }
}
const isLoopback = (address = '') => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
async function readBody(req, limit = 10000) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw new Error('Request too large');
  }
  return JSON.parse(body);
}
async function publish(req, res) {
  if (!isLoopback(req.socket.remoteAddress))
    return send(res, 403, { error: 'Publish from the admin workspace on this computer.' });
  const origin = req.headers.origin;
  if (origin && new URL(origin).hostname !== new URL(`http://${req.headers.host}`).hostname)
    return send(res, 403, { error: 'Cross-site publishing is not allowed.' });
  if (!req.headers['content-type']?.startsWith('application/json'))
    return send(res, 415, { error: 'Send JSON.' });
  let input;
  try {
    input = await readBody(req);
  } catch {
    return send(res, 400, { error: 'The request could not be read.' });
  }
  const { value, error } = validateLiveStation(input);
  if (error) return send(res, 422, { error });
  if (!input.force) {
    const problem = await checkStream(value.streamUrl);
    if (problem) return send(res, 422, { error: problem, unreachable: true });
  }
  send(res, 200, await writeConfig(value));
}
async function proxyMetadata(url, res) {
  const subpath = url.pathname.slice(liveMetadataPath.length);
  if (!metadataPaths.includes(subpath)) return send(res, 404, { error: 'Not found' });
  const { streamUrl } = await readConfig();
  try {
    const target = new URL(`${subpath}${url.search}`, new URL(streamUrl).origin);
    const response = await fetch(target, { signal: AbortSignal.timeout(8000) });
    send(res, response.ok ? 200 : 502, await response.text());
  } catch {
    send(res, 502, { error: 'The station server did not respond.' });
  }
}
async function handle(req, res, next) {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === liveEndpoints.config) {
      if (req.method === 'GET') return send(res, 200, await readConfig());
      if (req.method === 'PUT') return await publish(req, res);
      return send(res, 405, { error: 'Method not allowed' });
    }
    if (url.pathname.startsWith(`${liveMetadataPath}/`) && req.method === 'GET')
      return await proxyMetadata(url, res);
  } catch {
    return send(res, 500, { error: 'The local SouthCity server could not complete that.' });
  }
  next();
}
export function liveStationServer() {
  return {
    name: 'southcity-live-station',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}
