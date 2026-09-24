# SouthCity design system

## Art direction

SouthCity feels like an independent music publication with a live broadcast at its heart. Warm canvas, strong ink, terracotta action color, considered typography, and tactile editorial artwork keep the listener's attention on the music. Admin uses the same family of colors with denser tables and sober operational hierarchy.

## Token layers

`src/styles/tokens.css` contains brand primitives and semantic roles:

| Role     | Tokens                                                       | Guidance                                                        |
| -------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Action   | `--brand`, `--brand-hover`, `--brand-soft`, `--on-brand`     | Primary actions, active navigation, selection, live accents     |
| Surfaces | `--canvas`, `--surface`, `--surface-alt`                     | Page, cards/dialogs, subtle grouping                            |
| Text     | `--ink`, `--muted`                                           | Primary and secondary hierarchy; verify contrast when retheming |
| Borders  | `--line`                                                     | Dividers, fields, subtle card boundaries                        |
| Feedback | `--success`, `--danger`                                      | Pair color with text or icons                                   |
| Shape    | `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill` | Fields, cards, editorial panels, chips/actions                  |
| Type     | `--font-body`, `--font-display`                              | DM Sans and Manrope; change centrally and recheck wrapping      |
| Rhythm   | `--space-1` through `--space-7`                              | Preferred spacing steps for new shared components               |
| Motion   | `--motion-fast`                                              | Subtle feedback; reduced-motion preference is respected         |
| Shell    | `--sidebar-width`, `--player-height`                         | Navigation and persistent player clearance                      |

Dark mode overrides semantic surfaces and text under `[data-theme='dark']`. Never create separate hardcoded dark variants per screen when a semantic token suffices. Existing artwork, genre cards, spotlight poster, and analytic categorical colors intentionally have editorial palettes; they are not all controlled by `--brand`.

Some layout spacing and specialized illustration geometry remain explicit CSS values. Changing the spacing tokens does not automatically rescale every existing layout. Brand color, surfaces, type families, shared radii, and common components are the principal centralized controls.

## Shared components

`src/components/ui.jsx` exports:

- `Brand`: product signature and compact mark.
- `Button`, `IconButton`: action variants, disabled behavior, accessible names.
- `LiveBadge`: small, redundant text + color broadcast status.
- `Artwork`: consistent ratio with distinct station-specific art direction.
- `StationCard`: artwork, metadata, open/play/follow actions.
- `SectionHeading`: title, description, optional contextual action.
- `Modal`: Escape/backdrop close, focus containment/restoration, background scroll lock.
- `EmptyState`, `ErrorState`, `LoadingState`, `Skeleton`: reusable feedback.

Consumer player layout is in `App.jsx`; audio behavior is in `AudioProvider.jsx`. Admin metrics, chart, queue, station form, and directory table are local components in `Admin.jsx`. Extract them to shared modules when another feature genuinely needs the same behavior.

## Layout and responsive behavior

- Desktop: fixed consumer sidebar, full-width persistent player, editorial content grid.
- Mobile (760px and below): five-tab bottom navigation, mini-player directly above it, safe-area padding, two-column station cards, horizontally scrollable recent-listening strip.
- Admin: permanent sidebar on desktop, explicit menu drawer on mobile, contained horizontal scroll for wide operational tables.
- Dialogs: centered, height-limited and scrollable; they behave as compact overlays on mobile. A drag-to-dismiss native bottom sheet is not implemented.
- Keep desktop and mobile information equivalent; avoid hiding essential controls solely to fit a layout.

## Motion and accessibility

All actionable artwork and icon controls have accessible names. Focus outlines are visible. Dialogs trap focus and return it to the original control. Notifications use status regions. Toggles use switch semantics. Loading is announced; decorative skeletons are hidden from assistive technology. Charts have descriptive labels, with CSV export for sample station listener figures.

Before release, run a full contrast/keyboard/screen-reader audit. The compact desktop visual language includes small captions and controls; native mobile release should raise small targets to at least 44pt/48dp with generous hit areas and respect system text scaling. Do not claim WCAG conformance from the browser smoke tests alone.

## Rebrand procedure

1. Update `tokens.css`, including both themes. Check action text contrast and muted text on all surfaces.
2. Update `Brand` and font resources if needed.
3. Change shared component styling once, then inspect all consumers.
4. Update editorial artwork and specialized palettes deliberately if the art direction changes.
5. Inspect the gallery, Home, Discover, station detail, full player, Library, Profile, admin Dashboard, monitor, schedule, and forms at 390px, 768px, and 1440px.
6. Run browser tests and production build; record remaining visual/accessibility issues.

Use the `southcity-theme` skill for implementation and `southcity-design-review` for the review pass. Review instructions do not create an extra approval gate for normal local edits.
