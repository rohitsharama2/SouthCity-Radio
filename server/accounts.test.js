import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccounts } from './accounts.js';

const env = {
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_1',
};
const request = (authorization) => ({ headers: authorization ? { authorization } : {} });
// Stands in for Supabase Auth and PostgREST, keyed by the bearer token.
const supabase =
  (people) =>
  async (url, { headers }) => {
    const person = people[headers.Authorization.slice('Bearer '.length)];
    if (url.endsWith('/auth/v1/user'))
      return person
        ? Response.json({ id: person.id, email: `${person.id}@example.com` })
        : Response.json({ message: 'invalid JWT' }, { status: 401 });
    assert.ok(url.includes(`profiles?id=eq.${person.id}&select=role`));
    assert.equal(headers.apikey, 'sb_publishable_1');
    return Response.json(person.role ? [{ role: person.role }] : []);
  };
const people = {
  admin: { id: 'a1', role: 'admin' },
  manager: { id: 'm1', role: 'station_manager' },
  dj: { id: 'd1', role: 'dj' },
  listener: { id: 'l1', role: 'listener' },
  orphan: { id: 'o1', role: null },
};

test('accounts stay off without a usable public config', () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(createAccounts({}).publicConfig, { configured: false });
    const secret = createAccounts({ ...env, SUPABASE_PUBLISHABLE_KEY: 'sb_secret_1' });
    assert.equal(secret.configured, false);
    assert.equal(JSON.stringify(secret.publicConfig).includes('sb_secret'), false);
  } finally {
    console.warn = warn;
  }
  assert.deepEqual(createAccounts(env).publicConfig, {
    configured: true,
    url: 'https://abc.supabase.co',
    key: 'sb_publishable_1',
  });
});

test('publishing requires a station manager or administrator session', async () => {
  const accounts = createAccounts(env, { fetch: supabase(people) });
  const check = async (auth) => {
    const { status, role } = await accounts.authorizePublish(request(auth));
    return status ?? role;
  };
  assert.equal(await check(), 401);
  assert.equal(await check('Basic abc'), 401);
  assert.equal(await check('Bearer expired'), 401);
  assert.equal(await check('Bearer listener'), 403);
  assert.equal(await check('Bearer dj'), 403);
  assert.equal(await check('Bearer orphan'), 403);
  assert.equal(await check('Bearer manager'), 'station_manager');
  assert.equal(await check('Bearer admin'), 'admin');
});

test('an unreachable account service is reported, not treated as authorized', async () => {
  const accounts = createAccounts(env, {
    fetch: async () => {
      throw new Error('offline');
    },
  });
  const result = await accounts.authorizePublish(request('Bearer admin'));
  assert.equal(result.status, 503);
  assert.equal(result.role, undefined);
});
