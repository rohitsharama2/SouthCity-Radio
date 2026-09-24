---
name: southcity-discovery
description: Implement SouthCity consumer discovery, Home, station and show details, and search/filter flows.
---

# Southcity Discovery

Read `../../docs/FEATURES.md` and the relevant portions of `../../src/App.jsx` and `../../src/data/stations.js`.

Preserve the editorial Home hierarchy and the five mobile tabs. Keep card open, play, and follow as independent actions; do not nest interactive controls. Search covers station, show, song, artist, and host together. Genre and language filters combine with the query and can be reset after empty results. Preserve keyboard Cmd/Ctrl+K behavior.

Station/show schedules currently use sample data and IST. Do not manufacture live metadata or recorded episodes. A future normalized metadata store must update cards and detail screens without remounting audio or resetting focus/scroll. Unknown listeners differ from zero.

Use shared StationCard, Artwork, SectionHeading, and feedback components. Validate discovery filtering, detail navigation, show follow, and the mobile two-column layout. Expand tests only when behavior changes. Use the integration skill when replacing fixtures with a real API.
