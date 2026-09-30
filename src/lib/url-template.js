// Build the final search URL from a settings object + a raw selection.
//
// Pure module: no DOM, no listeners, no `api` import. Trivially unit-
// testable in isolation.

import { ALWAYS_SEND_PARAMS, SEARCH_BASE_URL } from "./defaults.js";

/**
 * Normalize the user's selection: optionally trim & collapse
 * whitespace, then truncate to maxSelectionLength characters.
 *
 * @param {string} raw       raw selection text from `info.selectionText`
 * @param {object} settings  effective settings (defaults merged with stored)
 * @returns {string}         cleaned text, possibly empty
 */
export function normalizeSelection(raw, settings) {
  let s = raw == null ? "" : String(raw);
  if (settings.trimSelection) {
    // Trim and collapse all runs of whitespace into single spaces.
    s = s.trim().replace(/\s+/g, " ");
  }
  // hard ceiling of 2000 even if someone edits storage directly
  const max = Math.min(2000, Math.max(0, Math.trunc(settings.maxSelectionLength) || 200));
  if (max > 0 && s.length > max) s = s.slice(0, max);
  return s;
}

/**
 * Map of settings => URL parameter name. Listed here (not in defaults.js)
 * because it's a builder concern, not a default-value concern. A setting
 * with an empty string / null / undefined value is omitted entirely.
 */
const PARAM_FROM_SETTING = Object.freeze({
  broadCategory: "broad-category",
  consoleUid: "console-uid",
  regionName: "region-name",
  sort: "sort",
});

/**
 * Which filters PriceCharting applies per broad category. console-uid
 * values (consoles.js) are video game consoles and region-name is a video
 * game region, so on other categories they don't narrow the search, they
 * empty it (PriceCharting answers with category=no-results). "" means
 * "all categories". Edit this table if a category turns out to support more.
 */
const CATEGORY_FILTERS = Object.freeze({
  "":            { consoleUid: true, regionName: true },
  "video-games": { consoleUid: true, regionName: true },
});
const NO_GAME_FILTERS = Object.freeze({ consoleUid: false, regionName: false });

/**
 * Settings whose presence in the URL is controlled by a boolean.
 * The string value sent is "true" / "false".
 */
const BOOLEAN_PARAMS = Object.freeze({
  excludeVariants: "exclude-variants",
  showImages: "show-images",
});

/**
 * Build the full search URL.
 *
 * If `settings.customUrlTemplate` is non-empty and contains `{q}`, it
 * wins outright and every other setting is ignored.
 *
 * Otherwise: SEARCH_BASE_URL + ALWAYS_SEND_PARAMS + per-setting params
 * + q=<encoded selection>.
 *
 * @param {string} selection  Already-normalized selection text.
 * @param {object} settings   Effective settings.
 * @returns {string|null}     Final URL, or null if nothing useful to search.
 */
export function buildSearchUrl(selection, settings) {
  if (!selection) return null;

  // Custom template wins.
  const tmpl = (settings.customUrlTemplate || "").trim();
  if (tmpl) {
    if (!tmpl.includes("{q}")) {
      // Misconfigured template, do not silently search the wrong URL.
      return null;
    }
    const resolved = tmpl.replace(/\{q\}/g, encodeURIComponent(selection));
    // only allow http(s), block javascript:, data:, etc.
    if (!/^https?:\/\//i.test(resolved)) return null;
    return resolved;
  }

  const url = new URL(SEARCH_BASE_URL);

  // insert locale prefix (e.g. /de/, /fr/) before /search-products
  const lang = (settings.language || "").trim();
  if (lang) {
    url.pathname = "/" + lang + url.pathname;
  }

  // Always-sent params first so explicit settings can theoretically
  // override them (none currently do, but the order is intentional).
  for (const [k, v] of Object.entries(ALWAYS_SEND_PARAMS)) {
    url.searchParams.set(k, v);
  }

  // Per-setting string params: only set when non-empty.
  const applies = CATEGORY_FILTERS[settings.broadCategory ?? ""] ?? NO_GAME_FILTERS;
  for (const [settingKey, paramName] of Object.entries(PARAM_FROM_SETTING)) {
    if (settingKey in applies && !applies[settingKey]) continue;
    const v = settings[settingKey];
    if (v != null && String(v) !== "") {
      url.searchParams.set(paramName, String(v));
    }
  }

  // Boolean params: send "true" / "false" explicitly. Sending the
  // string makes intent unambiguous and matches what PriceCharting's
  // own UI emits.
  for (const [settingKey, paramName] of Object.entries(BOOLEAN_PARAMS)) {
    if (typeof settings[settingKey] === "boolean") {
      url.searchParams.set(paramName, settings[settingKey] ? "true" : "false");
    }
  }

  // The query itself.
  url.searchParams.set("q", selection);

  return url.toString();
}
