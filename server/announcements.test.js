import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { announcementsMiddleware } from './announcements.js';
async function call(handler, { method = 'GET', body, address = '127.0.0.1', headers = {} } = {}) {
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  Object.assign(req, {
    url: '/api/announcements',
    method,
    headers: { host: 'localhost:5181', 'content-type': 'application/json', ...headers },
    socket: { remoteAddress: address },
  });
  return new Promise((resolve, reject) => {
    let status;
    handler(
      req,
      {
        writeHead(code) {
          status = code;
        },
        end(value) {
          resolve({ status, body: JSON.parse(value) });
        },
      },
      () => reject(new Error('Unexpected next')),
    ).catch(reject);
  });
}
test('ticker publishing persists across servers; invalid and unauthorized writes are rejected', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'southcity-ticker-'));
  try {
    const file = path.join(dir, 'ticker.json');
    const admin = announcementsMiddleware({ file });
    const listener = announcementsMiddleware({ file });
    const settings = { enabled: true, messages: ['A station announcement', 'A second message'] };
    assert.equal(
      (await call(admin, { method: 'PUT', body: { settings }, address: '192.0.2.1' })).status,
      403,
    );
    assert.equal(
      (
        await call(admin, {
          method: 'PUT',
          body: { settings },
          headers: { origin: 'https://evil.example' },
        })
      ).status,
      403,
    );
    assert.equal(
      (await call(admin, { method: 'PUT', body: { settings: { enabled: true, messages: [] } } }))
        .status,
      422,
    );
    assert.equal((await call(admin, { method: 'PUT', body: { settings } })).status, 200);
    assert.deepEqual((await call(listener)).body.settings, settings);
    await call(admin, { method: 'PUT', body: { settings: { enabled: false, messages: [] } } });
    assert.equal((await call(listener)).body.settings.enabled, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test('ticker publishing verifies staff and uses their session for database writes', async () => {
  let allowed = false;
  let seen;
  const settings = { enabled: true, messages: ['Station update'] };
  const handler = announcementsMiddleware({
    accounts: {
      configured: true,
      publicConfig: { url: 'https://example.supabase.co', key: 'public' },
      authorizePublish: async () => (allowed ? {} : { status: 403, error: 'Denied' }),
    },
    fetch: async (url, options) => {
      seen = { url, options };
      return Response.json([{ settings }]);
    },
  });
  assert.equal((await call(handler, { method: 'PUT', body: { settings } })).status, 403);
  assert.equal(seen, undefined);
  allowed = true;
  assert.equal(
    (
      await call(handler, {
        method: 'PUT',
        body: { settings },
        headers: { authorization: 'Bearer staff-token' },
      })
    ).status,
    200,
  );
  assert.match(seen.url, /rest\/v1\/announcements/);
  assert.equal(seen.options.headers.Authorization, 'Bearer staff-token');
  assert.deepEqual(JSON.parse(seen.options.body), { settings });
});
