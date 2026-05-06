# PriceCharting search URL — parameter reference

This is the source of truth for which URL parameters the
**PriceCharting search-products** endpoint accepts and what they do.
Used to design the settings page (`src/options/`) and the URL builder
(`src/lib/url-template.js`).

> Scope: the public web search at
> `https://www.pricecharting.com/search-products`.
> Not the official API (`/api-documentation`) — that's a separate effort
> tracked under the v2 roadmap.

## Endpoint

```
https://www.pricecharting.com/search-products?<params>
```

All parameters are query-string. None are required individually, but
`q` is required for a meaningful search. Order of parameters doesn't
matter. Values must be URL-encoded.

## Reference URL (every parameter we use)

```
https://www.pricecharting.com/search-products
  ?type=prices
  &q=mario
  &sort=popularity
  &broad-category=video-games
  &console-uid=G2
  &exclude-variants=true
  &region-name=ntsc
  &show-images=true
  &ignore-preferences=true
```

## Parameters

### `type` — search mode  *(required for our use case)*

| Value | Behavior | Use? |
|---|---|---|
| `prices` | The intended view: shows the searched item with all listed variants, median sell prices, images. **This is what we want.** | ✅ Always |
| *(others)* | Reroute to other views (sold listings, completed auctions, etc.). Not useful for a "show me prices for X" workflow. | ❌ |

**Decision:** hard-code `type=prices`. Don't expose as a setting.

---

### `q` — query string  *(required)*

The selected text, URL-encoded.

**Decision:** comes from the user's selection. Not a setting.

---

### `sort` — result ordering

| Value | Behavior |
|---|---|
| `popularity` | ✅ Default. Ordered by item popularity. |
| `name` | ✅ Alphabetical by item name. |
| `price-highest` | ✅ Price, high → low. |
| `change-dollar` | ✅ Biggest dollar price increase. |
| *(others)* | Likely exist (`price-lowest`, `change-percent`, `release-date`, …). Add as confirmed. |

**Decision:** dropdown with the confirmed values plus free-text fallback.
Default: `popularity`.

---

### `broad-category` — top-level category filter

> Important: PriceCharting groups all card games under a single
> `trading-cards` slug. There is **no** per-game slug like
> `pokemon-cards` in the search-products URL — those exist as page
> paths (`/category/pokemon-cards`) but the search endpoint uses the
> rollup. Per-game scoping needs a different mechanism (probably the
> set-level `console-uid`).

| Value | Confirmed | Behavior |
|---|---|---|
| `video-games` | ✅ | Restricts to video-game items. |
| `trading-cards` | ✅ | All TCGs (Pokémon, MTG, Yu-Gi-Oh, One Piece, Lorcana, …). |
| `comic-books` | ✅ | Comics. |
| `funko-pops` | ✅ | Funko Pop figures. |
| `coins` | ✅ | Collectible coins. |
| `lego-sets` | ✅ | LEGO (likely full sets). |

**Decision:** expose as a dropdown. Default: empty (search all
categories — current behavior).

---

### `console-uid` — platform / set filter

A short alphanumeric ID. **The same parameter is reused across every
category**: for `video-games` it identifies a console; for
`trading-cards` it identifies a card set; for `funko-pops` it identifies
a series; etc. Each category has its own enumeration.

#### Video games — fully enumerated

The full list of ~200 video-game console IDs is published in the
official **API documentation** under
[Reference Tables → Console ID Table](https://www.pricecharting.com/api-documentation).
Although those IDs are documented for the Marketplace API's `console=`
parameter, they are the same identifiers the search-products URL
accepts as `console-uid=` (verified: `G2` = GameBoy Color works on both
surfaces).

A snapshot lives in `src/lib/consoles.js` and powers the dropdown in
the options page. Refresh from the API docs when releasing a new
extension version.

The list is region-segmented: each region tracks its own SKUs. A few
examples:

| Console | Americas | PAL | Japan |
|---|---|---|---|
| Playstation 2 | `G7` | `G63` | `G108` |
| Nintendo Switch | `G59` | `G87` | `G100` |
| GameBoy Color | `G2` | `G77` | `G113` |
| Sega Mega Drive / Genesis | `G15` (Genesis) | `G71` | `G105` |

The `region-name` filter and `console-uid` filter overlap — picking a
JP-prefixed console already implies Japan, so combining the two is
redundant. The options page surfaces both independently and lets the
user choose; if both are set the more specific one (the console) wins
in practice.

#### Other categories — not yet enumerated

For trading-cards, funko-pops, comics, coins, lego-sets the
console-uid takes set-specific or series-specific IDs that are **not**
published in the API docs. They can be collected by inspecting the
`<select>` element on each category's search page (the `<option value="…">`
attributes are the uids). Tedious but works; left as a future task.

**Decision:** dropdown populated from `src/lib/consoles.js` (video-game
IDs), grouped by region (Americas / PAL / Japan / Asian English /
Magazines & misc). Default: empty (no filter).

---

### `exclude-variants` — collapse rare variants

| Value | Behavior |
|---|---|
| `true` | Hide variant editions (e.g. limited prints, regional reprints). Cleaner default for "what's this game worth" searches. |
| `false` *(default)* | Show every variant. |

**Decision:** expose as a checkbox. Default: `false` (matches site default; user opts in to cleaner results).

---

### `region-name` — regional release filter

| Value | Confirmed | Behavior |
|---|---|---|
| `ntsc` | ✅ | NTSC / Americas. |
| `pal` | ✅ | PAL / Europe. |
| `japan` | ✅ | Japan-specific. (Note: slug is `japan`, not `jp`.) |

**Decision:** expose as a dropdown. Default: empty (no region filter).

---

### `show-images` — toggle thumbnails

| Value | Behavior |
|---|---|
| `true` | Show product images in the result list. |
| `false` *(default)* | Text-only result list, faster page load. |

**Decision:** expose as a checkbox. Default: `true` (better UX for "did
I find the right item?" workflow).

---

### `ignore-preferences` — bypass account/cookie defaults

| Value | Behavior |
|---|---|
| `true` | The search-products endpoint ignores any saved preferences (region, currency, sort, etc. cookied by the user's PriceCharting account or browser) and uses *only* the query parameters in this URL. |
| `false` *(default)* | Whatever the user's PriceCharting cookies say, those win where this URL is silent. |

**Decision:** **always send `true`**. Without it, the same extension on
two machines could yield wildly different results because of stale
cookies, which is hostile to "I just want to look up this item" UX.

---

### Region & currency *(deferred to v1.2+)*

Region / currency / language are controlled by **cookies**, not URL
parameters. Exposing them as settings would require the `cookies`
permission, which is a privacy cost we don't want to pay yet.

`region-name=` is *not* the same as the user's account region — it's a
filter on what regional release of an item to show.

**Decision:** out of scope for v1.1.

---

## Settings-page mapping

What we'll actually expose to the user, on top of the always-sent
defaults (`type=prices`, `ignore-preferences=true`, `show-images=true`):

| Setting label | Param | Default | UI |
|---|---|---|---|
| Search category | `broad-category` | (none → search all) | Dropdown |
| Console / platform | `console-uid` | (none) | Dropdown, only when category = video-games |
| Region | `region-name` | (none) | Dropdown |
| Sort by | `sort` | `popularity` | Dropdown |
| Hide variant editions | `exclude-variants` | `false` | Checkbox |
| Show thumbnails | `show-images` | `true` | Checkbox |

Plus the non-PriceCharting settings:

| Setting | Default | UI |
|---|---|---|
| Open behavior | "new tab next to current" | Dropdown (next / end / new window / current) |
| Focus new tab | `true` | Checkbox |
| Max selection length | 200 | Number |
| Custom URL template (advanced) | (empty) | Text field with `{q}` placeholder; if set, overrides everything above |

---

## Open enumeration TODOs

What's still missing:

- [ ] Remaining `sort` values (`price-lowest`? `change-percent`? `release-date`?).
- [ ] `console-uid` mapping for non-video-game categories (trading-cards
  sets, funko-pops series, …). Not in API docs; collect from each
  category's search-page `<select>`. Video games are done.
- [ ] Any additional `broad-category` slugs (e.g. for sportscardspro.com
  cross-site categories?).

The options page uses fixed `<select>` dropdowns for all filter fields,
so only confirmed values are offered. Missing enumerations don't block
users — they just mean the dropdown is shorter than it could be.
