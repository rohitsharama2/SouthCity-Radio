---
name: southcity-audio
description: Implement and review SouthCity playback lifecycle, mini/full players, transport states, sleep timers, and system media controls.
---

# Southcity Audio

Read `../../src/components/AudioProvider.jsx`, player consumers in `../../src/App.jsx`, and audio requirements in `../../docs/INTEGRATION.md`.

Keep one audio owner above consumer/admin navigation. Do not set audio.src for metadata-only changes. Treat broadcast status, transport status, and AutoDJ/DJ mode as distinct state. Handle rapid station switches so stale play promises or media events do not overwrite the current session. Clear listeners and timers during cleanup.

Use user gestures for playback. Loading is not success: transition to playing from the media event. Expose retry for connection failure, describe offline distinctly, and avoid treating unknown metadata as a stream failure. Preserve volume, sleep settings, and selected station when navigating. Media Session metadata must describe the actual audio; sample track names do not describe preview streams.

Use mocked network/media events for deterministic browser tests and a separately documented manual check for real streams. Native background behavior requires a chosen runtime, iOS/Android configuration, interruptions, route changes, lock-screen integration, and physical devices; browser tests cannot establish it. Do not silently claim native support.
