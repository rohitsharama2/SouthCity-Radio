# Centova Cast integration handoff

## Current boundary

There is **no backend connection** in this repository. Catalog data is in `src/data/stations.js`. The one exception to fixture data is **SouthCity Live**: it plays the station's public SHOUTcast stream and polls the public, read-only `/stats` and `/played` endpoints through a same-origin `/live-metadata` proxy. Its name, description, genre, language, and stream URL can be published from the admin through the SouthCity server (`server/liveStation.js`, `/api/live-station`; hosted with `server/production.js`). With Supabase accounts configured, that endpoint requires a station manager or administrator session, verified server-side against Supabase Auth and the `profiles` role (`server/accounts.js`), and saves to the `live_station` table with the publisher's own session, so row-level security also applies. Without accounts, it stores `.local/live-station.json` and accepts writes from the same machine only. Listener follows and profiles are read and written directly from the browser to Supabase, protected by row-level security (`supabase/migrations/`). The other stations use external preview streams. Admin changes are local drafts, not Centova Cast mutations. Do not turn this prototype into a client that sends privileged Centova Cast credentials from the browser.

## Target topology

```text
Consumer web / iOS / Android       Separate admin web portal
            |                                  |
        Public API                      Authenticated admin API
            |                                  |
    Product application service + authorization + event delivery
            |                                  |
      Cached catalog / events        Server-side Centova adapter
                                               |
                          Centova Cast / configured stream servers
```

The adapter must be implemented against the actual deployed Centova Cast version, streaming software, enabled API, and account permissions. Verify its official documentation and supported operations before implementation. Endpoint examples below belong to the proposed SouthCity application API, not Centova Cast.

## Public station contract

```ts
type Station = {
  id: string;
  name: string;
  description: string;
  genre: string;
  language: string;
  artworkUrl: string | null;
  stream: {
    url: string; // HTTPS public playback URL; never an admin URL
    status: 'live' | 'offline' | 'unavailable';
    codec: string;
    bitrateKbps: number;
  };
  nowPlaying: {
    title: string | null;
    artist: string | null;
    artworkUrl: string | null;
    startedAt: string | null; // ISO 8601 UTC
  };
  show: { id: string; title: string; hostId: string | null } | null;
  listeners: number | null; // unknown is not zero
  sourceMode: 'live-dj' | 'autodj' | 'unknown';
  updatedAt: string;
};
```

Never imply a live human DJ merely because a stream is broadcasting. AutoDJ may still be a live stream to the listener. Missing track art should fall back to station art, then a product placeholder.

## Proposed application endpoints

| Endpoint                                            | Purpose                                             |
| --------------------------------------------------- | --------------------------------------------------- |
| `GET /api/stations`                                 | Public catalog, server-side filters, pagination     |
| `GET /api/stations/:id`                             | Station details and current metadata                |
| `GET /api/stations/:id/schedule`                    | Broadcasts with UTC timestamps and display timezone |
| `GET /api/stations/:id/recent-tracks`               | Bounded playback history                            |
| `GET /api/shows/:id`                                | Show, host, schedule, available episodes            |
| `GET /api/events`                                   | SSE metadata and stream-health updates              |
| `GET/PUT /api/me/preferences`                       | Authenticated profile and user preferences¹         |
| `GET/POST/DELETE /api/me/follows`                   | Authenticated station and show follows¹             |
| `/api/admin/stations/*`                             | Protected station configuration/operations          |
| `/api/admin/playlists/*`, `/media/*`, `/schedule/*` | Protected content management                        |
| `/api/admin/djs/*`, `/users/*`, `/analytics/*`      | Protected roles, people, reports                    |

¹ Currently served by Supabase's `profiles` and `follows` tables under row-level security rather than SouthCity endpoints. Move them behind the application API if follows need server-side validation against the catalog.

## Real-time metadata

Proposed event envelope:

```json
{
  "id": "event-1842",
  "type": "station.metadata",
  "stationId": "southcity",
  "version": 1842,
  "occurredAt": "2026-09-24T10:30:00Z",
  "patch": {
    "nowPlaying": { "title": "Tadow", "artist": "Masego & FKJ" },
    "listeners": 1248
  }
}
```

Maintain one normalized catalog store, keyed by stable station ID. Merge verified patches into that store; station cards, detail screens, the mini-player, and system metadata read the same source. Avoid page refresh and avoid changing `audio.src` for metadata-only changes. The current fixture-based app will need this store/provider when connected.

- Validate payload fields, IDs, status enum, URLs, numeric ranges, and event version.
- Ignore out-of-order versions; reconnect with backoff and jitter, use event IDs where supported, and fetch a fresh snapshot after resuming.
- Coalesce listener count changes to avoid unnecessary renders and preserve scroll/focus.
- Keep stale last-known metadata visible with a freshness signal if event delivery drops.
- Keep broadcast state, audio transport state, and DJ mode separate.
- Use bounded polling if event delivery is unavailable; do not open one poll per card.

## Audio implementation path

Current `AudioProvider.jsx` owns a persistent `HTMLAudioElement`. Add compatible HTTPS MP3/AAC/HLS playback after checking the actual stream formats and target platforms. HLS may require a web adapter on some browsers. CORS, mixed-content restrictions, autoplay policies, expired URLs, and server limits must be tested.

Native iOS requires an audio session and background audio entitlement, with interruption and route-change handling. Android requires an appropriate media service, session, foreground notification, and lifecycle handling. Choose a native/cross-platform runtime before implementation; this repository does not contain those native projects.

Test foreground/background switching, device locking, incoming calls, Bluetooth changes, headphone disconnect, network transitions, sleep timer expiry, and battery restrictions on physical devices. Media Session support in a browser is not proof of native background reliability.

## Privileged operations

- Keep infrastructure credentials in a server secret manager; do not create `VITE_*` secrets.
- Authenticate users and enforce tenant/station/role permissions on every mutation.
- Roles distinguish platform administrator, station manager, DJ, and listener (the Supabase `app_role` enum). They are network-wide today: a station manager is not yet limited to specific stations, and roles are assigned in SQL, not from the admin.
- Validate uploads on the server by content, size, quota, format, and malware scanning; browser `accept` is not validation.
- Use short-lived upload authorization and asynchronous media processing.
- Make scheduled broadcasts timezone-aware, detect overlaps, and handle daylight-saving changes explicitly where applicable.
- Log actor, station, intent, before/after state, result, and timestamp for operations.
- Use idempotency keys where retries could duplicate schedules, invitations, or playlist operations.
- Guard restart/stop/delete operations with contextual review of the actual production target. Ordinary draft edits do not require new approval rituals.
- Use CSRF protection for cookie-authenticated mutations, safe session handling, request rate limits, and redacted logs.

## Production work still required

API and database, station-scoped permissions and an in-app role management screen, publish audit records, account deletion, native apps, actual Centova adapter, real telemetry, image pipeline, streaming resilience, entitlement-aware on-demand/offline support, privacy policy, retention controls, notification service, live schedule correctness, observability, deployment/rollback, contrast and assistive-technology verification, and physical-device background playback testing.

A public deployment of this preview must remain clearly marked as a demo. Never deploy operational controls with client-only authentication.
