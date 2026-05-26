// Settings persistence tests.
//
// Tests the REAL settings.js module via its _api dependency injection
// parameter. No re-implementations -- every assertion exercises the
// actual exported functions.

import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  readSettings, writeSettings, resetSettings,
  migrateSettings, onSettingsChanged,
} from "../src/lib/settings.js";
import { DEFAULTS, SCHEMA_VERSION } from "../src/lib/defaults.js";

// -- Storage mock --

function createMockArea() {
  let data = {};
  return {
    _data: () => ({ ...data }),
    get: mock.fn(async (keys) => {
      if (keys === null) return { ...data };
      const result = {};
      const keyList = Array.isArray(keys) ? keys : Object.keys(keys ?? {});
      for (const k of keyList) {
        if (Object.hasOwn(data, k)) result[k] = data[k];
      }
      return result;
    }),
    set: mock.fn(async (patch) => { Object.assign(data, patch); }),
    clear: mock.fn(async () => { data = {}; }),
  };
}

function createMockOnChanged() {
  const listeners = [];
  return {
    addListener: mock.fn((fn) => listeners.push(fn)),
    removeListener: mock.fn((fn) => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    }),
    _fire: (changes, areaName) => {
      for (const fn of listeners) fn(changes, areaName);
    },
    _listeners: listeners,
  };
}

function makeApi(opts = {}) {
  const sync = opts.noSync ? undefined : (opts.sync ?? createMockArea());
  const local = opts.local ?? createMockArea();
  const onChanged = opts.onChanged ?? createMockOnChanged();
  return {
    storage: { sync, local, onChanged },
    _sync: sync,
    _local: local,
    _onChanged: onChanged,
  };
}

// -- readSettings --

describe("readSettings (real module)", () => {
  it("returns DEFAULTS when storage is empty", async () => {
    const api = makeApi();
    const s = await readSettings(api);
    assert.deepStrictEqual(s, { ...DEFAULTS });
  });

  it("overlays stored values on top of DEFAULTS", async () => {
    const sync = createMockArea();
    await sync.set({ sort: "name", broadCategory: "coins" });
    const api = makeApi({ sync });
    const s = await readSettings(api);
    assert.equal(s.sort, "name");
    assert.equal(s.broadCategory, "coins");
    assert.equal(s.openBehavior, DEFAULTS.openBehavior);
  });

  it("ignores stray keys not in DEFAULTS", async () => {
    const sync = createMockArea();
    await sync.set({ unknownKey: "nope" });
    const api = makeApi({ sync });
    const s = await readSettings(api);
    assert.equal(s.unknownKey, undefined);
  });

  it("falls back to local when sync is unavailable", async () => {
    const local = createMockArea();
    await local.set({ sort: "name" });
    const api = makeApi({ noSync: true, local });
    const s = await readSettings(api);
    assert.equal(s.sort, "name");
  });

  it("returns DEFAULTS when storage throws", async () => {
    const sync = createMockArea();
    sync.get = mock.fn(async () => { throw new Error("quota exceeded"); });
    const api = makeApi({ sync });
    const s = await readSettings(api);
    assert.deepStrictEqual(s, { ...DEFAULTS });
  });

  it("returns DEFAULTS when no storage at all", async () => {
    const api = { storage: null };
    const s = await readSettings(api);
    assert.deepStrictEqual(s, { ...DEFAULTS });
  });

  it("returns DEFAULTS when storage areas are both missing", async () => {
    const s = await readSettings({ storage: {} });
    assert.deepStrictEqual(s, { ...DEFAULTS });
  });

  it("handles area.get returning null", async () => {
    const sync = createMockArea();
    sync.get = mock.fn(async () => null);
    const api = makeApi({ sync });
    const s = await readSettings(api);
    assert.deepStrictEqual(s, { ...DEFAULTS });
  });
});

// -- writeSettings --

describe("writeSettings (real module)", () => {
  it("writes a partial patch and stamps schemaVersion", async () => {
    const sync = createMockArea();
    const api = makeApi({ sync });
    await writeSettings({ sort: "name" }, api);
    const data = sync._data();
    assert.equal(data.sort, "name");
    assert.equal(data.schemaVersion, SCHEMA_VERSION);
  });

  it("does not clobber unrelated stored keys", async () => {
    const sync = createMockArea();
    await sync.set({ broadCategory: "coins" });
    const api = makeApi({ sync });
    await writeSettings({ sort: "name" }, api);
    const data = sync._data();
    assert.equal(data.broadCategory, "coins");
    assert.equal(data.sort, "name");
  });

  it("filters out keys not in DEFAULTS", async () => {
    const sync = createMockArea();
    const api = makeApi({ sync });
    await writeSettings({ sort: "name", banana: "yes" }, api);
    const data = sync._data();
    assert.equal(data.sort, "name");
    assert.equal(data.banana, undefined);
  });

  it("empty patch only writes schemaVersion", async () => {
    const sync = createMockArea();
    const api = makeApi({ sync });
    await writeSettings({}, api);
    const data = sync._data();
    assert.equal(data.schemaVersion, SCHEMA_VERSION);
    assert.equal(Object.keys(data).length, 1);
  });

  it("forced schemaVersion in patch is overridden by current", async () => {
    const sync = createMockArea();
    const api = makeApi({ sync });
    await writeSettings({ schemaVersion: 999 }, api);
    const data = sync._data();
    assert.equal(data.schemaVersion, SCHEMA_VERSION);
  });

  it("no-ops when no storage area", async () => {
    await writeSettings({ sort: "name" }, { storage: {} });
  });
});

// -- resetSettings --

describe("resetSettings (real module)", () => {
  it("clears storage and writes DEFAULTS", async () => {
    const sync = createMockArea();
    await sync.set({ sort: "name", broadCategory: "coins" });
    const api = makeApi({ sync });
    await resetSettings(api);
    const s = await readSettings(api);
    assert.deepStrictEqual(s, { ...DEFAULTS });
    assert.equal(sync.clear.mock.calls.length, 1);
  });

  it("no-ops when no storage area", async () => {
    await resetSettings({ storage: {} });
  });
});

// -- migrateSettings --

describe("migrateSettings (real module)", () => {
  it("fills DEFAULTS on first install (schemaVersion 0)", async () => {
    const sync = createMockArea();
    const api = makeApi({ sync });
    await migrateSettings(api);
    const data = sync._data();
    assert.equal(data.schemaVersion, SCHEMA_VERSION);
    assert.equal(data.sort, DEFAULTS.sort);
  });

  it("preserves existing user values during migration", async () => {
    const sync = createMockArea();
    await sync.set({ sort: "name", broadCategory: "coins" });
    const api = makeApi({ sync });
    await migrateSettings(api);
    const data = sync._data();
    assert.equal(data.sort, "name");
    assert.equal(data.broadCategory, "coins");
    assert.equal(data.schemaVersion, SCHEMA_VERSION);
  });

  it("skips migration when stored version is newer (downgrade)", async () => {
    const sync = createMockArea();
    await sync.set({ schemaVersion: 999, sort: "name" });
    const api = makeApi({ sync });
    await migrateSettings(api);
    const data = sync._data();
    assert.equal(data.schemaVersion, 999);
  });

  it("handles storage error gracefully", async () => {
    const sync = createMockArea();
    sync.get = mock.fn(async () => { throw new Error("read error"); });
    const api = makeApi({ sync });
    await migrateSettings(api);
    // stored = {} after catch, fromVersion = 0, so it writes defaults
    const calls = sync.set.mock.calls;
    assert.ok(calls.length > 0);
  });

  it("no-ops when no storage area", async () => {
    await migrateSettings({ storage: {} });
  });

  it("non-integer schemaVersion treated as 0", async () => {
    const sync = createMockArea();
    await sync.set({ schemaVersion: "garbage" });
    const api = makeApi({ sync });
    await migrateSettings(api);
    const data = sync._data();
    assert.equal(data.schemaVersion, SCHEMA_VERSION);
  });

  it("float schemaVersion treated as 0", async () => {
    const sync = createMockArea();
    await sync.set({ schemaVersion: 1.5 });
    const api = makeApi({ sync });
    await migrateSettings(api);
    const data = sync._data();
    assert.equal(data.schemaVersion, SCHEMA_VERSION);
  });
});

// -- onSettingsChanged --

describe("onSettingsChanged (real module)", () => {
  it("fires callback when sync area changes", async () => {
    const api = makeApi();
    let received = null;
    onSettingsChanged((s) => { received = s; }, api);

    assert.equal(api._onChanged.addListener.mock.calls.length, 1);

    await writeSettings({ sort: "name" }, api);
    api._onChanged._fire({ sort: { newValue: "name" } }, "sync");

    await new Promise(r => setTimeout(r, 10));
    assert.notEqual(received, null);
    assert.equal(received.sort, "name");
  });

  it("ignores changes from the wrong area", async () => {
    const api = makeApi();
    let called = false;
    onSettingsChanged(() => { called = true; }, api);
    api._onChanged._fire({ sort: { newValue: "name" } }, "local");

    await new Promise(r => setTimeout(r, 10));
    assert.equal(called, false);
  });

  it("returns an unsubscribe function", () => {
    const api = makeApi();
    const unsub = onSettingsChanged(() => {}, api);
    assert.equal(api._onChanged._listeners.length, 1);
    unsub();
    assert.equal(api._onChanged.removeListener.mock.calls.length, 1);
  });

  it("returns no-op when onChanged is missing", () => {
    const unsub = onSettingsChanged(() => {}, { storage: {} });
    assert.equal(typeof unsub, "function");
    unsub();
  });

  it("uses local area name when sync unavailable", async () => {
    const api = makeApi({ noSync: true });
    let received = null;
    onSettingsChanged((s) => { received = s; }, api);

    api._onChanged._fire({}, "local");
    await new Promise(r => setTimeout(r, 10));
    assert.notEqual(received, null);
  });
});

// -- Round-trip integration --

describe("settings round-trip", () => {
  it("write then read preserves values", async () => {
    const api = makeApi();
    await writeSettings({ sort: "name", broadCategory: "coins", excludeVariants: true }, api);
    const s = await readSettings(api);
    assert.equal(s.sort, "name");
    assert.equal(s.broadCategory, "coins");
    assert.equal(s.excludeVariants, true);
    assert.equal(s.language, DEFAULTS.language);
  });

  it("reset then read returns DEFAULTS", async () => {
    const api = makeApi();
    await writeSettings({ sort: "name" }, api);
    await resetSettings(api);
    const s = await readSettings(api);
    assert.deepStrictEqual(s, { ...DEFAULTS });
  });

  it("migrate then read returns merged DEFAULTS", async () => {
    const sync = createMockArea();
    await sync.set({ sort: "name" });
    const api = makeApi({ sync });
    await migrateSettings(api);
    const s = await readSettings(api);
    assert.equal(s.sort, "name");
    assert.equal(s.schemaVersion, SCHEMA_VERSION);
    assert.equal(s.language, DEFAULTS.language);
  });
});
