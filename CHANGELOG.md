# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] — 2026-05-08

### Added
- **First-run setup page** — new installs open a quick-start wizard
  (category, region, language) so users don't have to dig through
  settings. Can be re-run from the options page footer.
- **Magazine / publication filter** in Additional settings, mutually
  exclusive with the console dropdown.
- Placeholder fields (max selection length, context-menu title) now
  seed with the default value on focus, so users can edit from the
  existing text instead of retyping it.

### Changed
- Options page polish: help descriptions on all fields, dividers
  between filter groups, hint icon on variant editions, "Run setup
  again" link in footer.
- Status indicator uses accent color and longer fade.

## [1.1.1] — 2026-05-06

### Fixed
- Custom URL templates now reject non-HTTP(S) schemes (e.g. `javascript:`,
  `data:`) — prevents potential misuse.
- Settings storage reads only known keys, ignoring stray data.
- Settings-change listener no longer double-fires across storage areas.
- Selection length is clamped to a hard maximum of 2000 characters,
  even if manually edited in browser storage.
- Graceful error handling when opening a result tab fails.
- Context menu no longer needlessly recreates itself on first startup.
- Fixed typos in code comments.

## [1.1.0] — 2026-05-06

### Added
- **Options page** (`src/options/`) with three progressively-disclosed
  sections — Basic (always visible), Additional, and Experimental —
  using `<details>` elements with smooth JS-driven height animation.
  - All filter inputs are `<select>` dropdowns populated from
    confirmed PriceCharting values (broad-category, region-name, sort).
  - Auto-save on change (debounced), reset-to-defaults button,
    cross-tab refresh via `storage.onChanged`.
  - System-font, color-scheme aware (dark/light follows the OS).
  - Reserved scrollbar gutter so opening collapsibles doesn't shift
    the layout horizontally.
- **Toolbar action**: `action` entry in the manifest declares the
  toolbar button (which un-greys the icon in Firefox). The background
  script handles `action.onClicked` by opening the options page via
  `runtime.openOptionsPage()`. Future popup support is one manifest
  line away — adding `default_popup` automatically suppresses the
  click handler.
- **Console enumeration** (`src/lib/consoles.js`): the full Console ID
  Table (~200 entries) extracted from PriceCharting's official API
  documentation, grouped by region (Americas / PAL / Japan / Asian
  English / Magazines & misc).
- **Console group filter**: dropdown in Additional settings that
  narrows the console dropdown to a single region.
- **Extension icons**: 16/32/48/64/128 px PNGs wired into the manifest
  (`icons` + `action.default_icon`).
- **Reference doc** (`docs/pricecharting-url-reference.md`) documenting
  every URL parameter, with confirmed enumerations for `sort`,
  `broad-category`, `region-name`, and `console-uid`.
- **Agent instructions** (`.github/copilot-instructions.md`) capturing
  coding style, naming, and project conventions.

### Changed
- Context-menu title changed to `Search PriceCharting for "%s"`.
- Renamed `regionUid` setting to `consoleGroup` — it's a UI-only
  field that filters the console dropdown, never sent as a URL param.
- Fixed stale comments in `defaults.js` (`jp` → `japan`,
  `pokemon-cards` → `trading-cards`).
- Updated project tree in `README.md` and `docs/architecture.md` to
  match actual on-disk layout (removed phantom planned folders).

### Scaffolding
- Restructured the repository: source files moved under `src/`, developer
  docs under `docs/`, GitHub repo machinery under `.github/`. The
  extension itself is unchanged in behavior.
- `manifest.json` background path updated to `background/index.js`
  (file moved from repo root).
- `CHANGELOG.md`, `.editorconfig`, `package.json`, `web-ext-config.cjs`
  for `web-ext` + ESLint.
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
