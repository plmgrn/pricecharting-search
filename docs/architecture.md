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
├── docs/                                   # Developer documentation
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
├── lib/
│   ├── api.js            # browser/chrome shim
│   ├── consoles.js       # Console ID table (~200 entries)
│   ├── defaults.js       # DEFAULTS, SCHEMA_VERSION, constants
│   ├── settings.js       # read/write/reset/migrate
│   └── url-template.js   # normalizeSelection, buildSearchUrl
└── options/
    ├── options.html
    ├── options.css
    └── options.js
```

Planned surfaces — each will appear as a sibling of `background/` when
the corresponding feature lands:
below so the layout is decided in advance:

```
src/
├── popup/            # Toolbar action popup
├── content/          # Content scripts
└── _locales/         # i18n message catalogs
```

### Folder responsibilities

| Folder | Owns | Imports from |
|---|---|---|
| `background/` | Service-worker lifecycle, event listeners (`onInstalled`, `contextMenus.onClicked`, `commands.onCommand`, `runtime.onMessage`). | `lib/` |
| `options/` | Settings UI. HTML + JS + CSS only; no business logic. | `lib/` |
| `popup/` | Toolbar action popup, if/when one is added. | `lib/` |
| `content/` | DOM-touching scripts injected into pages (e.g. reading the selection for keyboard shortcut). Kept tiny. | `lib/` (only pure modules) |
| `lib/` | Pure modules: API shim, defaults, settings wrapper, URL templating. **No** listeners, **no** direct DOM access. Safe to import from any surface. | nothing project-specific |
| `_locales/` | Browser-mandated i18n catalogs. | n/a |
| `assets/` | Static assets shipped with the extension (icons, future SVGs, etc.). | n/a |

### Import direction

```
background/ ─┐
options/    ─┼──► lib/
popup/      ─┤
content/    ─┘
```

`lib/` never imports from a surface folder. Surfaces never import from
each other; if two surfaces need the same thing, it belongs in `lib/`.

## `docs/` — developer documentation

| File | Purpose |
|---|---|
| `architecture.md` | This file. Layout + conventions only. |
| `pricecharting-url-reference.md` | URL parameter reference for the search-products endpoint. |

Maintainer-only working notes (status, roadmap, internal TODOs) live in
the git-ignored `local/` folder and are not part of the published repo.

## `.github/` — repository machinery

| Path | Purpose |
|---|---|
| `ISSUE_TEMPLATE/bug_report.md` | Standard bug-report template. |
| `ISSUE_TEMPLATE/feature_request.md` | Feature-request template. |
| `ISSUE_TEMPLATE/commercial-license.md` | Backs the commercial-licensing contact channel listed in `NOTICE`. |
| `workflows/ci.yml` | (Planned) lint + build on PRs. |

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
4. **Does it touch the DOM of arbitrary web pages?** → `src/content/`, and it must be added to `manifest.json` with a justified host pattern.
5. **Is it static (icon, image, json data)?** → `src/assets/`.
6. **New permission needed?** → manifest update **and** an explicit
   justification in the PR description.
