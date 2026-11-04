import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyAdvertisements,
  newAdvertisement,
  validateAdvertisements,
  publicAdUrl,
  publicWhatsAppUrl,
} from './advertisements.js';
test('ad slots validate required copy, limits, and safe destinations', () => {
  const cards = [newAdvertisement()];
  assert.equal(validateAdvertisements(cards).value.length, 1);
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
  cards[0].whatsappNumber = '+91 91031 47596';
  assert.equal(publicWhatsAppUrl(cards[0].whatsappNumber), 'https://wa.me/919103147596');
  assert.ok(validateAdvertisements(cards).value);
  cards[0].whatsappNumber = '123';
  assert.ok(validateAdvertisements(cards).error);
  cards[0].whatsappNumber = '';
  cards[0].title = 'x'.repeat(81);
  assert.ok(validateAdvertisements(cards).error);
  assert.deepEqual(validateAdvertisements(emptyAdvertisements()).value, []);
  assert.ok(validateAdvertisements(Array.from({ length: 21 }, newAdvertisement)).error);
  assert.ok(validateAdvertisements(null).error);
});
