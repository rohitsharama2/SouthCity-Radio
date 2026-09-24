import test from 'node:test';
import assert from 'node:assert/strict';
import { readLocal, writeLocal } from './storage.js';
test('storage corruption and incompatible preference types fall back safely', () => {
  globalThis.localStorage = { getItem: () => '{broken json' };
  assert.deepEqual(readLocal('favorites', []), []);
  globalThis.localStorage = { getItem: () => '"not an array"' };
  assert.deepEqual(readLocal('favorites', []), []);
  globalThis.localStorage = { getItem: () => '["jazz",42]' };
  assert.deepEqual(readLocal('favorites', ['southcity']), ['jazz']);
});
test('unavailable storage does not throw and reports session-only persistence', () => {
  globalThis.localStorage = {
    setItem: () => {
      throw new Error('quota exceeded');
    },
  };
  let notification;
  globalThis.window = {
    dispatchEvent: (event) => {
      notification = event.type;
    },
  };
  assert.equal(writeLocal('theme', 'dark'), false);
  assert.equal(notification, 'southcity:storage-unavailable');
});
