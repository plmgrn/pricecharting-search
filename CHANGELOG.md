# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.2.3] - 2026-06-22

### Added
- Build step using `esbuild` to emit both an ES module service worker
  (`background/background.mjs`) and a legacy IIFE background script
  (`background/background.legacy.js`) from the single source `src/background/index.js`.

### Changed
- `scripts/build.js` and `package.json`: builds now copy `src/` → `build/`, bundle
  the background entry twice (ESM + IIFE), and patch the generated
  `build/manifest.json` so the packaged XPI contains both `service_worker`
  and a legacy `background.scripts` fallback for AMO/Firefox validation.
- Added `eslint.config.mjs` and small lint fixes across `src/lib/*`.

### Fixed
- AMO validation error caused by a manifest that referenced only an
  MV3 `service_worker` and no Firefox-compatible fallback; the new build
  produces the legacy fallback so AMO no longer rejects the package as
  "corrupted". `web-ext lint` reports the expected
  `BACKGROUND_SERVICE_WORKER_IGNORED` warning only.

## [1.2.2] -- 2026-05-26

### Changed
- Settings module now accepts an optional API override parameter for
  dependency injection, enabling real-module testing without browser.
- API shim (`api.js`) no longer throws in non-browser environments
  (falls back to empty object).

### Fixed
- Test suite now exercises the real `settings.js` module instead of a
  re-implementation, catching actual regressions.

### Added
- Test coverage for `defaults.js` (shape, types, immutability).
- Test coverage for `console-aliases.js` (integrity, keyword shadowing).
- Edge-case tests across query-parser, url-template, and consoles
  (non-string inputs, custom template schemes, boolean param handling,
  structural integrity checks).
- Common console nicknames (ps1, psx, vita, sfc, megadrive, xbone,
  switch, gc, 2ds, dsi, etc.) now work as filter keywords.
- New query-parser keywords: `mtg`, `yugioh` (trading cards), `manga`
  (comics), `toys` (funko/pops), `cheap` (price-lowest), `newest`
  (date-added), `asc` (alphabetical), `desc` (price-highest).
- More keyword synonyms: `vg` (video-games), `magic`, `lorcana`,
  `onepiece` (trading cards), `figures` (funko-pops), `aus`, `uk`
  (PAL region), `american` (NTSC), `japanese` (Japan), `az` (alpha
  sort), `pricey` (price-highest), `budget` (price-lowest),
  `trending`, `recent`, `latest` (date-added).
- Console aliases: `dc` (Dreamcast), `sms` (Master System), `gg`
  (Game Gear), `fc` (Famicom), `xss`/`series s`/`series x` (Xbox
  Series X), `2600`, `7800` (Atari).
- Options page warns when a custom URL template is missing the
  required `{q}` placeholder.

### Fixed
- Filter syntax (e.g. `pal,ps2:zelda`) now works from the context
  menu and keyboard shortcut, not just the omnibox and popup.
- Selecting a console filter no longer inherits an unrelated saved
  category (e.g. comics) -- console filters now imply video-games.
- Console aliases like `mastersystem` and `gamegear` (without spaces)
  now resolve correctly.
- Firefox detection in theme module no longer relies on user-agent
  sniffing, uses the same runtime check as the API shim.
- Collapsible sections in the options page can no longer get stuck
  mid-animation if the CSS transition is interrupted.
- Settings writes now filter out unknown keys, preventing stray data
  from accumulating in storage.

### Internal
- Added test suite (`node --test`) with 705 tests covering query
  parsing, console alias resolution, URL construction round-trips,
  data integrity, and settings persistence.
- ESLint config (`.eslintrc.json`) with WebExtension-aware environment
  settings. Source passes clean. Wired into `npm run lint`.
- Extension name and description now use `chrome.i18n` message
  references (`__MSG_*__`) via `_locales/en/messages.json`.
- Wired `npm test` into CI (GitHub Actions, Node 22).
- Added `"type": "module"` to package.json.

## [1.2.1] — 2026-05-20

### Fixed
- Combining a region and console filter (e.g. `jp,ds:zelda`) now
  resolves to the region-specific console on PriceCharting instead of
  the default Americas variant.
- Selection length cap now defaults correctly when set to zero.
- Added accessible label to the popup search field.

## [1.2.0] — 2026-05-08

### Added
- **Toolbar popup** — click the extension icon to search directly
  without selecting text first. Respects all filters and open-behavior
  settings.
- **Omnibox search** — type `pchart` in the address bar, press Tab,
  then type your query to search PriceCharting instantly.
- **Keyboard shortcut** (`Alt+S`, opt-in) — searches the current
  text selection on PriceCharting.
- **Query filter syntax** — prefix your search with comma-separated
  keywords before a colon to override filters inline
  (e.g. `ps2,pal:god of war`, `cards:pikachu`, `raw:zelda`).
  Supports category, region, sort, platform aliases, and more.
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
- Unified colour system: all surfaces share a single
  `colour-profiles.css` with browser-matched dark/light palettes.
- Status indicator uses accent colour and longer fade.
- Hardened input validation and error handling.

### Fixed
- Removed invalid `scripts` key from the manifest `background` block.
  Re-added `service_worker` for Firefox compatibility.
- Theme detection now reacts to OS dark/light mode changes while the
  popup or options page is open.
- Language names display correct diacritics (Español, Français,
  Português) and proper Cyrillic script (Русский).
- Added `minimum_chrome_version: 111` to manifest — required for
  `color-mix()` CSS support.
- Settings gear icon in popup now has `aria-hidden` for screen readers.
- Console alias `x` no longer accidentally maps bare `x:query` to Xbox.
- Options "Done" button falls back to `history.back()` when the tab
  wasn't opened by script.
- Popup and setup pages await `openOptionsPage()` before closing to
  avoid a race condition.
- Privacy policy now documents the `scripting` permission and custom
  URL template behaviour.
- Popup now has a `<title>` element for accessibility tools.
- Removed dead CSS fallback for `--field-hover-bg` in popup.
- Stale changelog entry about `action.onClicked` corrected (superseded
  by popup in 1.2.0).
- Architecture doc marks `content/` folder as planned, not present.
- Roadmap item clarified: basic `platform:query` syntax exists; the
  item now describes free-text auto-detection.

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
  toolbar button (which un-greys the icon in Firefox). In 1.1.0 the
  background script opened the options page on click; since 1.2.0 a
  popup is shown instead (`default_popup` suppresses `onClicked`).
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

## [1.0.0] — 2026-01-01

### Added
- Initial release.
- Context-menu item "Search '%s' on PriceCharting" appears on text selection.
- Opens search results in a new tab adjacent to the source tab.
- Cross-browser (`chrome` / `browser`) compatibility shim.
- Firefox `gecko.id` set for AMO submission readiness.
- AGPL-3.0 license + `NOTICE` with attribution and commercial-licensing terms.

[1.2.0]: https://github.com/plmgrn/pricecharting-search/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/plmgrn/pricecharting-search/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/plmgrn/pricecharting-search/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/plmgrn/pricecharting-search/releases/tag/v1.0.0
