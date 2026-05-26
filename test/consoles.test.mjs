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

  test("no duplicate names within the same group", () => {
    const seen = Object.create(null);
    const dupes = [];
    for (const c of CONSOLES) {
      const key = `${c.group}::${c.name}`;
      if (seen[key]) dupes.push(key);
      seen[key] = true;
    }
    assert.deepEqual(dupes, [], "duplicate names in same group");
  });

  test("all IDs start with G", () => {
    for (const c of CONSOLES) {
      assert.ok(c.id.startsWith("G"), `${c.name} id ${c.id} missing G prefix`);
    }
  });

  test("PAL consoles start with PAL prefix", () => {
    const pal = CONSOLES.filter(c => c.group === "PAL");
    for (const c of pal) {
      assert.ok(c.name.startsWith("PAL "), `${c.name} missing PAL prefix`);
    }
  });

  test("Japan consoles start with JP prefix", () => {
    const jp = CONSOLES.filter(c => c.group === "Japan");
    for (const c of jp) {
      assert.ok(c.name.startsWith("JP "), `${c.name} missing JP prefix`);
    }
  });

  test("CONSOLE_GROUPS matches actual groups in CONSOLES (minus magazines)", () => {
    const actualGroups = [...new Set(CONSOLES.map(c => c.group))];
    const nonMag = actualGroups.filter(g => g !== "Magazines & misc");
    for (const g of nonMag) {
      assert.ok(CONSOLE_GROUPS.includes(g), `group ${g} not in CONSOLE_GROUPS`);
    }
  });

  test("no whitespace-only names or IDs", () => {
    for (const c of CONSOLES) {
      assert.ok(c.id.trim().length > 0, `empty id for ${JSON.stringify(c)}`);
      assert.ok(c.name.trim().length > 0, `empty name for ${JSON.stringify(c)}`);
    }
  });
});
