# Search on PriceCharting

A browser *(currently chromium + firefox)* add-on to provide the functionality for searching pricecharting instantly?

Have you ever had a hobby of game collecting? Have you scoured the internet in search of deals? Have you had the absolute displeasure of seeing a listing, highlighting the text and pressing search with this query, only to end up with no pricecharting results?

Then **this add-on is just for you**. This *(for the time being)* simple add-on provides the additional option to search pricecharting with the query, opening a new tab with results for that article. This provides quick access for recent price history and versions of the article provided by pricecharting.

The roadmap is something like follows:
- Add settings for automatic region, currency etc.
- Add functionality for recognizing platform from query.
- Add a searchbar option for usage as a small querier, enabling having other pages in focus
- Add entirely new add-on functionality using the pricecharting API

## Features

- Adds a single context-menu item that only appears when text is selected.
- Opens the result in a new tab next to the current one.
- Zero tracking, zero remote code, hopefully more than zero results.


## TODO add install instructions with links to per-browser add-on marketplaces



## For open-source interested parties

### Chrome / Edge / Brave / Opera
1. Download or clone this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the **`src/`** folder of this repository.
5. Highlight some text → right-click → *Search "…" on PriceCharting*.

### Firefox (temporary install)
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick **`src/manifest.json`**.
3. The add-on stays loaded until you close Firefox. For permanent install you need a signed `.xpi` from [AMO](https://addons.mozilla.org/).

## Project structure

```
pricecharting-search/
├── README.md, LICENSE, NOTICE, CONTRIBUTING.md, CHANGELOG.md
├── .editorconfig, .gitignore
├── package.json, web-ext-config.cjs   # Dev tooling (never shipped)
├── docs/                               # Developer docs (architecture, roadmap)
├── .github/                            # Issue templates, CI
└── src/                                # Everything that ships to browsers
    ├── manifest.json
    ├── background/                     # Service worker entry + helpers
    ├── options/                        # (planned) settings page
    ├── popup/                          # (planned) toolbar action
    ├── content/                        # (planned) content scripts
    ├── lib/                            # Shared pure modules
    ├── _locales/                       # i18n catalogs
    └── assets/icons/                   # 16/48/128 px PNG icons
```

See [`docs/architecture.md`](./docs/architecture.md) for the folder
layout and conventions.


## License

This project is licensed under the **GNU Affero General Public License,
version 3** ([`LICENSE`](./LICENSE)), with the additional attribution and
commercial-licensing terms in [`NOTICE`](./NOTICE).

In short:

- **Personal / non-commercial use:** free. Install it, fork it, modify it,
  share it.
- **Forks and redistribution:** allowed, but must remain under AGPL-3.0,
  must keep the copyright notice and `NOTICE` file, must publish source,
  and must be renamed (the original project name and the author's name
  may not be used to endorse derivatives).
- **Commercial / monetized use** under terms incompatible with AGPL-3.0
  (e.g. closed-source bundling, paid SaaS integration): please contact
  the author first — see [`NOTICE`](./NOTICE) for contact channels. The
  goal is a heads-up, not a gatekeeping fee.

Contributions are welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md)
for how PRs are handled.

## Disclaimer

This extension is not affiliated with, endorsed by, or sponsored by PriceCharting. "PriceCharting" is a trademark of its respective owner. The extension simply opens the public search URL in your browser.
