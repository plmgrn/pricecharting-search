import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS } from "../src/lib/defaults.js";
import { RULES, sanitizeSettings, validatePatch } from "../src/lib/settings-schema.js";

const KEYS = Object.keys(DEFAULTS);
const JUNK = [
  undefined, null, NaN, Infinity, -Infinity, -0, 0, -1, 1.5, 2 ** 53,
  "", " ", "abc", "<script>", "G99999", "__proto__", "x".repeat(10_000),
  true, false, [], {}, [1], { a: 1 },
];

test("every default has a rule and satisfies it; no orphan rules", () => {
  assert.deepEqual(Object.keys(RULES).sort(), [...KEYS].sort());
  for (const k of KEYS) assert.ok(RULES[k](DEFAULTS[k]), `default for ${k}`);
});

test("no junk value ever survives sanitizing", () => {
  for (const k of KEYS) {
    for (const junk of JUNK) {
      const out = sanitizeSettings({ [k]: junk });
      assert.ok(RULES[k](out[k]), `${k} <- ${JSON.stringify(junk)}`);
    }
  }
});

test("non-object input yields defaults", () => {
  for (const bad of [null, undefined, "str", 5, true, []]) {
    assert.deepEqual(sanitizeSettings(bad), { ...DEFAULTS });
  }
});

test("unknown and prototype keys are dropped", () => {
  const stored = JSON.parse('{"__proto__":{"polluted":1},"evil":1,"sort":"popularity"}');
  const out = sanitizeSettings(stored);
  assert.equal(Object.hasOwn(out, "evil"), false);
  assert.equal({}.polluted, undefined);
  assert.deepEqual(Object.keys(out).sort(), [...KEYS].sort());
});

test("sanitize is idempotent and does not mutate input", () => {
  const input = Object.freeze({ sort: 123, maxSelectionLength: "abc" });
  const once = sanitizeSettings(input);
  assert.deepEqual(sanitizeSettings(once), once);
});

test("validatePatch reports bad values and ignores unknown keys", () => {
  const r = validatePatch({ consoleUid: "G99999", maxSelectionLength: 200, nope: 1 });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors), ["consoleUid"]);
  assert.deepEqual(r.value, { maxSelectionLength: 200 });
});