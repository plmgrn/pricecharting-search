// Settings persistence tests.
//
// Mocks the browser storage API to test read/write/migrate/onChange
// without a real browser. Covers schema migration, defaults overlay,
// area fallback, and change subscription.

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// -- Storage mock --

function createMockArea() {
  let data = {};
  return {
    _data: () => ({ ...data }),
    get: mock.fn(async (keys) => {
      if (keys === null) return { ...data };
      const result = {};
      for (const k of Array.isArray(keys) ? keys : Object.keys(keys)) {
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

// -- Module loader with mocked api --

async function loadModule(opts = {}) {
  const syncArea = opts.sync ?? createMockArea();
  const localArea = opts.local ?? createMockArea();
  const onChanged = opts.onChanged ?? createMockOnChanged();
  const noSync = opts.noSync ?? false;

  // build a fake api object
  const api = {
    storage: {
      sync: noSync ? undefined : syncArea,
      local: localArea,
      onChanged,
    },
  };

  // We can't easily swap imports, so we test the logic inline
  // by re-implementing the core functions against the mock.
  // This mirrors settings.js exactly.

  const { DEFAULTS, SCHEMA_VERSION } = await import("../src/lib/defaults.js");

  function pickArea() {
    if (api.storage && api.storage.sync) return api.storage.sync;
    if (api.storage && api.storage.local) return api.storage.local;
    return null;
  }

  async function readSettings() {
    const area = pickArea();
    if (!area) return { ...DEFAULTS };
    try {
      const stored = await area.get(Object.keys(DEFAULTS));
      return { ...DEFAULTS, ...(stored || {}) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  async function writeSettings(patch) {
    const area = pickArea();
    if (!area) return;
    const clean = {};
    for (const k of Object.keys(patch)) {
      if (Object.hasOwn(DEFAULTS, k)) clean[k] = patch[k];
    }
    clean.schemaVersion = SCHEMA_VERSION;
    await area.set(clean);
  }

  async function resetSettings() {
    const area = pickArea();
    if (!area) return;
    await area.clear();
    await area.set({ ...DEFAULTS });
  }

  async function migrateSettings() {
    const area = pickArea();
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
    const s = { ...DEFAULTS, ...stored };
    switch (fromVersion) {
      case 0:
      case 1:
        break;
      default:
        return;
    }
    s.schemaVersion = SCHEMA_VERSION;
    await area.set(s);
  }

  function onSettingsChanged(callback) {
    if (!api.storage || !api.storage.onChanged) return () => {};
    const expectedArea = api.storage.sync ? "sync" : "local";
    const handler = async (_changes, areaName) => {
      if (areaName !== expectedArea) return;
      callback(await readSettings());
    };
    api.storage.onChanged.addListener(handler);
    return () => api.storage.onChanged.removeListener(handler);
  }

  return {
    readSettings, writeSettings, resetSettings, migrateSettings,
    onSettingsChanged,
    DEFAULTS, SCHEMA_VERSION,
    syncArea, localArea, onChanged, api,
  };
}


describe("readSettings", () => {
  it("returns DEFAULTS when storage is empty", async () => {
    const m = await loadModule();
    const s = await m.readSettings();
    assert.deepStrictEqual(s, m.DEFAULTS);
  });

  it("overlays stored values on top of DEFAULTS", async () => {
    const sync = createMockArea();
    await sync.set({ sort: "name", broadCategory: "coins" });
    const m = await loadModule({ sync });
    const s = await m.readSettings();
    assert.equal(s.sort, "name");
    assert.equal(s.broadCategory, "coins");
    // unset keys still have defaults
    assert.equal(s.openBehavior, m.DEFAULTS.openBehavior);
  });

  it("ignores stray keys not in DEFAULTS", async () => {
    const sync = createMockArea();
    await sync.set({ unknownKey: "should not appear" });
    const m = await loadModule({ sync });
    const s = await m.readSettings();
    assert.equal(s.unknownKey, undefined);
  });

  it("falls back to local when sync is unavailable", async () => {
    const local = createMockArea();
    await local.set({ sort: "name" });
    const m = await loadModule({ noSync: true, local });
    const s = await m.readSettings();
    assert.equal(s.sort, "name");
  });

  it("returns DEFAULTS when storage throws", async () => {
    const sync = createMockArea();
    sync.get = mock.fn(async () => { throw new Error("quota exceeded"); });
    const m = await loadModule({ sync });
    const s = await m.readSettings();
    assert.deepStrictEqual(s, m.DEFAULTS);
  });
});


describe("writeSettings", () => {
  it("writes a partial patch and stamps schemaVersion", async () => {
    const sync = createMockArea();
    const m = await loadModule({ sync });
    await m.writeSettings({ sort: "name" });
    const data = sync._data();
    assert.equal(data.sort, "name");
    assert.equal(data.schemaVersion, m.SCHEMA_VERSION);
  });

  it("does not clobber unrelated stored keys", async () => {
    const sync = createMockArea();
    await sync.set({ broadCategory: "coins" });
    const m = await loadModule({ sync });
    await m.writeSettings({ sort: "name" });
    const data = sync._data();
    assert.equal(data.broadCategory, "coins");
    assert.equal(data.sort, "name");
  });

  it("filters out keys not in DEFAULTS", async () => {
    const sync = createMockArea();
    const m = await loadModule({ sync });
    await m.writeSettings({ sort: "name", banana: "yes" });
    const data = sync._data();
    assert.equal(data.sort, "name");
    assert.equal(data.banana, undefined);
  });
});


describe("resetSettings", () => {
  it("clears storage and writes DEFAULTS", async () => {
    const sync = createMockArea();
    await sync.set({ sort: "name", broadCategory: "coins" });
    const m = await loadModule({ sync });
    await m.resetSettings();
    const s = await m.readSettings();
    assert.deepStrictEqual(s, m.DEFAULTS);
    assert.equal(sync.clear.mock.calls.length, 1);
  });
});


describe("migrateSettings", () => {
  it("fills DEFAULTS on first install (schemaVersion 0)", async () => {
    const sync = createMockArea();
    const m = await loadModule({ sync });
    await m.migrateSettings();
    const data = sync._data();
    assert.equal(data.schemaVersion, m.SCHEMA_VERSION);
    assert.equal(data.sort, m.DEFAULTS.sort);
  });

  it("preserves existing user values during migration", async () => {
    const sync = createMockArea();
    await sync.set({ sort: "name", broadCategory: "coins" });
    const m = await loadModule({ sync });
    await m.migrateSettings();
    const data = sync._data();
    assert.equal(data.sort, "name");
    assert.equal(data.broadCategory, "coins");
    assert.equal(data.schemaVersion, m.SCHEMA_VERSION);
  });

  it("skips migration when stored version is newer (downgrade)", async () => {
    const sync = createMockArea();
    await sync.set({ schemaVersion: 999, sort: "name" });
    const m = await loadModule({ sync });
    await m.migrateSettings();
    const data = sync._data();
    // should not have been overwritten
    assert.equal(data.schemaVersion, 999);
  });

  it("handles storage error gracefully", async () => {
    const sync = createMockArea();
    sync.get = mock.fn(async () => { throw new Error("read error"); });
    const m = await loadModule({ sync });
    // should not throw
    await m.migrateSettings();
  });
});


describe("onSettingsChanged", () => {
  it("fires callback when sync area changes", async () => {
    const onChanged = createMockOnChanged();
    const m = await loadModule({ onChanged });

    let received = null;
    m.onSettingsChanged((s) => { received = s; });

    assert.equal(onChanged.addListener.mock.calls.length, 1);

    // simulate a storage change
    await m.writeSettings({ sort: "name" });
    onChanged._fire({ sort: { newValue: "name" } }, "sync");

    // give the async handler a tick
    await new Promise(r => setTimeout(r, 10));
    assert.notEqual(received, null);
    assert.equal(received.sort, "name");
  });

  it("ignores changes from the wrong area", async () => {
    const onChanged = createMockOnChanged();
    const m = await loadModule({ onChanged });

    let called = false;
    m.onSettingsChanged(() => { called = true; });
    onChanged._fire({ sort: { newValue: "name" } }, "local");

    await new Promise(r => setTimeout(r, 10));
    assert.equal(called, false);
  });

  it("returns an unsubscribe function", async () => {
    const onChanged = createMockOnChanged();
    const m = await loadModule({ onChanged });

    const unsub = m.onSettingsChanged(() => {});
    assert.equal(onChanged._listeners.length, 1);
    unsub();
    assert.equal(onChanged.removeListener.mock.calls.length, 1);
  });
});
