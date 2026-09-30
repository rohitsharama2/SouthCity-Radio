import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyAdvertisements, validateAdvertisements, publicAdUrl } from './advertisements.js';
test('ad slots validate required copy, limits, and safe destinations', () => {
  const cards = emptyAdvertisements();
  assert.equal(validateAdvertisements(cards).value.length, 4);
  cards[0].enabled = true;
  assert.ok(validateAdvertisements(cards).error);
  Object.assign(cards[0], {
    title: 'Weekend offer',
    sponsor: 'Local shop',
    linkUrl: 'https://example.com/offer',
  });
  assert.ok(validateAdvertisements(cards).value);
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,test',
    'http://example.com',
    'https://user:secret@example.com',
  ]) {
    cards[0].linkUrl = url;
    assert.ok(validateAdvertisements(cards).error);
    assert.equal(publicAdUrl(url), '');
  }
  cards[0].linkUrl = '';
  cards[0].title = 'x'.repeat(81);
  assert.ok(validateAdvertisements(cards).error);
  assert.ok(validateAdvertisements([]).error);
  assert.ok(validateAdvertisements(null).error);
});
