# Working on SouthCity Radio

This is a responsive React/Vite web prototype with separate consumer and admin experiences. Read README.md for current capability boundaries. Keep fixture content and local drafts honest; do not imply a Centova Cast connection, native background support, account protection beyond what the Supabase setup provides, or successful remote mutation that does not exist.

## Project skill routing

Read the relevant project SKILL.md before substantial feature work. These are local project instructions, not globally installed skills:

- Discovery, Home, station/show details: `skills/southcity-discovery/SKILL.md`
- Audio/player: `skills/southcity-audio/SKILL.md`
- Library, profile, persistence: `skills/southcity-library-profile/SKILL.md`
- Operations/admin: `skills/southcity-admin/SKILL.md`
- Centova integration: `skills/southcity-centova/SKILL.md`
- Brand/theme/components: `skills/southcity-theme/SKILL.md`
- Requested visual/UX/accessibility review: `skills/southcity-design-review/SKILL.md`
- Requested code/regression review: `skills/southcity-code-review/SKILL.md`

## Architecture and validation

Brand and semantic colors live in `src/styles/tokens.css`; shared primitives in `src/components/ui.jsx`. The audio provider lives above navigation. Preserve independent station artwork and the distinct operations visual language. No backend credentials belong in client code, browser storage, or Vite environment variables. Optional Supabase accounts expose only the public project URL and publishable key, served at runtime from `/api/auth-config`; never a service-role or secret key. Authorization lives in row-level security and server-side role checks, not in hidden UI.

Use `npm test`, appropriate Playwright flows (`npm run test:e2e`), `npm run build`, and `npm run format:check` for meaningful verification. Format with `npm run format`. Browser tests use installed Chrome.

Review skills report concrete findings with file references, severity, evidence, and useful fixes. They do not require a new permission gate for routine local changes. Commit and push phase-wise when requested in the active session; verify the intended repository and identity, and never overwrite remote history to bypass divergence.
