// Settings persistence wrapper.
//
// - Reads/writes via `storage.sync` so settings follow the user across
//   browsers signed into the same profile. Falls back to `storage.local`
//   if `sync` isn't available (e.g. Firefox without Sync configured).
// - Always merges stored values on top of DEFAULTS so missing keys get
//   sane fallbacks (forward-compatible with new settings added in
//   future versions without explicit migration).
// - Runs schema migrations on `onInstalled` (`reason === "update"` or
//   first install) when the stored schemaVersion is lower than the
//   code's SCHEMA_VERSION.

import { api } from "./api.js";
import { DEFAULTS, SCHEMA_VERSION } from "./defaults.js";

/**
 * Pick the available storage area.
 * @param {object} [_api] override for testing
 */
function pickArea(_api) {
  const a = _api || api;
  if (a?.storage?.sync) return a.storage.sync;
  if (a?.storage?.local) return a.storage.local;
  return null;
}

/**
 * Read effective settings (DEFAULTS overlaid with anything stored).
 * Never throws, on storage error returns DEFAULTS.
 *
 * @param {object} [_api] override for testing
 * @returns {Promise<object>}
 */
export async function readSettings(_api) {
  const area = pickArea(_api);
  if (!area) return { ...DEFAULTS };
  try {
    // only read keys we know about, ignore stray data in the area
    const stored = await area.get(Object.keys(DEFAULTS));
    return { ...DEFAULTS, ...(stored || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Write a partial settings patch. Unspecified keys are left as-is.
 * Always stamps the current SCHEMA_VERSION.
 *
 * @param {object} patch
 * @param {object} [_api] override for testing
 * @returns {Promise<void>}
 */
export async function writeSettings(patch, _api) {
  const area = pickArea(_api);
  if (!area) return;
  const clean = {};
  for (const k of Object.keys(patch)) {
    if (Object.hasOwn(DEFAULTS, k)) clean[k] = patch[k];
  }
  clean.schemaVersion = SCHEMA_VERSION;
  await area.set(clean);
}

/**
 * Reset all settings to DEFAULTS.
 * @param {object} [_api] override for testing
 * @returns {Promise<void>}
 */
export async function resetSettings(_api) {
  const area = pickArea(_api);
  if (!area) return;
  await area.clear();
  await area.set({ ...DEFAULTS });
}

/**
 * Migrate stored settings to the current SCHEMA_VERSION.
 *
 * Called from `runtime.onInstalled` (both first-install and update).
 * Strategy: read what's there, run any version-specific transforms in
 * order, write back the merged + migrated result.
 *
 * Adding a future migration:
 *   1. Bump SCHEMA_VERSION in defaults.js.
 *   2. Add a `case` below for the OLD version that transforms the
 *      `s` object in place.
 *   3. Each case falls through (no `break`) so cumulative upgrades
 *      apply in order.
 *
 * @param {object} [_api] override for testing
 * @returns {Promise<void>}
 */
export async function migrateSettings(_api) {
  const area = pickArea(_api);
  if (!area) return;

  let stored;
  try {
    stored = (await area.get(null)) || {};
  } catch {
    stored = {};
  }

  const fromVersion = Number.isInteger(stored.schemaVersion)
    ? stored.schemaVersion
    : 0;

  // Start from defaults so any newly-added keys are present.
  const s = { ...DEFAULTS, ...stored };

  /* eslint-disable no-fallthrough */
  switch (fromVersion) {
    case 0:
      // First install (or pre-versioned data). Nothing to transform;
      // the merge above already filled defaults.
    case 1:
      // Current version. No-op.
      break;
    // case 2: ... future migration here, no break.
    default:
      // Stored data is from a NEWER version than this code knows about
      // (e.g. user downgraded the extension). Leave it alone, the
      // overlay-on-defaults read in readSettings() is forward-safe.
      return;
  }
  /* eslint-enable no-fallthrough */

  s.schemaVersion = SCHEMA_VERSION;
  await area.set(s);
}

/**
 * Subscribe to settings changes from any source (options page, sync
 * from another device, etc.). Returns an unsubscribe function.
 *
 * @param {(newSettings: object) => void} callback
 * @param {object} [_api] override for testing
 * @returns {() => void}
 */
export function onSettingsChanged(callback, _api) {
  const a = _api || api;
  if (!a?.storage?.onChanged) return () => {};
  // ignore changes from the other area so we don't double-fire
  const expectedArea = a.storage.sync ? "sync" : "local";
  const handler = async (_changes, areaName) => {
    if (areaName !== expectedArea) return;
    callback(await readSettings(_api));
  };
  a.storage.onChanged.addListener(handler);
  return () => a.storage.onChanged.removeListener(handler);
}
