---
name: southcity-library-profile
description: Implement SouthCity favorites, followed shows, recent listening, profile preferences, privacy reset, and local persistence.
---

# Southcity Library Profile

Read the state/persistence code in `../../src/App.jsx` and capability matrix in `../../docs/FEATURES.md`.

Persist stable station/show IDs, not duplicate catalog snapshots. Preserve existing local data and add tolerant migrations if storage shapes change. Corrupt, denied, or full storage must not crash the listener experience. Counts derive from actual local collections; never invent listening minutes.

Keep unknown history and unavailable episodes/downloads as useful empty states. Recorded content and downloads need backend URLs, entitlement rules, and real storage; do not attach live stream URLs as fake episodes. Notification toggles currently save a local preference and do not deliver push notifications.

Keep privacy language aligned with actual storage and external providers. Clearing listening data must clear all user-facing profile/collection settings without deleting unrelated origins or admin drafts. Test a follow/unfollow, reload, show collection, profile rename, and privacy reset after persistence changes.
