# Architecture

This document describes the on-disk layout of the repository and the
conventions each folder follows. It is intentionally short — the codebase
is small. Update it whenever the layout changes.

> For the *licensing model*, see [`../NOTICE`](../NOTICE) and
> [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## Top-level layout

```
pricecharting-search/
├── README.md, LICENSE, NOTICE, CONTRIBUTING.md, CHANGELOG.md
├── .editorconfig, .gitignore
├── package.json, web-ext-config.cjs       # Dev tooling (never shipped)
├── test/                                   # Unit tests (node --test)
├── docs/                                   # Developer documentation
├── media/                                  # Screenshots for store listings
├── .github/                                # Issue templates, CI
└── src/                                    # Everything that ships
```

**Rule of thumb:** if a file is read by humans before they touch the
code, it lives at the root or in `docs/`. If it is read by the browser
at runtime, it lives in `src/`.

## `src/` — the shippable extension

`src/` is the directory `web-ext` packages and the directory you point
"Load unpacked" at in Chrome. The `manifest.json` lives at its root.

Current layout:

```
src/
├── manifest.json
├── background/
│   └── index.js          # MV3 service worker entry
├── icons/                # Extension icons (16–128 px PNGs)
├── lib/                  # Pure modules — no DOM, no side effects
│   ├── api.js            # browser/chrome shim
│   ├── console-aliases.js # Curated nickname-to-ID mappings
│   ├── consoles.js       # Console ID table (~200 entries)
│   ├── defaults.js       # DEFAULTS, SCHEMA_VERSION, constants
│   ├── query-parser.js   # filter:query delimiter parser
│   ├── settings.js       # read/write/reset/migrate
│   └── url-template.js   # normalizeSelection, buildSearchUrl
├── shared/               # Cross-surface assets that touch the DOM
│   ├── colour-profiles.css # Browser/theme colour variables
│   └── detect-theme.js    # Browser + scheme detection, applies profile class
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── setup/
    ├── setup.html
    ├── setup.css
    └── setup.js            # First-run setup wizard
```

Planned surfaces:

```
src/
├── content/          # Content scripts
└── _locales/         # i18n message catalogs
```

### Folder responsibilities

| Folder | Owns | Imports from |
|---|---|---|
| `background/` | Service-worker lifecycle, event listeners (`onInstalled`, `contextMenus.onClicked`, `commands.onCommand`, `omnibox`). | `lib/` |
| `options/` | Settings UI. HTML + JS + CSS only; no business logic. | `lib/`, `shared/` |
| `setup/` | First-run setup wizard. Saves quick-start choices and marks setup complete. | `lib/`, `shared/` |
| `popup/` | Toolbar action popup with quick-search bar. | `lib/`, `shared/` |
| `shared/` | Cross-surface assets that touch the DOM: colour profiles CSS, theme detection JS. | nothing project-specific |
| `content/` | *(planned)* DOM-touching scripts injected into pages (e.g. reading the selection for keyboard shortcut). Kept tiny. | `lib/` (only pure modules) |
| `lib/` | Pure modules: API shim, defaults, settings wrapper, URL templating. **No** listeners, **no** direct DOM access. Safe to import from any surface. | nothing project-specific |
| `_locales/` | Browser-mandated i18n catalogs. | n/a |
| `icons/` | Extension icons (16–128 px PNGs). | n/a |

### Import direction

```
background/ ─┐
options/    ─┤
setup/      ─┼──► lib/     (pure logic)
popup/      ─┤
content/    ─┘
       └────────► shared/  (CSS + theme detection)
```

`lib/` never imports from a surface folder. `shared/` never imports from
a surface folder. Surfaces never import from each other; if two surfaces
need the same pure logic, it belongs in `lib/`; if they need shared DOM
assets, it belongs in `shared/`.

## `test/` — unit tests

Run with `npm test` (Node 22+, `node --test`). Pure-logic tests only,
no browser APIs needed.

| File | Covers |
|---|---|
| `consoles.test.mjs` | Data integrity: no duplicate IDs, valid groups, MAGAZINES subset. |
| `query-parser.test.mjs` | Keyword parsing, console alias resolution, regional swaps, adversarial inputs, fuzz. |
| `settings.test.mjs` | Read/write/reset, schema migration, change subscription, area fallback. |
| `url-template.test.mjs` | Selection normalization, URL construction, custom templates, round-trip deconstruction. |

## `docs/` — developer documentation

| File | Purpose |
|---|---|
| `architecture.md` | This file. Layout + conventions only. |
| `privacy-policy.md` | Privacy policy for store listings. |
| `pricecharting-url-reference.md` | URL parameter reference for the search-products endpoint. |

Maintainer-only working notes (status, roadmap, internal TODOs) live in
the git-ignored `local/` folder and are not part of the published repo.

## `.github/` — repository machinery

| Path | Purpose |
|---|---|
| `ISSUE_TEMPLATE/bug_report.md` | Standard bug-report template. |
| `ISSUE_TEMPLATE/feature_request.md` | Feature-request template. |
| `ISSUE_TEMPLATE/commercial-license.md` | Backs the commercial-licensing contact channel listed in `NOTICE`. |
| `workflows/ci.yml` | Test + lint + build on push/PR. |

## Tooling at the root

| File | Purpose |
|---|---|
| `package.json` | Dev dependencies (`web-ext`, eslint later) and npm scripts. Not shipped to browsers. |
| `web-ext-config.cjs` | Tells `web-ext` to use `src/` as the source dir, where to put artifacts, and what to ignore. |
| `.editorconfig` | Shared editor settings (LF, UTF-8, 2-space indent). |
| `.gitignore` | Ignores `web-ext-artifacts/`, `node_modules/`, OS junk. |

## Adding new code — quick decision tree

1. **Does it run in the browser?** → `src/`. Otherwise → root or `docs/`.
2. **Does it have a UI surface (own HTML page or popup)?** → its own folder under `src/` (`options/`, `popup/`, …).
3. **Is it pure logic reusable across surfaces?** → `src/lib/`.
3b. **Is it reusable across surfaces but touches the DOM?** → `src/shared/`.
4. **Does it touch the DOM of arbitrary web pages?** → `src/content/`, and it must be added to `manifest.json` with a justified host pattern.
5. **Is it static (icon, image, json data)?** → `src/icons/` (or a
   future `src/assets/` if non-icon assets are needed).
6. **New permission needed?** → manifest update **and** an explicit
   justification in the PR description.
