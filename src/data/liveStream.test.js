import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSongTitle,
  parseStats,
  parseHistory,
  isBlockedMixedContent,
  formatUptime,
  compactListeners,
  nowPlayingText,
  withLiveMetadata,
  withLiveConfig,
  validateLiveStation,
  liveStationDefaults,
} from './liveStream.js';

// Captured from the station's SHOUTcast DNAS 2.5.5 /stats?sid=1&json=1 endpoint.
const capturedStats = {
  currentlisteners: 0,
  peaklisteners: 4,
  maxlisteners: 500,
  servertitle: 'M Stream',
  songtitle: 'Unknown - P1 Health Tip S Saroopa D3 905 [2GXL]',
  streamstatus: 1,
  streamuptime: 465065,
  bitrate: '48',
  samplerate: '22050',
  content: 'audio/aacp',
};

test('parses captured SHOUTcast stats', () => {
  assert.deepEqual(parseStats(capturedStats), {
    onAir: true,
    listeners: 0,
    uptimeSeconds: 465065,
    bitrateKbps: 48,
    codec: 'AAC+',
    title: 'P1 Health Tip S Saroopa D3 905 [2GXL]',
    artist: null,
  });
});

test('treats missing or invalid stats fields as unknown, not zero', () => {
  const parsed = parseStats({ streamstatus: 0, currentlisteners: 'n/a', songtitle: '' });
  assert.equal(parsed.onAir, false);
  assert.equal(parsed.listeners, null);
  assert.equal(parsed.bitrateKbps, null);
  assert.equal(parsed.title, null);
  assert.throws(() => parseStats(null));
});

test('splits artist and title on the first separator', () => {
  assert.deepEqual(parseSongTitle('Arijit Singh - Tum Hi Ho - Live'), {
    artist: 'Arijit Singh',
    title: 'Tum Hi Ho - Live',
  });
  assert.deepEqual(parseSongTitle('Station ident'), { artist: null, title: 'Station ident' });
});

test('bounds and validates played history', () => {
  const history = parseHistory(
    [
      { playedat: 1790234235, title: 'Unknown - Song A' },
      { playedat: 'bad', title: 'Unknown - Song B' },
      { playedat: 1790234004, title: 'Artist - Song C' },
    ],
    5,
  );
  assert.deepEqual(history, [
    { title: 'Song A', artist: null, playedAt: 1790234235000 },
    { title: 'Song C', artist: 'Artist', playedAt: 1790234004000 },
  ]);
  assert.deepEqual(parseHistory({}), []);
});

test('detects HTTP streams that browsers block on HTTPS pages', () => {
  assert.equal(isBlockedMixedContent('http://example.com/stream', 'https:'), true);
  assert.equal(isBlockedMixedContent('http://example.com/stream', 'http:'), false);
  assert.equal(isBlockedMixedContent('https://example.com/stream', 'https:'), false);
});

test('formats live values for display', () => {
  assert.equal(formatUptime(465065), '5d 9h');
  assert.equal(formatUptime(3720), '1h 2m');
  assert.equal(formatUptime(null), '—');
  assert.equal(compactListeners(null), '—');
  assert.equal(compactListeners(7), '7');
  assert.equal(compactListeners(1248), '1.2k');
});

test('merges live metadata only into live stations', () => {
  const live = { id: 'live', live: true, track: null, artist: null, listeners: null };
  const sample = { id: 'jazz', track: 'Blue in Green', artist: 'Miles Davis', listeners: 842 };
  const data = { title: 'Song', artist: null, listeners: 3 };
  assert.deepEqual(withLiveMetadata(live, data), { ...live, track: 'Song', listeners: 3 });
  assert.equal(withLiveMetadata(sample, data), sample);
  assert.equal(nowPlayingText(withLiveMetadata(live, null)), 'Live now');
  assert.equal(nowPlayingText(sample), 'Miles Davis — Blue in Green');
});

test('validates published live station settings', () => {
  const https = { ...liveStationDefaults, streamUrl: ' https://85.25.185.202:8665/stream ' };
  assert.equal(validateLiveStation(https).value.streamUrl, 'https://85.25.185.202:8665/stream');
  for (const [change, message] of [
    [{ streamUrl: 'http://admin:secret@host:8000/stream' }, /username and password/],
    [{ streamUrl: 'ftp://host/stream' }, /http:\/\/ or https:\/\//],
    [{ streamUrl: 'not a url' }, /full stream URL/],
    [{ name: ' ' }, /station name/],
    [{ genre: 'Polka' }, /genre/],
  ])
    assert.match(validateLiveStation({ ...liveStationDefaults, ...change }).error, message);
});

test('published settings replace live station identity and stream', () => {
  const station = { id: 'live', live: true, name: 'Old', stream: 'http://old/stream' };
  const config = { ...liveStationDefaults, name: 'New', streamUrl: 'https://new/stream' };
  assert.deepEqual(
    [withLiveConfig(station, config).name, withLiveConfig(station, config).stream],
    ['New', 'https://new/stream'],
  );
  assert.equal(withLiveConfig(station, null), station);
  assert.equal(withLiveMetadata(station, null, config).name, 'New');
});
