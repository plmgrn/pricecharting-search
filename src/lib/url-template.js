// Build the final search URL from a settings object + a raw selection.
//
// Pure module: no DOM, no listeners, no `api` import. Trivially unit-
// testable in isolation.

import { ALWAYS_SEND_PARAMS, SEARCH_BASE_URL, DEFAULTS,
  MAX_SELECTION_CAP, MAX_TEMPLATE_LENGTH, } from "./defaults.js";
import { sanitizeSettings } from "./settings-schema.js";

const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** encodeURIComponent throws on unpaired surrogates; replace them with U+FFFD. */
function toWellFormed(s) {
  return typeof s.toWellFormed === "function"
    ? s.toWellFormed()
    : s.replace(LONE_SURROGATE, "\uFFFD");
}

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
  if (settings.trimSelection) s = s.trim().replace(/\s+/g, " ");

  const n = Math.trunc(Number(settings.maxSelectionLength));
  const max = Number.isFinite(n) && n >= 1
    ? Math.min(n, MAX_SELECTION_CAP)
    : DEFAULTS.maxSelectionLength;

  if (s.length > max) {
    s = s.slice(0, max);
    const last = s.charCodeAt(s.length - 1);
    if (last >= 0xd800 && last <= 0xdbff) s = s.slice(0, -1); // half a pair
  }
  return toWellFormed(s);
}


/**
 * A custom template is usable when it is http(s), contains {q}, the
 * authority (host) is fixed, and {q} only appears after it.
 * Exported so the options page can show an inline error.
 */
export function isValidUrlTemplate(tmpl) {
  if (typeof tmpl !== "string" || tmpl.length > MAX_TEMPLATE_LENGTH) return false;
  const t = tmpl.trim();
  if (!t.includes("{q}")) return false;
  const m = /^https?:\/\/([^/?#]*)/i.exec(t);
  if (!m || !m[1] || m[1].includes("{q}")) return false;
  try {
    new URL(t.replaceAll("{q}", "x"));
    return true;
  } catch {
    return false;
  }
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

  const q = toWellFormed(String(selection));

  settings = sanitizeSettings(settings);// validates everything the parser or popup merged in

  // Custom template wins.
  const tmpl = settings.customUrlTemplate.trim();
  if (tmpl) {
    if (!isValidUrlTemplate(tmpl)) return null; // misconfigured: never search the wrong URL
    const encoded = encodeURIComponent(q);
    return tmpl.replaceAll("{q}", () => encoded); // function replacer: no "$&" surprises
  }

  const url = new URL(SEARCH_BASE_URL);

  // insert locale prefix (e.g. /de/, /fr/) before /search-products
  if (settings.language) { // settings.language is pre-validated
    url.pathname = "/" + settings.language + url.pathname;
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
