---
name: southcity-admin
description: Implement SouthCity broadcast operations screens, station configuration, AutoDJ, playlists, media, scheduling, people directories, and analytics.
---

# Southcity Admin

Read `../../src/components/Admin.jsx`, `../../src/styles/admin.css`, and the operations table in `../../docs/FEATURES.md`.

Keep the admin shell visually separate from consumer discovery. The current workspace is a local preview: controls may save drafts but cannot claim remote success. Station config drafts do not publish to the consumer catalog. When adding a backend, model draft, saving, success, and failed states explicitly and enforce permissions server-side.

Schedule time is IST in the prototype. Connected schedules need UTC timestamps, a declared display timezone, overlap handling, and server execution. File selection is not upload; validate real media on the server. Adding a local person record is not sending an invitation.

Charts, summary metrics, rows, exports, and date ranges should derive from a coherent data source when connected. Label sample data. Wide tables scroll within their container; mobile pages must not acquire document-level overflow.

With accounts configured the workspace is gated by `isStaff`, and publishing by `canPublish` (`src/data/accounts.js`); the server re-checks the role on every write (`server/accounts.js`). New privileged endpoints must call the server check too, never rely on the hidden button. Without accounts, keep the local same-machine behavior.

Validate config draft persistence, playlist lifecycle, schedule creation, monitor state, relevant directory changes, and both themes. Use actual authorization context for live operations; do not introduce approval gates for harmless local drafts.
