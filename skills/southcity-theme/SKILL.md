---
name: southcity-theme
description: Rebrand or retheme SouthCity using semantic design tokens, shared components, artwork rules, and the live component gallery.
---

# Southcity Theme

Read `../../docs/DESIGN_SYSTEM.md`. Inspect `../../src/styles/tokens.css` and `../../src/components/ui.jsx` before changing feature CSS.

Start with semantic roles: canvas, surface, ink, muted, line, brand, on-brand, feedback. Define light and dark values together. Update shared shape/type/action rules once instead of recoloring individual screens. Preserve clear primary actions and visible focus. A token edit should not change playback or navigation logic.

Station artwork and genre/spotlight palettes are intentionally editorial, with explicit colors in app.css. Recolor them deliberately if the request changes the entire art direction; do not promise that one accent token recolors every graphic. The gallery palette picker is temporary session state, while tokens.css is the permanent source.

Review Home, Discover, full player, station detail, Library, Profile, and admin dashboard/forms in both themes and at narrow/wide viewports. Check long titles, absent art, loading, errors, and focus. Use the design-review skill for a formal review only when needed; routine token edits do not require extra approvals.
