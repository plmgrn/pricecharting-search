# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  English / Magazines & misc). Verified that the IDs documented for
  the Marketplace API's `console=` parameter are the same identifiers
  the search-products URL accepts as `console-uid=` (e.g. `G2` =
  GameBoy Color). The options page's Console dropdown is populated
  from this list with `<optgroup>` headers.
- **Reference doc** (`docs/pricecharting-url-reference.md`) documenting
  every URL parameter, with confirmed enumerations for `sort`,
  `broad-category`, `region-name` (note: Japan's slug is `japan`, not
  `jp`), and the full `console-uid` story including the
  region/console overlap caveat.

### Changed
- Restructured the repository: source files moved under `src/`, developer
  docs under `docs/`, GitHub repo machinery under `.github/`. The
  extension itself is unchanged in behavior.
- `manifest.json` background path updated to `background/index.js`
  (file moved from repo root).

### Scaffolding
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
