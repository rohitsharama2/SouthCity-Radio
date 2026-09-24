---
name: southcity-centova
description: Design or implement the server-side Centova Cast adapter, application API, real-time metadata, stream health, and privileged station operations.
---

# Southcity Centova

Read `../../docs/INTEGRATION.md` before implementing. Its endpoints are proposed SouthCity contracts, not Centova Cast endpoints.

First identify the actual Centova Cast version, configured stream software, API availability, account capabilities, and deployment runtime. Verify current official documentation for those facts; do not guess infrastructure API routes. Consumer branding and models must remain independent of Centova administration screens.

Keep credentials exclusively server-side. Normalize station IDs, artwork fallbacks, stream format/status, track/show/host metadata, AutoDJ mode, schedules, recent tracks, and nullable listeners. Use one cache/event pipeline instead of polling per UI component. Validate event versions and fields; reconnect, rehydrate snapshots, and display stale data honestly.

Never refresh the page or recreate the audio element to apply metadata. Public playback URLs must be HTTPS and credential-free. Privileged operations require session/tenant/station authorization, audit records, server validation, and idempotent retry behavior where relevant.

Test adapter mapping and failures using captured/synthetic provider responses; integration tests against real infrastructure need the user's actual authorized scope. Do not turn a proposal into an unrequested live deployment.
