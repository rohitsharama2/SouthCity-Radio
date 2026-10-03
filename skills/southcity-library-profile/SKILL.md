---
name: southcity-library-profile
description: Implement SouthCity favorites, followed shows, recent listening, profile preferences, privacy reset, and local persistence.
---

# Southcity Library Profile

Read the state/persistence code in `../../src/App.jsx` and capability matrix in `../../docs/FEATURES.md`.

Persist stable station/show IDs, not duplicate catalog snapshots. Preserve existing local data and add tolerant migrations if storage shapes change. Corrupt, denied, or full storage must not crash the listener experience. Counts derive from actual local collections; never invent listening minutes.

Listening requires a Supabase account (see README "Accounts"). Signed in, favorites and followed shows are account data mirrored to `localStorage`: sign-in merges without removing anything, a follow the account rejects is undone with an explanation (never reported as saved), and leaving the account clears the mirror. History, theme, and notifications stay device-only. Allow browsing while signed out, but require sign-in for profile edits and playback, including system media controls. Stop playback on sign-out; loading or unavailable accounts must not bypass the gate. Keep privacy copy matched to which data is where.

Keep unknown history and unavailable episodes/downloads as useful empty states. Recorded content and downloads need backend URLs, entitlement rules, and real storage; do not attach live stream URLs as fake episodes. Notification toggles currently save a local preference and do not deliver push notifications.

Keep privacy language aligned with actual storage and external providers. Clearing listening data must clear all user-facing profile/collection settings without deleting unrelated origins or admin drafts. Test a follow/unfollow, reload, show collection, profile rename, and privacy reset after persistence changes.
