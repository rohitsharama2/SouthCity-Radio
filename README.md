# SouthCity Radio

**Your city. Your sound.** A premium, responsive radio product with an independent consumer identity and a separate broadcast operations workspace.

This repository contains a working **React web prototype**, optimized for mobile and desktop. It is not a native iOS/Android application or a connected Centova Cast management client. **SouthCity Live** plays the real station broadcast; the other stations are samples. All administrative mutations are local drafts; no live station is changed.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev
```

This starts both development servers in one terminal, with each line of output labelled `[app]` or `[admin]`:

- Consumer/mobile preview: **http://localhost:5180**
- Admin dashboard: **http://localhost:5181** (opens Dashboard directly)

Ctrl+C stops both. If either server fails to start or exits, the other one is stopped too. To run just one server, use `npm run dev:app` or `npm run dev:admin`.

Both servers use strict ports: if a port is occupied, startup fails instead of silently moving to another port. Change both port assignments centrally in `src/data/workspaces.js`; server configuration, workspace navigation, and browser tests share those values. Ports 3000 and 5173 are not used.

Workspace links navigate between these two development origins. Each origin has separate browser storage; crossing between them reloads the page and stops consumer audio. Ordinary navigation within the consumer app still preserves playback.

Production output (preview uses port **4180**):

```sh
npm run build
npm run preview
```

## What's included

| Area              | Implemented experience                                                                                                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home              | Editorial hero, spotlight show, continue listening, live stations, genre cards, recommendations, popularity                                                                               |
| Discover / Search | Search by station, show, track, artist, and host; combined genre/language filters; empty results; Cmd/Ctrl+K                                                                              |
| Live              | Live station catalog, listener counts, programming schedule                                                                                                                               |
| Station           | Artwork, follow, listen, sample metadata, schedule, hosts, recent tracks, related stations                                                                                                |
| Show              | Description, host, broadcast slot, local follow and reminder preference, recorded-content empty state                                                                                     |
| Player            | Real external preview audio, play/pause, persistent mini-player, full player, volume/mute, station switching, share, sleep timer, Media Session handlers                                  |
| Library           | Persistent favorite stations, followed shows, actual local station history; honest empty states for episodes and downloads                                                                |
| Profile           | Editable local name, notification preference, appearance, listening counts, privacy reset, help                                                                                           |
| Accounts          | Optional Supabase sign-in by one-time email link (Google if enabled); favorites and followed shows sync to the account; staff roles gate the admin and publishing                         |
| Welcome           | Two-step onboarding available from Profile; splash specimen in the component gallery                                                                                                      |
| Admin             | Dashboard, station configuration drafts, monitoring, AutoDJ preference, playlist create/delete, local media selection, schedule drafts, DJs/users drafts, sample analytics and CSV export |
| Design system     | Live palette previews, typography, shared cards and controls, audio states, skeletons, loading/error/empty states, dialog and splash specimens                                            |

**Open admin:** http://localhost:5181 during development, or use Profile → Creator & admin portal / the desktop sidebar. The single production build also supports `/#admin`.

**Open the design system:** Profile → Design system & component gallery.

**Try onboarding:** Profile → Welcome to SouthCity. It does not interrupt returning listeners.

## Accounts (Supabase)

Accounts are optional. Without them the app works exactly as a local preview: the library stays in the browser, the admin opens without sign-in, and publishing is accepted only from this computer. With them:

- **Listeners** sign in from Profile with a one-time email link (no password). Favorite stations and followed shows are saved to their account and merged with anything already saved in the browser. Recent stations, theme, and notification preference stay on each device. Signing out removes the account's copy from that browser.
- **The admin workspace** requires a staff role. DJs can view it; only **station managers** and **administrators** can publish SouthCity Live changes. The SouthCity server checks the caller's session and role on every publish, so hiding a button is never the only protection.

### Set it up (free plan)

1. Create a project at [supabase.com](https://supabase.com) (the free plan is enough).
2. In **SQL Editor**, run [`supabase/migrations/20260924000000_accounts.sql`](supabase/migrations/20260924000000_accounts.sql). It creates `profiles` (name and role) and `follows`, with row-level security so each person reads and changes only their own rows and nobody can change their own role.
3. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:5180` and add these Redirect URLs: `http://localhost:5180/**`, `http://localhost:5181/**`, `http://localhost:4180/**`, and the same with `127.0.0.1`. Add your LAN address or production domain when you use one.
4. Copy `.env.example` to `.env` and fill in the **Project URL** and the **publishable key** (or the legacy `anon` key) from **Project Settings → API Keys**. Restart `npm run dev`.
5. Sign in once from the admin (http://localhost:5181). You'll see "This account isn't on the staff list". Then grant yourself a role in the SQL Editor and reload:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

   Roles are `listener` (default), `dj`, `station_manager`, and `admin`. Roles can only be changed here, not from the app.

**Keys:** the project URL and publishable key are public by design. The app reads them at runtime from `/api/auth-config` and they are not built into the bundle. **Never** put the `service_role`/secret key in `.env`. The server refuses to start accounts with one, because that key would be sent to browsers.

**Free plan limits:** Supabase pauses a free project after about a week without activity (restore it from the dashboard). Its built-in email sender allows only a few emails per hour and is meant for testing. Before real listeners sign up, connect your own SMTP provider under **Authentication → Emails → SMTP**. To offer **Continue with Google**, enable the Google provider in **Authentication → Sign In / Providers**. The button appears automatically once it's enabled.

**Sign-in links** open in the browser that requested them (the PKCE flow). Each origin has its own session, so in development you sign in to the app (5180) and the admin (5181) separately.

## Change the look centrally

1. Edit [`src/styles/tokens.css`](src/styles/tokens.css) for brand colors, surfaces, text, spacing primitives, radii, fonts, motion, and dark-mode values.
2. Edit [`src/components/ui.jsx`](src/components/ui.jsx) for shared buttons, station cards, artwork, badges, dialogs, skeletons, and feedback states.
3. Adjust shared layout rules in [`src/styles/app.css`](src/styles/app.css). Admin-specific rules live in [`src/styles/admin.css`](src/styles/admin.css).
4. Review mobile, desktop, dark mode, full player, and admin after any theme change.

Consumer and admin share semantic tokens but intentionally use different density, navigation, and component treatments. Station artwork has independent editorial colors; recolor the artwork rules separately when changing the entire art direction. The gallery's palette controls are session-only previews.

See [design system guidance](docs/DESIGN_SYSTEM.md) and [feature and production handoff](docs/FEATURES.md).

## Architecture

```text
src/
  App.jsx                     Consumer navigation and feature screens
  components/
    ui.jsx                    Shared visual components and dialog behavior
    AudioProvider.jsx         Persistent HTMLAudioElement + Media Session
    useAccount.js             Supabase session, profile, and follows (optional accounts)
    SignIn.jsx                One-time email link sign-in shared by app and admin
    Admin.jsx                 Separate operations workspace
    DesignSystem.jsx          Interactive component and state gallery
  data/
    stations.js               Illustrative catalog, schedule, search filtering
    stations.test.js          Search/filter behavior tests
    accounts.js               Roles, config checks, library merge (shared with server)
  styles/
    tokens.css                Central brand and semantic tokens
    app.css                   Consumer and shared component styling
    admin.css                 Operations-specific layout and styling
server/
  liveStation.js              Live station publishing and metadata proxy
  accounts.js                 Account config endpoint and staff checks for publishing
supabase/migrations/          Database tables and row-level security for accounts
```

The audio provider wraps both workspaces. Navigation does not recreate the audio element. Local preferences and drafts use namespaced `localStorage` keys; selected media files are kept only as metadata in memory. Accounts are optional and use Supabase ([`src/components/useAccount.js`](src/components/useAccount.js), [`server/accounts.js`](server/accounts.js), rules in [`src/data/accounts.js`](src/data/accounts.js)). Supabase keeps the session in `localStorage` under `sc-auth`.

## Audio and data honesty

- **SouthCity Live is the real station.** It plays the Centova Cast–managed SHOUTcast stream and shows the server's current song, recent tracks, listener count, bitrate, and uptime, polled every 15 seconds while the app is open. See [Live station](#live-station).
- **The other six stations are samples.** Their audio is real but their identity and metadata are not: preview streams are publicly accessible SomaFM streams. The app labels this in the player; displayed track/show metadata is illustrative and does not identify the audio actually playing.
- Playing, paused, connecting, buffering, network error, offline, and unavailable states are represented. Network and playback events drive the player; every state can also be inspected in the design gallery.
- Listen history records selected stations, not verified completed listening sessions.
- Browser playback can continue while navigating and supports compatible system media controls. **Reliable native background playback, interruptions, lock-screen artwork, Bluetooth routing, and Android foreground services require native integration and device testing.**
- Favorites, profile, shows, and theme survive browser refresh. With accounts configured, favorites, followed shows, and display name sync across browsers when the listener signs in or reloads (there is no live push between open tabs). Account deletion from the app, push notifications, downloads, recorded episodes, and entitlement enforcement are not implemented.
- Photos load from Unsplash, avatars from Pravatar, and fonts from Google Fonts. Replace remote samples with owned/approved, self-hosted assets before release.

## Live station

**Edit it from the admin:** Stations → SouthCity Live → **Configuration**. Change the name, description, genre, language, or public stream URL, then press **Publish to app**. The customer app picks the change up within 15 seconds; listeners hear a new stream address the next time they press play.

- Publishing goes through the local SouthCity server built into `npm run dev:app`, `npm run dev:admin`, and `npm run preview` ([`server/liveStation.js`](server/liveStation.js)). It saves to `.local/live-station.json` (not committed). Delete that file to return to the defaults in [`src/data/liveStream.js`](src/data/liveStream.js).
- Before saving, the server test-connects to the stream. If it can't connect, the admin says why and offers **Publish anyway** (for example, to save an HTTPS address before SSL is switched on).
- Stream URLs must be public listener addresses. URLs containing a username or password are rejected.
- With [accounts](#accounts-supabase) configured, publishing requires a signed-in station manager or administrator; the server verifies the session with Supabase and reads the role from the database. Without accounts, writes are accepted only from the same computer. A static host without the SouthCity server has neither accounts nor publishing: it keeps the defaults and the admin reports that publishing is unavailable.
- **Audio** plays directly from the stream URL. **Metadata** (`/stats`, `/played`) has no CORS headers, so the SouthCity server proxies it at `/live-metadata`, following whichever stream is published.
- **HTTPS:** the current server (`85.25.185.202:8665`) answers plain HTTP only; its HTTPS connection is refused. Browsers block HTTP audio on HTTPS pages, so a deployed HTTPS app needs SSL enabled for the stream in Centova Cast or a TLS reverse proxy with a domain. Until then, listen via `http://localhost:5180` or `http://<your-computer's-LAN-IP>:5180` on a phone.
- **Embed:** Stations → SouthCity Live → **Embed** lists the stream URL, a copyable website player snippet, and the now-playing JSON address.

## Centova Cast boundary

Centova Cast remains server-side infrastructure. Do not embed its administration UI or send its credentials to a browser/mobile client. The future app API will normalize station data, metadata, schedules, listeners, and stream health into independent product models.

The proposed API, real-time update contract, deployment boundaries, and production checklist are in [docs/INTEGRATION.md](docs/INTEGRATION.md). These are application-facing contracts to implement, **not claims about Centova Cast endpoint names**. The exact installed Centova Cast version and licensed capabilities must be verified before connecting.

## Feature and review skills

Repository-specific skills are in [`skills/`](skills/). [`AGENTS.md`](AGENTS.md) routes future coding agents to the relevant skill. These files are checked into the repository; they are not installed globally.

| Skill                       | Use for                                                   |
| --------------------------- | --------------------------------------------------------- |
| `southcity-discovery`       | Home, Discover, search, genres, station/show detail       |
| `southcity-audio`           | Audio lifecycle, player states, sleep, system controls    |
| `southcity-library-profile` | Favorites, shows, history, profile, preferences           |
| `southcity-admin`           | Operations screens and safe draft/production boundaries   |
| `southcity-centova`         | Server adapter, metadata, schedules, stream integration   |
| `southcity-theme`           | Rebranding through tokens and shared components           |
| `southcity-design-review`   | Responsive, visual, interaction, and accessibility review |
| `southcity-code-review`     | Functional, architecture, security, and regression review |

## Verification

```sh
npm test                # search/filter behavior
npm run test:e2e        # desktop + mobile Chrome tests
npm run build           # production compilation
npm run format:check    # formatting
```

Browser tests use locally installed Google Chrome (`channel: 'chrome'`). Install Chrome before running them; on CI you can install it with `npx playwright install chrome`. Playwright starts both Vite workspaces automatically. Test artifacts are ignored by Git. Tests cover discovery, persistence, station/show following, stream-error recovery, timer settings, theming, configuration drafts, playlists, schedules, analytics, and viewport overflow.

## Phase history

1. Foundation: brand tokens, catalog, shared primitives, persistent audio provider.
2. Consumer: responsive discovery, listening, library, station/show and profile screens.
3. Admin: distinct operations portal and interactive local management drafts.
4. Handoff: component gallery, feature skills, documentation, formatting, automated verification.

Phase commits are maintained in Git. No production deployment or live backend mutation is performed by this project.
