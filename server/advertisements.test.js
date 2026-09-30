import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { advertisementsMiddleware } from './advertisements.js';
import { emptyAdvertisements } from '../src/data/advertisements.js';
async function call(handler, method = 'GET', body, headers = {}, address = '127.0.0.1') {
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  Object.assign(req, {
    url: '/api/advertisements',
    method,
    headers: { host: 'localhost:5181', 'content-type': 'application/json', ...headers },
    socket: { remoteAddress: address },
  });
  return new Promise((resolve, reject) => {
    let status;
    const res = {
      writeHead(code) {
        status = code;
      },
      end(value) {
        resolve({ status, body: JSON.parse(value) });
      },
    };
    handler(req, res, () => reject(new Error('Unexpected next'))).catch(reject);
  });
}
test('advertisements publish across server instances and reject unsafe local writes', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'southcity-ads-'));
  try {
    const file = path.join(dir, 'ads.json');
    const admin = advertisementsMiddleware({ file });
    const consumer = advertisementsMiddleware({ file });
    assert.equal((await call(consumer)).body.cards.length, 4);
    const cards = emptyAdvertisements();
    Object.assign(cards[0], {
      enabled: true,
      title: 'Shop local',
      sponsor: 'Test sponsor',
      linkUrl: 'https://example.com',
    });
    assert.equal((await call(admin, 'PUT', { cards }, {}, '10.0.0.2')).status, 403);
    assert.equal(
      (await call(admin, 'PUT', { cards }, { origin: 'https://evil.example' })).status,
      403,
    );
    assert.equal((await call(admin, 'PUT', { cards: [] })).status, 422);
    assert.equal((await call(admin, 'PUT', { cards })).status, 200);
    assert.equal((await call(consumer)).body.cards[0].title, 'Shop local');
    cards[0].enabled = false;
    await call(admin, 'PUT', { cards });
    assert.equal((await call(consumer)).body.cards[0].enabled, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('configured accounts gate writes and pass the staff session to Supabase', async () => {
  let allowed = false;
  const requests = [];
  const cards = emptyAdvertisements();
  const handler = advertisementsMiddleware({
    accounts: {
      configured: true,
      publicConfig: { url: 'https://example.supabase.co', key: 'public-key' },
      authorizePublish: async () => (allowed ? {} : { status: 403, error: 'Denied' }),
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify([{ cards, updated_at: '2026-09-30' }]), { status: 200 });
    },
  });
  assert.equal((await call(handler, 'PUT', { cards })).status, 403);
  assert.equal(requests.length, 0);
  allowed = true;
  assert.equal(
    (await call(handler, 'PUT', { cards }, { authorization: 'Bearer staff-token' })).status,
    200,
  );
  assert.equal(requests[0].options.headers.Authorization, 'Bearer staff-token');
  assert.deepEqual(JSON.parse(requests[0].options.body), { cards });
  const unavailable = advertisementsMiddleware({
    accounts: {
      configured: true,
      publicConfig: { url: 'https://example.supabase.co', key: 'public-key' },
      authorizePublish: async () => ({}),
    },
    fetch: async () => new Response('{}', { status: 404 }),
  });
  const result = await call(unavailable, 'PUT', { cards });
  assert.equal(result.status, 503);
  assert.match(result.body.error, /migration/);
});
