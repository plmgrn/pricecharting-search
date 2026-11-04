import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULTS } from "../src/lib/defaults.js";
import { CONSOLES } from "../src/lib/consoles.js";
import { readSettings, writeSettings } from "../src/lib/settings.js";

function apiWithStoredSettings(data) {
  return {
    storage: {
      sync: {
        async get() {
          return { ...data };
        },
        async set(patch) {
          Object.assign(data, patch);
        },
      },
    },
  };
}

describe("stored settings validation", () => {
  for (const [key, value] of [
    ["sort", 123],
    ["maxSelectionLength", "abc"],
    ["broadCategory", "<script>"],
    ["consoleUid", "G99999"],
  ]) {
    test(`invalid stored ${key} falls back to its default`, async () => {
      const settings = await readSettings(apiWithStoredSettings({ [key]: value }));
      assert.equal(settings[key], DEFAULTS[key]);
    });
  }

  test("concurrent partial writes preserve both patches", async () => {
    const stored = {};
    const api = apiWithStoredSettings(stored);

    await Promise.all([
      writeSettings({ sort: "name" }, api),
      writeSettings({ broadCategory: "coins" }, api),
    ]);

    assert.equal(stored.sort, "name");
    assert.equal(stored.broadCategory, "coins");
  });

  test("a valid stored console identifier is preserved", async () => {
    const validConsole = CONSOLES[0];
    const settings = await readSettings(apiWithStoredSettings({
      consoleUid: validConsole.id,
    }));

    assert.equal(settings.consoleUid, validConsole.id);
  });
});
