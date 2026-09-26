import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { liveStationMiddleware } from './liveStation.js';
import { liveEndpoints, liveStationDefaults } from '../src/data/liveStream.js';

const supabaseUrl = 'https://abc.supabase.co';
const accounts = (authorized = true) => ({
  configured: true,
  publicConfig: { configured: true, url: supabaseUrl, key: 'sb_publishable_1' },
  authorizePublish: async () =>
    authorized ? { role: 'admin' } : { status: 403, error: 'Not staff.' },
});
// Calls the middleware the way Vite and server/production.js do and collects the response.
function call(middleware, { method = 'GET', url, body, headers = {} }) {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  Object.assign(req, {
    method,
    url,
    headers: { host: 'radio.example', ...headers },
    socket: { remoteAddress: '203.0.113.9' },
  });
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      setHeader() {},
      end: (text) => resolve({ status: res.statusCode, body: JSON.parse(text) }),
    };
    middleware(req, res, () => resolve({ status: 'next' }));
  });
}
const row = {
  name: 'SouthCity Nights',
  description: 'Late shows.',
  genre: 'Jazz',
  language: 'English',
  stream_url: 'http://stream.example:8000/live',
  updated_at: '2026-09-26T10:00:00Z',
};

test('metadata is proxied from the configured stream, cached, and limited to the app requests', async () => {
  let clock = 0;
  const upstream = [];
  const fetch = async (url) => {
    upstream.push(String(url));
    if (String(url).startsWith(supabaseUrl)) return Response.json([row]);
    return Response.json({ songtitle: 'A - B' });
  };
  const middleware = liveStationMiddleware({ accounts: accounts(), fetch, now: () => clock });
  for (let i = 0; i < 3; i += 1)
    assert.deepEqual(await call(middleware, { url: liveEndpoints.stats }), {
      status: 200,
      body: { songtitle: 'A - B' },
    });
  assert.deepEqual(
    upstream.filter((url) => !url.startsWith(supabaseUrl)),
    ['http://stream.example:8000/stats?sid=1&json=1'],
  );
  clock += 6000;
  await call(middleware, { url: liveEndpoints.stats });
  assert.equal(upstream.filter((url) => url.includes('/stats')).length, 2);
  const other = await call(middleware, { url: '/live-metadata/stats?sid=2' });
  assert.equal(other.status, 404);
  assert.equal((await call(middleware, { url: '/elsewhere' })).status, 'next');
});

test('settings come from Supabase, fall back to defaults, and survive an outage', async () => {
  let clock = 0,
    answer = () => Response.json([]);
  const middleware = liveStationMiddleware({
    accounts: accounts(),
    fetch: async () => answer(),
    now: () => clock,
  });
  const read = async () => (await call(middleware, { url: liveEndpoints.config })).body;
  assert.equal((await read()).streamUrl, liveStationDefaults.streamUrl);
  clock += 11000;
  answer = () => Response.json([row]);
  assert.deepEqual(await read(), {
    name: 'SouthCity Nights',
    description: 'Late shows.',
    genre: 'Jazz',
    language: 'English',
    streamUrl: 'http://stream.example:8000/live',
    updatedAt: '2026-09-26T10:00:00Z',
  });
  clock += 11000;
  answer = () => new Response('paused', { status: 503 });
  assert.equal((await read()).name, 'SouthCity Nights');
});

test('publishing saves with the publisher session and serves the new settings at once', async () => {
  const writes = [];
  const fetch = async (url, options = {}) => {
    if (options.method === 'POST') {
      writes.push({ url, options });
      return Response.json([{ ...row, ...JSON.parse(options.body) }]);
    }
    return Response.json([]);
  };
  const middleware = liveStationMiddleware({ accounts: accounts(), fetch, now: () => 0 });
  await call(middleware, { url: liveEndpoints.config });
  const values = {
    name: 'SouthCity Mornings',
    description: 'Breakfast radio.',
    genre: 'Soul',
    language: 'English',
    streamUrl: 'http://stream.example:8000/morning',
    force: true,
  };
  const published = await call(middleware, {
    method: 'PUT',
    url: liveEndpoints.config,
    body: values,
    headers: { authorization: 'Bearer staff-token', 'content-type': 'application/json' },
  });
  assert.equal(published.status, 200);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].options.headers.Authorization, 'Bearer staff-token');
  assert.ok(
    writes[0].url.endsWith(
      '/rest/v1/live_station?on_conflict=id&select=name,description,genre,language,stream_url,updated_at',
    ),
  );
  assert.equal(JSON.parse(writes[0].options.body).stream_url, values.streamUrl);
  const current = await call(middleware, { url: liveEndpoints.config });
  assert.equal(current.body.name, 'SouthCity Mornings');
});

test('publishing is refused before saving without a staff role, and explains save failures', async () => {
  let saves = 0;
  const refusing = liveStationMiddleware({
    accounts: accounts(false),
    fetch: async () => {
      saves += 1;
      return Response.json([]);
    },
  });
  const put = (middleware) =>
    call(middleware, {
      method: 'PUT',
      url: liveEndpoints.config,
      body: { ...liveStationDefaults, force: true },
      headers: { authorization: 'Bearer listener', 'content-type': 'application/json' },
    });
  assert.deepEqual(await put(refusing), { status: 403, body: { error: 'Not staff.' } });
  assert.equal(saves, 0);
  const missingTable = liveStationMiddleware({
    accounts: accounts(),
    fetch: async () => Response.json({ code: 'PGRST205' }, { status: 404 }),
  });
  const failed = await put(missingTable);
  assert.equal(failed.status, 503);
  assert.match(failed.body.error, /live_station\.sql/);
});
