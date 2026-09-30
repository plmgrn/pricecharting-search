# <img src="src/icons/pricecharting-search_48x48.png" width="32" height="32" alt="icon"> Search on PriceCharting

A browser extension for searching PriceCharting from any page.
Works on Chrome, Firefox, Edge, Brave, Opera, Vivaldi, and Arc.

Highlight text, right-click, and search PriceCharting for it. Made for game collectors, card traders, and anyone tired of copy-pasting into a search bar.

## Install

Install from your browser's official extension store. Store versions are reviewed, signed, and auto-updated.

[![Chrome](https://img.shields.io/badge/Chrome-Install-blue?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/ceacaeigjpbjgaidagikpilbldjnnafk)
[![Firefox](https://img.shields.io/badge/Firefox-Install-orange?logo=firefox&logoColor=white)](https://addons.mozilla.org/firefox/addon/search-on-pricecharting/)

Edge, Brave, and Opera are built on the same engine as Chrome and can install directly from the Chrome Web Store.

[![Edge](https://img.shields.io/badge/Edge-Install-blue?logo=microsoftedge&logoColor=white)](https://chromewebstore.google.com/detail/ceacaeigjpbjgaidagikpilbldjnnafk)
[![Brave](https://img.shields.io/badge/Brave-Install-blue?logo=brave&logoColor=white)](https://chromewebstore.google.com/detail/ceacaeigjpbjgaidagikpilbldjnnafk)
[![Opera](https://img.shields.io/badge/Opera-Install-blue?logo=opera&logoColor=white)](https://chromewebstore.google.com/detail/ceacaeigjpbjgaidagikpilbldjnnafk)

## Features

- Right-click selected text and pick *Search PriceCharting for "…"*.
- Toolbar popup with a quick search bar.
- Omnibox: type `pchart` and press Tab in the address bar.
- Keyboard shortcut: `Alt+S` searches the selected text (opt-in).
- Inline filters: `ps2,pal:god of war` overrides your defaults for that search.
- Configurable filters: category, console/platform, region, sort order, and more.
- Options page with three levels: Basic, Additional, Experimental.
- First-run setup wizard.
- Dark/light mode follows the OS.
- No tracking, no remote code, hopefully more than zero results.

## Roadmap

- Settings presets: save and switch between named filter configurations.
  This would also allow one context-menu item per preset.
- Auto-detect platform from free-text queries (beyond the existing
  `platform:query` filter syntax).
- Localization (i18n) through `chrome.i18n`.
- Search history / recent searches in the popup.
- Omnibox suggestions as you type.
- Firefox for Android support.
- Accessibility pass: keyboard navigation, focus management, screen reader coverage.
- PriceCharting API integration (v2).
- Game-name aliases and fuzzy matching in the query parser.
- Import/export settings as JSON.
- Configurable context-menu label text.

## Manual install (for developers)

### Chrome / Edge / Brave / Opera
1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the **`src/`** folder of this repository.
5. Highlight some text, right-click, and pick *Search "…" on PriceCharting*.

### Firefox (temporary install)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick **`src/manifest.json`**.
3. The add-on stays loaded until you close Firefox. For a permanent install you need a signed `.xpi` from [AMO](https://addons.mozilla.org/).

## Project structure

```
pricecharting-search/
├── README.md, LICENSE, NOTICE, CONTRIBUTING.md, CHANGELOG.md
├── .editorconfig, .gitignore
├── package.json, web-ext-config.cjs   # Dev tooling (never shipped)
├── docs/                               # Developer docs (architecture, URL reference)
├── media/                              # Screenshots for store listings
├── .github/                            # Issue templates, CI
└── src/                                # Everything that ships to browsers
    ├── manifest.json
    ├── _locales/                       # i18n string catalogs
    ├── background/                     # Service worker entry
    ├── icons/                          # 16/32/48/64/128 px PNGs
    ├── lib/                            # Pure modules (no DOM)
    ├── shared/                         # Cross-surface CSS + theme detection
    ├── options/                        # Settings page
    ├── popup/                          # Toolbar action popup
    └── setup/                          # First-run setup wizard
```

Planned: `content/` (content scripts).

See [`docs/architecture.md`](./docs/architecture.md) for the folder
layout and conventions.

## License

Licensed under the **GNU Affero General Public License, version 3**
([`LICENSE`](./LICENSE)), with additional attribution and commercial-licensing
terms in [`NOTICE`](./NOTICE).

In short:

- **Personal / non-commercial use:** free. Install it, fork it, modify it, share it.
- **Forks and redistribution:** allowed, but they must stay under AGPL-3.0,
  keep the copyright notice and `NOTICE` file, publish their source, and be
  renamed. The original project name and the author's name may not be used to
  endorse derivatives.
- **Commercial / monetized use** under terms incompatible with AGPL-3.0
  (for example closed-source bundling or paid SaaS integration): contact the
  author first, see [`NOTICE`](./NOTICE). It's a heads-up, not a fee.

Contributions are welcome, see [`CONTRIBUTING.md`](./CONTRIBUTING.md)
for how PRs are handled.

## Disclaimer

This extension is not affiliated with, endorsed by, or sponsored by PriceCharting. "PriceCharting" is a trademark of its respective owner. The extension simply opens the public search URL in your browser.
