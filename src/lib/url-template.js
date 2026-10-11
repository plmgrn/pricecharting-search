// Build the final search URL from a settings object + a raw selection.
//
// Pure module: no DOM, no listeners, no `api` import. Trivially unit-
// testable in isolation.

import {
  ALWAYS_SEND_PARAMS, SEARCH_BASE_URL, DEFAULTS,
  MAX_SELECTION_CAP, MAX_TEMPLATE_LENGTH,
} from "./defaults.js";
import { sanitizeSettings } from "./settings-schema.js";

// -- URL parameter tables --------------------------------------------------

/** Setting => URL parameter name. Empty-string values are omitted. */
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

/** Settings sent as "true" / "false", matching what PriceCharting's UI emits. */
const BOOLEAN_PARAMS = Object.freeze({
  excludeVariants: "exclude-variants",
  showImages: "show-images",
});

// -- Text helpers ------------------------------------------------------------

const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** encodeURIComponent throws on unpaired surrogates; replace them with U+FFFD. */
function toWellFormed(s) {
  return typeof s.toWellFormed === "function"
    ? s.toWellFormed()
    : s.replace(LONE_SURROGATE, "\uFFFD");
}

const isHighSurrogate = (c) => c >= 0xd800 && c <= 0xdbff;

function resolveMaxLength(value) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n >= 1
    ? Math.min(n, MAX_SELECTION_CAP)
    : DEFAULTS.maxSelectionLength;
}

/** Cut to `max` UTF-16 units without leaving half of a surrogate pair. */
function truncateSafely(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return isHighSurrogate(cut.charCodeAt(cut.length - 1)) ? cut.slice(0, -1) : cut;
}

/**
 * Normalize the user's selection: optionally trim & collapse whitespace,
 * truncate (never inside a surrogate pair), and make it well-formed.
 *
 * @param {string} raw       raw selection text from `info.selectionText`
 * @param {object} settings  effective settings
 * @returns {string}         cleaned text, possibly empty
 */
export function normalizeSelection(raw, settings) {
  let s = raw == null ? "" : String(raw);
  if (settings.trimSelection) s = s.trim().replace(/\s+/g, " ");
  return toWellFormed(truncateSafely(s, resolveMaxLength(settings.maxSelectionLength)));
}

// -- Custom template validation -----------------------------------------------

/** Fixed part between "http(s)://" and the first / ? # ; null when not http(s). */
const authorityOf = (t) => /^https?:\/\/([^/?#]*)/i.exec(t)?.[1] ?? null;

function parsesAsUrl(s) {
  try { new URL(s); return true; } catch { return false; }
}

// Order matters: later checks assume the earlier ones passed.
const TEMPLATE_CHECKS = Object.freeze([
  ["too-long",            (t) => t.length > MAX_TEMPLATE_LENGTH],
  ["missing-placeholder", (t) => !t.includes("{q}")],
  ["not-http",            (t) => authorityOf(t) === null],
  ["missing-host",        (t) => authorityOf(t) === ""],
  ["placeholder-in-host", (t) => authorityOf(t).includes("{q}")],
  ["unparseable",         (t) => !parsesAsUrl(t.replaceAll("{q}", "x"))],
]);

/** Why a custom template is unusable, or null when it is fine. */
export function templateProblem(tmpl) {
  if (typeof tmpl !== "string") return "not-a-string";
  const t = tmpl.trim();
  return TEMPLATE_CHECKS.find(([, fails]) => fails(t))?.[0] ?? null;
}

/** Exported so the options page can show an inline error. */
export const isValidUrlTemplate = (tmpl) => templateProblem(tmpl) === null;

// -- URL builders ---------------------------------------------------------------

const isActive = (key, applies) => !(key in applies) || applies[key];

function setFilterParams(url, s) {
  const applies = CATEGORY_FILTERS[s.broadCategory] ?? NO_GAME_FILTERS;
  for (const [key, param] of Object.entries(PARAM_FROM_SETTING)) {
    if (isActive(key, applies) && s[key] !== "") url.searchParams.set(param, s[key]);
  }
}

function setBooleanParams(url, s) {
  for (const [key, param] of Object.entries(BOOLEAN_PARAMS)) {
    url.searchParams.set(param, s[key] ? "true" : "false");
  }
}

function buildFromTemplate(tmpl, q) {
  if (!isValidUrlTemplate(tmpl)) return null; // misconfigured: never search the wrong URL
  const encoded = encodeURIComponent(q);
  return tmpl.replaceAll("{q}", () => encoded); // function replacer: no "$&" surprises
}

function buildStandardUrl(q, s) {
  const url = new URL(SEARCH_BASE_URL);
  if (s.language) url.pathname = `/${s.language}${url.pathname}`; // allowlisted locale
  for (const [k, v] of Object.entries(ALWAYS_SEND_PARAMS)) url.searchParams.set(k, v);
  setFilterParams(url, s);
  setBooleanParams(url, s);
  url.searchParams.set("q", q);
  return url.toString();
}

/**
 * Build the full search URL.
 *
 * A non-empty `customUrlTemplate` wins outright and every other setting
 * is ignored; an invalid template yields null. Otherwise:
 * SEARCH_BASE_URL + ALWAYS_SEND_PARAMS + per-setting params + q.
 *
 * @param {string} selection  Already-normalized selection text.
 * @param {object} settings   Stored settings plus any inline overrides.
 * @returns {string|null}     Final URL, or null if nothing safe to open.
 */
export function buildSearchUrl(selection, settings) {
  if (!selection) return null;
  const q = toWellFormed(String(selection));
  const s = sanitizeSettings(settings); // validates stored values and parser overrides
  const tmpl = s.customUrlTemplate.trim();
  return tmpl ? buildFromTemplate(tmpl, q) : buildStandardUrl(q, s);
}