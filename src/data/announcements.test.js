import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultAnnouncements, validateAnnouncements } from './announcements.js';
test('announcements require bounded single-line messages and can be disabled without messages', () => {
  assert.ok(validateAnnouncements(defaultAnnouncements()).value);
  assert.deepEqual(validateAnnouncements({ enabled: false, messages: [] }).value, {
    enabled: false,
    messages: [],
  });
  for (const messages of [
    [],
    [''],
    ['a'.repeat(201)],
    ['line\nbreak'],
    Array(7).fill('News'),
    [null],
  ]) {
    assert.ok(validateAnnouncements({ enabled: true, messages }).error);
  }
  assert.ok(validateAnnouncements(null).error);
  assert.deepEqual(
    validateAnnouncements({ enabled: true, messages: ['  Station update  '] }).value.messages,
    ['Station update'],
  );
});
