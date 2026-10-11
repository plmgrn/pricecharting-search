// Schema for stored settings: one validator per DEFAULTS key.
// Pure module: no DOM, no storage access.

import {
  DEFAULTS, MAX_SELECTION_CAP, MAX_TEMPLATE_LENGTH, MAX_MENU_TITLE_LENGTH,
  OPEN_BEHAVIORS, REGIONS, LANGUAGES, SORTS, BROAD_CATEGORIES,
} from "./defaults.js";

//Import data carved in stone from consoles to validate consoleUid and consoleGroup values
//This is a hardcoded allowlist, not a format check
import { CONSOLES } from "./consoles.js";
const CONSOLE_UIDS = CONSOLES.map((c) => c.id);
const CONSOLE_GROUP_IDS = [...new Set(CONSOLES.map((c) => c.group))];

const isString = (v) => typeof v === "string";

/** One of `values`; "" also accepted when allowEmpty ("no filter"). */
const oneOf = (values, { allowEmpty = false } = {}) => {
  const set = new Set(values);
  return (v) => isString(v) && ((allowEmpty && v === "") || set.has(v));
};
const integer = (min, max) => (v) => Number.isInteger(v) && v >= min && v <= max;
const boolean = (v) => typeof v === "boolean";

export const RULES = Object.freeze({
  schemaVersion: integer(0, 1_000_000),

  broadCategory: oneOf(BROAD_CATEGORIES, { allowEmpty: true }),
  consoleGroup: oneOf(CONSOLE_GROUP_IDS, { allowEmpty: true }),
  // Well-formed but unknown uids (e.g. "G99999") must be rejected, so
  // this is an allowlist check, not a format check.
  consoleUid: oneOf(CONSOLE_UIDS, { allowEmpty: true }),
  regionName: oneOf(REGIONS, { allowEmpty: true }),
  sort: oneOf(SORTS),
  language: oneOf(LANGUAGES, { allowEmpty: true }),
  excludeVariants: boolean,
  showImages: boolean,

  openBehavior: oneOf(OPEN_BEHAVIORS),
  focusNew: boolean,
  trimSelection: boolean,
  maxSelectionLength: integer(1, MAX_SELECTION_CAP),
  menuTitle: (v) =>
    isString(v) && v.trim() !== "" && v.length <= MAX_MENU_TITLE_LENGTH,
  shortcutEnabled: boolean,
  popupAutofocus: boolean,
  setupComplete: boolean,

  // Type + length only. Semantic checks (host, {q} placement) belong in
  // buildSearchUrl, so a bad template yields "misconfigured" (null)
  // instead of silently resetting to "".
  customUrlTemplate: (v) => isString(v) && v.length <= MAX_TEMPLATE_LENGTH,
});

const KEYS = Object.freeze(Object.keys(DEFAULTS));

/** Lenient, for reads: invalid or missing keys fall back to defaults. */
export function sanitizeSettings(stored) {
  const out = { ...DEFAULTS };
  if (stored === null || typeof stored !== "object" || Array.isArray(stored)) {
    return out;
  }
  for (const key of KEYS) {
    if (Object.hasOwn(stored, key) && RULES[key](stored[key])) {
      out[key] = stored[key];
    }
  }
  return out;
}

/**
 * Strict, for writes. Unknown keys and schemaVersion are ignored (the
 * writer stamps the version itself). Invalid values are reported, not
 * dropped, so the options page can show which field is wrong.
 *
 * @returns {{ ok: boolean, value: object, errors: Record<string,string> }}
 */
export function validatePatch(patch) {
  const value = {};
  const errors = {};
  if (patch === null || typeof patch !== "object") {
    return { ok: false, value, errors: { _patch: "must be an object" } };
  }
  for (const key of Object.keys(patch)) {
    if (key === "schemaVersion" || !Object.hasOwn(RULES, key)) continue;
    if (RULES[key](patch[key])) value[key] = patch[key];
    else errors[key] = "invalid value";
  }
  return { ok: Object.keys(errors).length === 0, value, errors };
}