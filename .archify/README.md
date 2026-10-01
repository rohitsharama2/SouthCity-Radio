# Archify repository analysis

Tool: [tt-a1i/archify](https://github.com/tt-a1i/archify), Codex skill metadata version 3.0. Installed locally at `~/.codex/skills/archify`; it is available to subsequent Codex turns. It is not an application runtime dependency.

## Current snapshot

Source: `ec66b0599996bb7d63a3bb2c125115092202e671` (2026-10-01 analysis).

- [Repository analysis](../docs/ARCHITECTURE.md)
- [Interactive architecture HTML](architecture-southcity-20261001-105225/southcity.html)
- [Editable specification](architecture-southcity-20261001-105225/candidate.json)
- [Validation and visual-review handoff](architecture-southcity-20261001-105225/VALIDATION.md)
- [Final validation summary](architecture-southcity-20261001-105225/review-2/southcity.finalize-summary.json)
- [Automated browser evidence](architecture-southcity-20261001-105225/review-2/southcity.browser-check.json)

Download the HTML from GitHub and open it in a browser. GitHub's file viewer does not execute this interactive document. Source links in the diagram point to the analyzed commit.

## Reproduce this snapshot

After installing the `archify` skill from `tt-a1i/archify`, run from the repository root:

```sh
ARCHIFY_UPDATE_CHECK_DISABLED=1 node "$HOME/.codex/skills/archify/bin/archify.mjs" finalize architecture \
  .archify/architecture-southcity-20261001-105225/candidate.json \
  .archify/architecture-southcity-20261001-105225/southcity.html \
  --repo-root "$PWD" --quality showcase \
  --out-dir .archify/architecture-southcity-20261001-105225/reproduction --json
```

Use a fresh evidence directory after changing the candidate. For a new source revision, create a new snapshot folder and retrace the implementation before updating citations. The `LATEST` file is a relative pointer to the current analysis folder.

Generated receipts retain tool-recorded absolute local paths for provenance; those paths do not contain environment values or credentials. Historical first-layout receipts are retained separately from the final `review-2` receipt and are not evidence for the final HTML.

The generated viewer uses Archify and its bundled dependencies. See [Archify license](ARCHIFY-LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
