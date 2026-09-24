import test from 'node:test';
import assert from 'node:assert/strict';
import { stations, filterStations } from './stations.js';
test('search matches station, show, track, artist and host case-insensitively', () => {
  for (const term of [
    'Jazz After Hours',
    'blue note sessions',
    'Blue in Green',
    'MILES DAVIS',
    ' Marcus Reed ',
  ])
    assert.deepEqual(
      filterStations(stations, term).map((s) => s.id),
      ['jazz'],
    );
});
test('genre and language filters combine with search', () => {
  assert.deepEqual(
    filterStations(stations, '', 'Chill', 'Instrumental').map((s) => s.id),
    ['lofi'],
  );
  assert.equal(filterStations(stations, 'Miles', 'Chill').length, 0);
  assert.equal(filterStations(stations, '', 'Jazz', 'Instrumental').length, 0);
});
test('empty search returns catalog and unknown search returns empty without mutating it', () => {
  assert.equal(filterStations(stations, '  ').length, 7);
  assert.equal(filterStations(stations, 'missing station').length, 0);
  assert.equal(stations.length, 7);
});
