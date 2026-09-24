# Feature handoff and acceptance

## Consumer

**Discover → Listen live → Follow → Engage → Return** is the core loop. Discovery has real filtering over a seven-station catalog; SouthCity Live plays the real station stream with polled now-playing metadata, and the other six stations use public preview streams; follows and history are local; engagement is currently show exploration and local reminder preference; returning restores preferences and collections.

| Feature                        | Source                                                     | Behavior to preserve                                                                            |
| ------------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Home, discovery, station, show | `src/App.jsx`, `src/data/stations.js`                      | Station title opens detail; play starts audio; follow changes collection independently          |
| Mini/full player               | `src/App.jsx`, `src/components/AudioProvider.jsx`          | Playback survives navigation; never imply autoplay without a gesture                            |
| Library/profile                | `src/App.jsx`                                              | Local persistence, meaningful empty states, accurate privacy reset                              |
| Accounts                       | `src/components/useAccount.js`, `src/data/accounts.js`     | Optional; merge on sign-in, undo a follow the account didn't save, clear on sign-out            |
| Welcome/splash                 | `src/App.jsx`, `src/components/DesignSystem.jsx`           | Onboarding is manually accessible; splash is a design specimen, not an artificial startup delay |
| Theme/gallery                  | `src/styles/tokens.css`, `src/components/DesignSystem.jsx` | Semantic roles propagate across both workspaces; theme preference persists                      |

The catalog is English/instrumental; additional language content should only appear when real station data exists. Recently played tracks and on-air schedules are sample programming. Do not invent recorded episodes or downloads to fill empty states.

## Operations

| Feature               | Current behavior                                                      | Production dependency                                          |
| --------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| Access                | With accounts: staff role required; DJs view, managers/admins publish | Station-scoped permissions, publish audit log                  |
| Dashboard             | Fixed sample metrics + local action feed                              | Telemetry and aggregated statistics                            |
| Station configuration | Persisted per-station draft fields                                    | Validated server config mutation                               |
| Pause/resume          | Changes local station status only                                     | Privileged stream operation                                    |
| AutoDJ                | Persists preview mode                                                 | AutoDJ state and safe live transitions                         |
| Playlists             | Create/delete empty local playlists                                   | Track membership, ordering, rotation engine                    |
| Media                 | Local file metadata selection                                         | Upload, processing, storage and quota API                      |
| Schedule              | Add local one-hour broadcast slots by weekday                         | Conflict detection, timezone-safe scheduling, server execution |
| DJs/users             | Add local directory records                                           | Role management UI, station assignment, invitation delivery    |
| Analytics             | Illustrative charts, date-range variants, station CSV                 | Audited event/aggregate data and matching exports              |
| Add station           | Explains provisioning dependency, links to existing config            | Server-side station provisioning                               |

Admin configuration drafts do not modify consumer fixtures. This preserves the distinction between a draft and published station data. Build a publishing/synchronization layer when adding the backend; do not silently mutate public data while editing drafts.

## Verification priorities

1. At 390px, fixed navigation and mini-player do not overlap content and the document does not scroll horizontally.
2. Navigation/search/follow actions remain usable with keyboard; modals restore focus and support Escape.
3. Station changes cancel old playback attempts without an old error corrupting the current session state.
4. Playback errors offer recovery; network state never reports a successful connection without media events.
5. Empty library, no search results, unavailable content, and absent metadata use deliberate feedback.
6. Admin draft operations remain labeled as local. API failures in a future connected mode must never be reported as saved.
7. Both themes and palette changes preserve legibility, hierarchy, and status distinctions.
8. Any native delivery includes physical-device audio lifecycle testing before claiming background support.

## Known limits to carry forward

No backend beyond optional Supabase accounts, pushed real-time metadata (SouthCity Live polls public stats every 15 seconds), native build, offline downloads, episode playback, actual push delivery, live administrator control, or deployment pipeline is implemented. Browser-level checks exercise a responsive web app, not iOS/Android native behavior. Future work should implement these explicitly rather than presenting the prototype as production-connected.
