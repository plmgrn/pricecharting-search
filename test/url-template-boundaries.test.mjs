import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DEFAULTS } from "../src/lib/defaults.js";
import { buildSearchUrl } from "../src/lib/url-template.js";

const TEMPLATE = "https://example.com/search?q={q}";

describe("custom URL template boundaries", () => {
  test("query data cannot add parameters or a fragment", () => {
    const selection = "zelda&admin=true#fragment";
    const result = buildSearchUrl(selection, {
      ...DEFAULTS,
      customUrlTemplate: TEMPLATE,
    });
    const url = new URL(result);

    assert.equal(url.searchParams.get("q"), selection);
    assert.equal(url.searchParams.has("admin"), false);
    assert.equal(url.hash, "");
  });

  for (const selection of [
    "percent % value",
    "back\\slash",
    "line one\nline two",
    "nul\u0000byte",
    "lone surrogate \uD800",
    "RTL \u200F mark",
  ]) {
    test(`keeps unusual query data inside a valid URL: ${JSON.stringify(selection)}`, () => {
      const result = buildSearchUrl(selection, {
        ...DEFAULTS,
        customUrlTemplate: TEMPLATE,
      });

      assert.equal(typeof result, "string");
      const url = new URL(result);
      assert.equal(url.protocol, "https:");
      assert.equal(url.hostname, "example.com");
      assert.equal(
        url.searchParams.get("q"),
        selection.replace("\uD800", "\uFFFD"),
      );
    });
  }

  test("a query placeholder in the host is rejected or produces a valid HTTP URL", () => {
    const result = buildSearchUrl("not a host", {
      ...DEFAULTS,
      customUrlTemplate: "https://{q}/",
    });

    assert.ok(result === null || typeof result === "string");
    if (result === null) return;

    const url = new URL(result);
    assert.ok(url.protocol === "https:" || url.protocol === "http:");
  });
});
