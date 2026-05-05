# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Restructured the repository: source files moved under `src/`, developer
  docs under `docs/`, GitHub repo machinery under `.github/`. The
  extension itself is unchanged in behavior.
- `manifest.json` background path updated to `background/index.js`
  (file moved from repo root).

### Added
- `CHANGELOG.md`, `.editorconfig`, `package.json`, `web-ext-config.cjs`
  scaffolding for upcoming tooling work (`web-ext`, ESLint).
- `docs/architecture.md` describing the new layout.
- Issue templates under `.github/ISSUE_TEMPLATE/`, including
  `commercial-license.md` to match the contact channel in `NOTICE`.

## [1.0.0] — 2026

### Added
- Initial release.
- Context-menu item "Search '%s' on PriceCharting" appears on text selection.
- Opens search results in a new tab adjacent to the source tab.
- Cross-browser (`chrome` / `browser`) compatibility shim.
- Firefox `gecko.id` set for AMO submission readiness.
- AGPL-3.0 license + `NOTICE` with attribution and commercial-licensing terms.
