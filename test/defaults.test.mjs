// Tests for lib/defaults.js
//
// Validates shape, types, immutability, and contracts that other
// modules depend on.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, SCHEMA_VERSION, ALWAYS_SEND_PARAMS, SEARCH_BASE_URL } from "../src/lib/defaults.js";

describe("DEFAULTS shape and types", () => {
  const EXPECTED_KEYS = [
    "schemaVersion", "broadCategory", "consoleGroup", "consoleUid",
    "regionName", "sort", "language", "excludeVariants", "showImages",
    "openBehavior", "focusNew", "trimSelection", "maxSelectionLength",
    "menuTitle", "shortcutEnabled", "popupAutofocus", "setupComplete",
    "customUrlTemplate",
  ];

  test("has all expected keys", () => {
    for (const k of EXPECTED_KEYS) {
      assert.ok(Object.hasOwn(DEFAULTS, k), `missing key: ${k}`);
    }
  });

  test("has no unexpected keys", () => {
    for (const k of Object.keys(DEFAULTS)) {
      assert.ok(EXPECTED_KEYS.includes(k), `unexpected key: ${k}`);
    }
  });

  test("string settings are strings", () => {
    const STRING_KEYS = [
      "broadCategory", "consoleGroup", "consoleUid", "regionName",
      "sort", "language", "openBehavior", "menuTitle", "customUrlTemplate",
    ];
    for (const k of STRING_KEYS) {
      assert.equal(typeof DEFAULTS[k], "string", `${k} should be string`);
    }
  });

  test("boolean settings are booleans", () => {
    const BOOL_KEYS = [
      "excludeVariants", "showImages", "focusNew", "trimSelection",
      "shortcutEnabled", "popupAutofocus", "setupComplete",
    ];
    for (const k of BOOL_KEYS) {
      assert.equal(typeof DEFAULTS[k], "boolean", `${k} should be boolean`);
    }
  });

  test("maxSelectionLength is a positive integer", () => {
    assert.equal(typeof DEFAULTS.maxSelectionLength, "number");
    assert.ok(DEFAULTS.maxSelectionLength > 0);
    assert.ok(Number.isInteger(DEFAULTS.maxSelectionLength));
  });

  test("schemaVersion matches SCHEMA_VERSION export", () => {
    assert.equal(DEFAULTS.schemaVersion, SCHEMA_VERSION);
  });
});

describe("DEFAULTS immutability", () => {
  test("DEFAULTS is frozen", () => {
    assert.ok(Object.isFrozen(DEFAULTS));
  });

  test("mutation throws in strict mode", () => {
    assert.throws(() => { DEFAULTS.sort = "name"; }, TypeError);
    assert.throws(() => { DEFAULTS.newKey = "value"; }, TypeError);
    assert.throws(() => { delete DEFAULTS.sort; }, TypeError);
  });
});

describe("SCHEMA_VERSION", () => {
  test("is a positive integer", () => {
    assert.equal(typeof SCHEMA_VERSION, "number");
    assert.ok(Number.isInteger(SCHEMA_VERSION));
    assert.ok(SCHEMA_VERSION >= 1);
  });
});

describe("ALWAYS_SEND_PARAMS", () => {
  test("is frozen", () => {
    assert.ok(Object.isFrozen(ALWAYS_SEND_PARAMS));
  });

  test("contains type=prices", () => {
    assert.equal(ALWAYS_SEND_PARAMS.type, "prices");
  });

  test("contains ignore-preferences=true", () => {
    assert.equal(ALWAYS_SEND_PARAMS["ignore-preferences"], "true");
  });

  test("all values are strings", () => {
    for (const [k, v] of Object.entries(ALWAYS_SEND_PARAMS)) {
      assert.equal(typeof v, "string", `${k} value should be string`);
    }
  });
});

describe("SEARCH_BASE_URL", () => {
  test("is a valid https URL", () => {
    assert.ok(SEARCH_BASE_URL.startsWith("https://"));
    assert.doesNotThrow(() => new URL(SEARCH_BASE_URL));
  });

  test("points to pricecharting.com", () => {
    const url = new URL(SEARCH_BASE_URL);
    assert.ok(url.hostname.includes("pricecharting.com"));
  });
});
