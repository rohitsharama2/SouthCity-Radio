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

**Open admin:** http://localhost:5181 during development. The single production build also supports `/#admin`. The listener app has no link to the admin, so staff open it directly.

**Open the design system:** Profile → Design system & component gallery.

**Try onboarding:** Profile → Welcome to SouthCity. It does not interrupt returning listeners.

## Hosted server

The listener apps need the SouthCity server for account settings, published SouthCity Live settings, and the song metadata proxy. `npm start` runs it for production ([`server/production.js`](server/production.js)): it serves the built web app (`npm run build`) and the same `/api` routes as the dev servers, on `PORT` (default 4180). It keeps nothing on disk when accounts are configured, so free hosts that sleep or restart lose nothing.

**Deploy on Koyeb (free instance):**

1. Sign in to [koyeb.com](https://www.koyeb.com) with GitHub and create a **Web Service** from this repository, branch `main`.
2. Builder: **Buildpack**. The build runs `npm run build`; the run command is `npm start`. Exposed port: **8000**, HTTP, path `/`.
3. Environment variables: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (the same public values as `.env`). Never add a secret or service-role key.
4. Instance: **Free**. After deploying, note the service address (`https://<name>.koyeb.app`).
5. In Supabase, run the live station migration and add the redirect URLs listed under [Accounts](#set-it-up-free-plan).

The free instance sleeps after an hour without traffic and wakes in a few seconds. Song metadata is fetched from the stream at most every 5 seconds and settings from Supabase at most every 10 seconds, however many listeners are polling. The hosted web app is HTTPS, so browsers there cannot play the plain-HTTP SouthCity Live stream until it has SSL (see [Live station](#live-station)); the Android app can.

## Android beta build

The listener app (no admin) can be packaged as an Android APK with [Capacitor](https://capacitorjs.com). The APK bundles the web app, plays through Android's WebView, and talks to the [hosted server](#hosted-server).

Requires JDK 21 and the Android SDK (platform 36). With Homebrew: `brew install openjdk@21 android-commandlinetools`, then `sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"`. Point `JAVA_HOME` at JDK 21 and `ANDROID_HOME` at the SDK (or put `sdk.dir=...` in `android/local.properties`). Set `VITE_SOUTHCITY_SERVER` in `.env` to the hosted server's `https://` address; the build stops without it.

```sh
npm run android:apk
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Share that file; testers allow "install unknown apps" for the app they open it from. Later builds from the same computer install as updates, because they are signed with that computer's debug key.

What differs from the web app:

- **No admin.** Admin links and `/#admin` are disabled in this build (`vite build --mode android`).
- **Server by address.** API calls go to `VITE_SOUTHCITY_SERVER` through native HTTP (`CapacitorHttp`), which is not subject to CORS. Published SouthCity Live settings reach the app like the web app.
- **Sign-in returns through a deep link.** Email links and Google sign-in redirect to `com.southcity.radio://auth`, which opens the app, and the app completes the sign-in. Google opens in the system browser, because Google refuses sign-in inside app WebViews. The link must be opened on the phone that requested it.
- **Media notification.** While a station plays, a foreground media service shows a notification and lock-screen controls with play/pause and stop (`@capgo/capacitor-media-session`). Stop pauses and removes the notification. Song titles in it refresh only while the app is open, because metadata polling pauses in the background.

The stream is plain `http://`, so the app is served from `http://localhost` and allows cleartext traffic. Switch both back once the stream has HTTPS.

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

6. Run [`supabase/migrations/20260926000000_live_station.sql`](supabase/migrations/20260926000000_live_station.sql). It stores SouthCity Live's published settings: anyone can read them, and only station managers and administrators can change them.
7. For the [hosted server](#hosted-server) and the Android app, add these Redirect URLs: `https://<name>.koyeb.app/**` and `com.southcity.radio://auth`.
8. Before real listeners sign up, connect an SMTP provider (below). The built-in sender allows only a few emails per hour.

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
    mediaSession.js           System media controls (native notification in the Android app)
    server.js                 SouthCity server address (by path, or hosted for Android)
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
  production.js               Hosted server: built app plus the routes below (npm start)
  liveStation.js              Live station publishing and metadata proxy
  accounts.js                 Account config endpoint and staff checks for publishing
supabase/migrations/          Tables and row-level security for accounts and live station settings
android/                      Capacitor Android project for the listener app
```

The audio provider wraps both workspaces. Navigation does not recreate the audio element. Local preferences and drafts use namespaced `localStorage` keys; selected media files are kept only as metadata in memory. Accounts are optional and use Supabase ([`src/components/useAccount.js`](src/components/useAccount.js), [`server/accounts.js`](server/accounts.js), rules in [`src/data/accounts.js`](src/data/accounts.js)). Supabase keeps the session in `localStorage` under `sc-auth`.

## Audio and data honesty

- **SouthCity Live is the real station.** It plays the Centova Cast–managed SHOUTcast stream and shows the server's current song, recent tracks, listener count, bitrate, and uptime, polled every 15 seconds while the app is open. See [Live station](#live-station).
- **The other six stations are samples.** Their audio is real but their identity and metadata are not: preview streams are publicly accessible SomaFM streams. The app labels this in the player; displayed track/show metadata is illustrative and does not identify the audio actually playing.
- Playing, paused, connecting, buffering, network error, offline, and unavailable states are represented. Network and playback events drive the player; every state can also be inspected in the design gallery.
- Listen history records selected stations, not verified completed listening sessions.
- Browser playback can continue while navigating and supports compatible system media controls. The Android app adds a foreground media service with notification and lock-screen controls. **Interruptions (calls, other audio), lock-screen artwork, Bluetooth routing, and iOS still need native work and device testing.**
- Favorites, profile, shows, and theme survive browser refresh. With accounts configured, favorites, followed shows, and display name sync across browsers when the listener signs in or reloads (there is no live push between open tabs). Account deletion from the app, push notifications, downloads, recorded episodes, and entitlement enforcement are not implemented.
- Photos load from Unsplash, avatars from Pravatar, and fonts from Google Fonts. Replace remote samples with owned/approved, self-hosted assets before release.

## Live station

**Edit it from the admin:** Stations → SouthCity Live → **Configuration**. Change the name, description, genre, language, or public stream URL, then press **Publish to app**. Listener apps pick the change up within about 25 seconds; listeners hear a new stream address the next time they press play.

- Publishing goes through the SouthCity server: built into `npm run dev:app`, `npm run dev:admin`, and `npm run preview`, and hosted with `npm start` ([`server/liveStation.js`](server/liveStation.js)). With accounts, it saves to the Supabase `live_station` table with the publisher's own session, so row-level security applies; delete that row to return to the defaults in [`src/data/liveStream.js`](src/data/liveStream.js). Without accounts, it saves to `.local/live-station.json` (not committed).
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
