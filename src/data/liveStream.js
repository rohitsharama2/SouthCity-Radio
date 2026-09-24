// SouthCity Live's defaults. The admin workspace can publish replacements through the
// local SouthCity server (server/liveStation.js), which stores them in
// .local/live-station.json. Stream URLs are listener-facing only; Centova Cast admin
// credentials never belong here. The current server answers plain HTTP only, so playback
// works from http:// origins; an HTTPS deployment needs an HTTPS stream URL.
export const liveStationDefaults = {
  name: 'SouthCity Live',
  description:
    'The SouthCity broadcast, streaming live. Song titles and listener counts update from the station server as they change.',
  genre: 'Eclectic',
  language: 'Multilingual',
  streamUrl: 'http://85.25.185.202:8665/stream',
};
export const liveServer = new URL(liveStationDefaults.streamUrl).origin;
export const stationGenres = ['Eclectic', 'Jazz', 'Indie', 'Chill', 'Soul', 'Electronic'];
export const stationLanguages = ['English', 'Instrumental', 'Multilingual'];
// The stream's metadata endpoints send no CORS headers, so the app reads them through the
// same-origin SouthCity server, which proxies them to the configured stream's host.
export const liveMetadataPath = '/live-metadata';
export const liveEndpoints = {
  config: '/api/live-station',
  stats: `${liveMetadataPath}/stats?sid=1&json=1`,
  history: `${liveMetadataPath}/played?sid=1&type=json`,
};
export const publicStatsUrl = (streamUrl) => `${new URL(streamUrl).origin}/stats?sid=1&json=1`;

// Shared by the admin form and the server, so both enforce the same rules.
export function validateLiveStation(input) {
  const text = (value) => (typeof value === 'string' ? value.trim() : '');
  const value = {
    name: text(input?.name),
    description: text(input?.description),
    genre: text(input?.genre),
    language: text(input?.language),
    streamUrl: text(input?.streamUrl),
  };
  if (!value.name || value.name.length > 80)
    return { error: 'Enter a station name (80 characters max).' };
  if (!value.description || value.description.length > 400)
    return { error: 'Enter a description (400 characters max).' };
  if (!stationGenres.includes(value.genre)) return { error: 'Choose a listed genre.' };
  if (!stationLanguages.includes(value.language)) return { error: 'Choose a listed language.' };
  let url;
  try {
    url = new URL(value.streamUrl);
  } catch {
    return { error: 'Enter a full stream URL, such as http://host:port/stream.' };
  }
  if (!['http:', 'https:'].includes(url.protocol) || value.streamUrl.length > 500)
    return { error: 'The stream URL must start with http:// or https://.' };
  if (url.username || url.password)
    return { error: 'Remove the username and password. Use the public listener URL only.' };
  return { value: { ...value, streamUrl: url.href } };
}

export const livePollMs = 15000;

const codecs = { 'audio/aacp': 'AAC+', 'audio/aac': 'AAC', 'audio/mpeg': 'MP3' };

// SHOUTcast titles are "Artist - Title"; Centova AutoDJ sends "Unknown" for untagged files.
export function parseSongTitle(raw) {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return { title: null, artist: null };
  const split = text.indexOf(' - ');
  if (split === -1) return { title: text, artist: null };
  const artist = text.slice(0, split).trim(),
    title = text.slice(split + 3).trim();
  return {
    title: title || null,
    artist: artist && artist.toLowerCase() !== 'unknown' ? artist : null,
  };
}

export function parseStats(json) {
  if (!json || typeof json !== 'object') throw new Error('Invalid stream stats');
  const listeners = Number(json.currentlisteners),
    bitrate = Number(json.bitrate),
    uptime = Number(json.streamuptime);
  return {
    onAir: Number(json.streamstatus) === 1,
    listeners: Number.isInteger(listeners) && listeners >= 0 ? listeners : null,
    uptimeSeconds: Number.isFinite(uptime) && uptime >= 0 ? uptime : null,
    bitrateKbps: Number.isFinite(bitrate) && bitrate > 0 ? bitrate : null,
    codec: codecs[json.content] || null,
    ...parseSongTitle(json.songtitle),
  };
}

export function parseHistory(json, limit = 8) {
  if (!Array.isArray(json)) return [];
  return json
    .filter((item) => item && typeof item.title === 'string' && Number.isFinite(item.playedat))
    .slice(0, limit)
    .map((item) => ({ ...parseSongTitle(item.title), playedAt: item.playedat * 1000 }));
}

export const isBlockedMixedContent = (url, pageProtocol) =>
  pageProtocol === 'https:' && url.startsWith('http:');

export const streamDescription = (live) =>
  [live?.bitrateKbps && `${live.bitrateKbps} kbps`, live?.codec].filter(Boolean).join(' · ');

export function formatUptime(seconds) {
  if (seconds == null) return '—';
  const days = Math.floor(seconds / 86400),
    hours = Math.floor((seconds % 86400) / 3600),
    minutes = Math.floor((seconds % 3600) / 60);
  return days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export const formatListeners = (count) => (count == null ? '—' : count.toLocaleString());

export const compactListeners = (count) =>
  count == null ? '—' : count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);

export const nowPlayingText = (station) =>
  station.artist && station.track
    ? `${station.artist} — ${station.track}`
    : station.track || (station.live ? 'Live now' : '');

// Stations stay stable fixture objects; published settings and live metadata are merged
// only for display and playback.
export const withLiveConfig = (station, config) =>
  station?.live && config
    ? {
        ...station,
        name: config.name,
        description: config.description,
        genre: config.genre,
        language: config.language,
        stream: config.streamUrl,
      }
    : station;
export const withLiveMetadata = (station, data, config) =>
  station?.live
    ? {
        ...withLiveConfig(station, config),
        track: data?.title ?? null,
        artist: data?.artist ?? null,
        listeners: data?.listeners ?? null,
      }
    : station;
