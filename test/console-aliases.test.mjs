// Tests for lib/console-aliases.js
//
// Validates alias map integrity, immutability, and consistency
// with the CONSOLES data.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MANUAL_ALIASES } from "../src/lib/console-aliases.js";
import { CONSOLES } from "../src/lib/consoles.js";

const CONSOLE_IDS = new Set(CONSOLES.map(c => c.id));

describe("MANUAL_ALIASES integrity", () => {
  test("is frozen", () => {
    assert.ok(Object.isFrozen(MANUAL_ALIASES));
  });

  test("mutation throws in strict mode", () => {
    assert.throws(() => { MANUAL_ALIASES.newAlias = "G1"; }, TypeError);
  });

  test("every alias key is a non-empty lowercase string", () => {
    for (const alias of Object.keys(MANUAL_ALIASES)) {
      assert.ok(alias.length > 0, "empty alias key");
      assert.equal(alias, alias.toLowerCase(), `alias "${alias}" is not lowercase`);
    }
  });

  test("every alias value is a valid CONSOLES id", () => {
    for (const [alias, id] of Object.entries(MANUAL_ALIASES)) {
      assert.ok(CONSOLE_IDS.has(id), `alias "${alias}" -> "${id}" not in CONSOLES`);
    }
  });

  test("no empty string values", () => {
    for (const [alias, id] of Object.entries(MANUAL_ALIASES)) {
      assert.ok(id.length > 0, `alias "${alias}" has empty id`);
    }
  });

  test("no duplicate alias keys (Object.keys guarantees, but sanity check)", () => {
    const keys = Object.keys(MANUAL_ALIASES);
    const unique = new Set(keys);
    assert.equal(keys.length, unique.size);
  });

  test("all values start with G (console-uid format)", () => {
    for (const [alias, id] of Object.entries(MANUAL_ALIASES)) {
      assert.ok(id.startsWith("G"), `alias "${alias}" -> "${id}" missing G prefix`);
    }
  });
});

describe("MANUAL_ALIASES don't shadow static keywords", () => {
  // these keywords from query-parser should never be aliases
  const KEYWORDS = [
    "games", "videogames", "vg", "cards", "pokemon", "tcg", "mtg",
    "magic", "yugioh", "lorcana", "onepiece", "comics", "manga",
    "funko", "pops", "toys", "figures", "coins", "lego",
    "pal", "eu", "europe", "aus", "uk", "ntsc", "us", "usa", "na", "american",
    "jp", "japan", "japanese",
    "popular", "alpha", "az", "expensive", "pricey", "cheap", "budget",
    "rising", "trending", "newest", "recent", "latest", "asc", "desc",
    "novar", "novariants", "noimages", "images",
    "raw",
  ];

  for (const kw of KEYWORDS) {
    test(`"${kw}" is not an alias`, () => {
      assert.ok(!Object.hasOwn(MANUAL_ALIASES, kw),
        `"${kw}" is both a keyword and an alias -- keyword would win, alias is dead code`);
    });
  }
});
