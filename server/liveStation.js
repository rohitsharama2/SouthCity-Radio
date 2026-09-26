import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  liveEndpoints,
  liveMetadataPath,
  liveStationDefaults,
  validateLiveStation,
} from '../src/data/liveStream.js';

// SouthCity server routes, used by the Vite dev and preview servers and by the hosted server
// (server/production.js). It publishes SouthCity Live's settings from the admin workspace to the
// listener apps and proxies the stream's public metadata, which has no CORS headers.
//
// With Supabase accounts configured (server/accounts.js), settings live in the `live_station`
// table and are saved with the publisher's own session, so row-level security has the final
// say; publishing also needs a station manager or administrator. Without accounts, settings are
// kept in .local/live-station.json and writes are accepted only from this machine.
//
// Settings and metadata are cached briefly and each is fetched once at a time, so the load on
// Supabase and on the stream server stays the same however many listeners are polling.
const configFile = path.resolve('.local/live-station.json');
// Only the two metadata requests the app makes are proxied.
const metadataRequests = [liveEndpoints.stats, liveEndpoints.history];
const configTtl = 10000,
  metadataTtl = 5000;
const upstreamTimeout = () => AbortSignal.timeout(8000);

const defaults = () => ({ ...liveStationDefaults, updatedAt: null });
function toConfig(saved) {
  const { value } = validateLiveStation(saved);
  return value ? { ...value, updatedAt: saved.updatedAt ?? null } : null;
}
function fileStore() {
  return {
    async read() {
      try {
        return toConfig(JSON.parse(await readFile(configFile, 'utf8'))) ?? defaults();
      } catch {
        // Missing or unreadable config falls back to the defaults.
        return defaults();
      }
    },
    async write(value) {
      const config = { ...value, updatedAt: new Date().toISOString() };
      await mkdir(path.dirname(configFile), { recursive: true });
      const temporary = `${configFile}.${process.pid}.tmp`;
      await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`);
      await rename(temporary, configFile);
      return config;
    },
  };
}
// The live_station table (supabase/migrations/20260926000000_live_station.sql). Until the first
// publish it has no row, which means the defaults.
const columns = 'name,description,genre,language,stream_url,updated_at';
const saveErrors = {
  401: 'Your session has expired. Sign in again.',
  403: 'Only station managers and administrators can publish station changes.',
  404: 'The live station table is missing. Run supabase/migrations/20260926000000_live_station.sql.',
};
function supabaseStore({ url, key }, request) {
  const endpoint = `${url}/rest/v1/live_station`;
  const fromRow = (row) =>
    row && toConfig({ ...row, streamUrl: row.stream_url, updatedAt: row.updated_at });
  return {
    async read() {
      const response = await request(`${endpoint}?select=${columns}&limit=1`, {
        headers: { apikey: key },
        signal: upstreamTimeout(),
      });
      if (!response.ok) throw new Error(`Supabase answered ${response.status}`);
      const [row] = await response.json();
      return fromRow(row) ?? defaults();
    },
    async write(value, token) {
      const response = await request(`${endpoint}?on_conflict=id&select=${columns}`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({
          name: value.name,
          description: value.description,
          genre: value.genre,
          language: value.language,
          stream_url: value.streamUrl,
        }),
        signal: upstreamTimeout(),
      });
      if (!response.ok)
        throw Object.assign(
          new Error(
            saveErrors[response.status] ?? 'The station settings couldn’t be saved. Try again.',
          ),
          { status: [401, 403].includes(response.status) ? response.status : 503 },
        );
      const [row] = await response.json();
      return fromRow(row) ?? { ...value, updatedAt: null };
    },
  };
}
// Serves repeated reads from memory for `ttl` ms and shares one load between concurrent reads.
// `load` receives the previous value so it can fall back to it when the upstream fails.
function cached(ttl, load, now) {
  let entry = null,
    pending = null,
    version = 0;
  return {
    get() {
      if (entry && now() < entry.expires) return Promise.resolve(entry.value);
      if (!pending) {
        const loading = version;
        pending = load(entry?.value)
          .then((value) => {
            if (loading === version) entry = { value, expires: now() + ttl };
            return value;
          })
          .finally(() => {
            pending = null;
          });
      }
      return pending;
    },
    // A newer value (a publish) wins over any load that was already in flight.
    set(value) {
      version += 1;
      pending = null;
      entry = { value, expires: now() + ttl };
    },
  };
}
// Connects to the stream and stops after the response headers; audio is never downloaded.
async function checkStream(url, request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await request(url, { signal: controller.signal });
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
const bearer = (req) => /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1] ?? null;
async function publish(req, res, { accounts, store, config, request }) {
  if (accounts?.configured) {
    const { status, error } = await accounts.authorizePublish(req);
    if (error) return send(res, status, { error });
  } else if (!isLoopback(req.socket.remoteAddress))
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
    const problem = await checkStream(value.streamUrl, request);
    if (problem) return send(res, 422, { error: problem, unreachable: true });
  }
  let saved;
  try {
    saved = await store.write(value, bearer(req));
  } catch (failure) {
    return send(res, failure.status ?? 500, {
      error: failure.status ? failure.message : 'The station settings couldn’t be saved.',
    });
  }
  config.set(saved);
  send(res, 200, saved);
}
async function fetchMetadata(requestPath, { config, request }) {
  const { streamUrl } = await config.get();
  try {
    const target = new URL(requestPath.slice(liveMetadataPath.length), new URL(streamUrl).origin);
    const response = await request(target, { signal: upstreamTimeout() });
    return { status: response.ok ? 200 : 502, body: await response.text() };
  } catch {
    return { status: 502, body: { error: 'The station server did not respond.' } };
  }
}
async function handle(req, res, next, context) {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === liveEndpoints.config) {
      if (req.method === 'GET') return send(res, 200, await context.config.get());
      if (req.method === 'PUT') return await publish(req, res, context);
      return send(res, 405, { error: 'Method not allowed' });
    }
    if (url.pathname.startsWith(`${liveMetadataPath}/`) && req.method === 'GET') {
      const entry = context.metadata.get(url.pathname + url.search);
      if (!entry) return send(res, 404, { error: 'Not found' });
      const { status, body } = await entry.get();
      return send(res, status, body);
    }
  } catch {
    return send(res, 500, { error: 'The SouthCity server could not complete that.' });
  }
  next();
}
export function liveStationMiddleware({ accounts, fetch: request = fetch, now = Date.now } = {}) {
  const store = accounts?.configured ? supabaseStore(accounts.publicConfig, request) : fileStore();
  const context = { accounts, store, request };
  // If the store can't be read, keep serving the last known settings (or the defaults).
  context.config = cached(
    configTtl,
    (previous) => store.read().catch(() => previous ?? defaults()),
    now,
  );
  context.metadata = new Map(
    metadataRequests.map((path) => [
      path,
      cached(metadataTtl, () => fetchMetadata(path, context), now),
    ]),
  );
  return (req, res, next) => handle(req, res, next, context);
}
export function liveStationServer({ accounts } = {}) {
  const middleware = liveStationMiddleware({ accounts });
  return {
    name: 'southcity-live-station',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
