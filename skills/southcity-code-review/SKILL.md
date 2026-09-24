---
name: southcity-code-review
description: Review SouthCity functional correctness, regressions, architecture, audio races, data handling, and integration security.
---

# Southcity Code Review

Start with the changed diff and its callers. Read `../../README.md` and relevant feature/integration documents to avoid evaluating prototype behavior as if it were connected production functionality.

Prioritize behavior: audio ownership and stale events; cleanup of timers/listeners/object URLs; storage parsing and write failures; stable IDs and derived collections; modal accessibility; error paths; query/filter combinations; schedule timezones; and admin draft/publish boundaries. Inspect real API work for server-side authorization, secrets, payload validation, safe retries, and honest success reporting.

Use observable tests, not tests that match implementation wording. Do not spend review effort adding snapshots or mirroring trivial styling. Run only meaningful affected tests and the build; broaden checks when a discovered issue justifies it.

Output actionable findings with severity, exact file location, triggering scenario, and impact. State what was actually verified and what remains untested. If there are no findings, say so plainly without implying certainty about untested native or backend behavior. Review does not itself authorize unrelated refactors, production operations, or communications.
