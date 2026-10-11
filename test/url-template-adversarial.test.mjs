import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULTS } from "../src/lib/defaults.js";
import { buildSearchUrl } from "../src/lib/url-template.js";

describe("URL builder adversarial selections", () => {
  const selections = [
    "percent % value",
    "back\\slash",
    "line one\nline two",
    "nul\u0000byte",
    "lone surrogate \uD800",
    "RTL \u200F mark",
  ];

  for (const selection of selections) {
    test(`creates a valid PriceCharting URL for ${JSON.stringify(selection)}`, () => {
      const result = buildSearchUrl(selection, { ...DEFAULTS });
      assert.equal(typeof result, "string");

      const url = new URL(result);
      assert.equal(url.protocol, "https:");
      assert.equal(url.hostname, "www.pricecharting.com");
      assert.ok(url.searchParams.has("q"));
      assert.equal(url.searchParams.get("q"), selection.replace("\uD800", "\uFFFD"));
    });
  }
});
