---
name: southcity-design-review
description: Review SouthCity visual consistency, mobile ergonomics, responsive behavior, design-token usage, accessibility, and consumer/admin UX.
---

# Southcity Design Review

Read `../../docs/DESIGN_SYSTEM.md` and the requested scope. Inspect actual rendered screens when browser access is available; do not claim visual verification from source alone.

Review at 390px mobile, an intermediate width, and 1440px desktop, including both themes. Check bottom-nav/player clearance, table containment, title wrapping, tap targets, keyboard focus, modal containment/restoration, reduced motion, status announcements, image fallbacks, and contrast. Verify that colors have semantic roles and that shared controls remain consistent across screens.

Consumer review follows discover → play → follow → return. Admin review checks operational state clarity, sample/live labeling, hierarchy, editable drafts, real failure feedback, and whether charts agree with tables. Check all seven audio states and empty/library/search cases relevant to the change.

Report concrete findings by severity with screen/file references, reproduction steps, observed vs expected behavior, and a small proposed correction. Separate verified issues from untested risks. If fixing is authorized, make the fixes and run appropriate checks rather than stopping at a checklist. Do not claim native or WCAG certification from a responsive browser inspection.
