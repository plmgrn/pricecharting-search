// Default settings for the extension.
//
// Single source of truth: imported by `lib/settings.js` (to fill in
// missing keys on first install / update) and by `options/options.js`
// (to render the form with sensible defaults and to power "Reset to
// defaults").
//
// Keep this file pure: no imports from other project files, no side
// effects, no DOM access. Just data.
//
// Schema versioning: bump SCHEMA_VERSION whenever the shape of
// DEFAULTS changes in a non-additive way (renamed key, removed key,
// changed value type). `lib/settings.js` uses it to run migrations.

export const SCHEMA_VERSION = 1;

/**
 * URL parameters always sent on every search, regardless of user
 * settings. Documented in `docs/pricecharting-url-reference.md`.
 *
 * - type=prices            → the "show this item with all variants
 *                            and prices" view we want.
 * - ignore-preferences=true → ignore any cookied account preferences
 *                            so the same query yields the same results
 *                            on every machine.
 */
export const ALWAYS_SEND_PARAMS = Object.freeze({
  "type": "prices",
  "ignore-preferences": "true",
});

/**
 * The URL builder uses this to produce the final search URL.
 * `{q}` is the substitution token for the (encoded) selection.
 */
export const SEARCH_BASE_URL = "https://www.pricecharting.com/search-products";

export const DEFAULTS = Object.freeze({
  // Schema version stamped into stored settings; do not edit by hand.
  schemaVersion: SCHEMA_VERSION,

  // ── PriceCharting search filters ──────────────────────────────────
  // Empty string means "don't send this parameter at all" (i.e. no
  // filter). See docs/pricecharting-url-reference.md for valid values.
  broadCategory: "",        // e.g. "video-games", "trading-cards"
  consoleGroup: "",         // UI-only — filters the console dropdown by region (maps to CONSOLE_GROUPS). Never sent as a URL param.
  consoleUid: "",           // e.g. "G2" (only meaningful when broadCategory=video-games)
  regionName: "",           // "ntsc" | "pal" | "japan" | ""
  sort: "popularity",       // "popularity" is PriceCharting's own default
  language: "",              // locale path prefix: "de", "es", "fr", "nl", "pt", "ru", or "" (English)
  excludeVariants: false,   // hide variant editions when true
  showImages: true,         // thumbnails in result list

  // ── Extension UX ──────────────────────────────────────────────────
  /**
   * Where the result tab opens.
   *  - "next"    : new tab immediately after the current one (current behavior)
   *  - "end"     : new tab at the end of the tab strip
   *  - "window"  : new window
   *  - "current" : replace the current tab
   */
  openBehavior: "next",

  // Focus the new tab/window after creating it.
  focusNew: true,

  // Trim and collapse whitespace in the selection before searching.
  // (Doesn't affect URL encoding; just normalizes the user's selection.)
  trimSelection: true,

  // Hard cap on selection length to avoid pathological URLs from huge
  // selections (e.g. accidentally selecting a whole article).
  maxSelectionLength: 200,

  // Context-menu item title. `%s` is replaced by the browser with the
  // (browser-truncated) selection text. Guarded against empty in options.js.
  menuTitle: 'Search PriceCharting for "%s"',

  // ── Advanced escape hatch ─────────────────────────────────────────
  /**
   * If set to a non-empty string, this URL template is used verbatim
   * (with `{q}` replaced by the encoded selection) and ALL the
   * settings above (filters, ALWAYS_SEND_PARAMS, etc.) are ignored.
   *
   * For power users who want to point at a different endpoint, a
   * different site, or hand-craft a parameter set we don't expose.
   *
   * Must contain `{q}` somewhere or the URL builder will reject it.
   */
  customUrlTemplate: "",
});
