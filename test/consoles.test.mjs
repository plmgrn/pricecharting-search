// Tests for lib/consoles.js
//
// Sanity checks: no duplicate IDs, groups are valid, names are
// non-empty, and the exported groupings are consistent.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { CONSOLES, CONSOLE_GROUPS, MAGAZINES } from "../src/lib/consoles.js";

describe("CONSOLES integrity", () => {
  test("no duplicate IDs", () => {
    const ids = CONSOLES.map(c => c.id);
    const unique = new Set(ids);
    assert.equal(ids.length, unique.size, "duplicate console IDs found");
  });

  test("all entries have non-empty id, name, group", () => {
    for (const c of CONSOLES) {
      assert.ok(c.id, `missing id: ${JSON.stringify(c)}`);
      assert.ok(c.name, `missing name: ${JSON.stringify(c)}`);
      assert.ok(c.group, `missing group: ${JSON.stringify(c)}`);
    }
  });

  test("every group in CONSOLES is in CONSOLE_GROUPS or Magazines", () => {
    const known = new Set([...CONSOLE_GROUPS, "Magazines & misc"]);
    for (const c of CONSOLES) {
      assert.ok(known.has(c.group), `unknown group: ${c.group} (${c.name})`);
    }
  });

  test("CONSOLE_GROUPS has no duplicates", () => {
    const unique = new Set(CONSOLE_GROUPS);
    assert.equal(CONSOLE_GROUPS.length, unique.size);
  });

  test("MAGAZINES are a subset of CONSOLES", () => {
    for (const m of MAGAZINES) {
      assert.ok(
        CONSOLES.includes(m),
        `magazine ${m.name} not found in CONSOLES`
      );
      assert.equal(m.group, "Magazines & misc");
    }
  });
});
