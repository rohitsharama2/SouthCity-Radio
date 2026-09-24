import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authRedirectUrl,
  canPublish,
  isSecretKey,
  isStaff,
  libraryFromRows,
  mergeLibrary,
  parseAccountConfig,
  validateDisplayName,
  validateEmail,
} from './accounts.js';

const jwt = (payload) =>
  ['e30', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'signature'].join('.');

test('only staff open the admin and only managers and admins publish', () => {
  assert.deepEqual(['listener', 'dj', 'station_manager', 'admin', undefined].map(isStaff), [
    false,
    true,
    true,
    true,
    false,
  ]);
  assert.deepEqual(['listener', 'dj', 'station_manager', 'admin', null].map(canPublish), [
    false,
    false,
    true,
    true,
    false,
  ]);
});

test('account config accepts public keys and refuses secrets and unsafe URLs', () => {
  assert.deepEqual(
    parseAccountConfig({ url: 'https://abc.supabase.co/', key: 'sb_publishable_123' }),
    { url: 'https://abc.supabase.co', key: 'sb_publishable_123' },
  );
  assert.ok(parseAccountConfig({ url: 'http://127.0.0.1:54321', key: jwt({ role: 'anon' }) }));
  assert.equal(parseAccountConfig({ url: 'https://abc.supabase.co', key: 'sb_secret_123' }), null);
  assert.equal(
    parseAccountConfig({ url: 'https://abc.supabase.co', key: jwt({ role: 'service_role' }) }),
    null,
  );
  assert.equal(
    parseAccountConfig({ url: 'http://abc.supabase.co', key: 'sb_publishable_1' }),
    null,
  );
  assert.equal(
    parseAccountConfig({ url: 'https://abc.supabase.co/rest', key: 'sb_publishable_1' }),
    null,
  );
  assert.equal(parseAccountConfig({ configured: false }), null);
  assert.equal(isSecretKey('not.base64!.jwt'), true);
});

test('signing in adds device follows to the account without removing any', () => {
  const { library, missing } = mergeLibrary(
    { stations: ['jazz', 'indie', 'jazz'], shows: ['soul'] },
    { stations: ['southcity', 'jazz'], shows: [] },
  );
  assert.deepEqual(library, { stations: ['southcity', 'jazz', 'indie'], shows: ['soul'] });
  assert.deepEqual(missing, [
    { kind: 'station', item_id: 'indie' },
    { kind: 'show', item_id: 'soul' },
  ]);
  assert.deepEqual(mergeLibrary({ stations: ['Bad ID!'] }, null).missing, []);
});

test('follow rows map to catalog IDs and ignore malformed rows', () => {
  assert.deepEqual(
    libraryFromRows([
      { kind: 'station', item_id: 'jazz' },
      { kind: 'show', item_id: 'soul' },
      { kind: 'station', item_id: 'jazz' },
      { kind: 'episode', item_id: 'x' },
      { kind: 'station', item_id: '<script>' },
      null,
    ]),
    { stations: ['jazz'], shows: ['soul'] },
  );
});

test('names, emails, and sign-in return addresses are validated', () => {
  assert.deepEqual(validateDisplayName('  Rohit '), { value: 'Rohit' });
  assert.ok(validateDisplayName('').error);
  assert.ok(validateDisplayName('x'.repeat(31)).error);
  assert.deepEqual(validateEmail(' rohit@example.com '), { value: 'rohit@example.com' });
  assert.ok(validateEmail('rohit@').error);
  assert.equal(
    authRedirectUrl({ origin: 'https://radio.example', pathname: '/' }, 'admin'),
    'https://radio.example/?workspace=admin',
  );
  assert.equal(
    authRedirectUrl({ origin: 'http://localhost:5180', pathname: '/' }, 'app'),
    'http://localhost:5180/',
  );
});
