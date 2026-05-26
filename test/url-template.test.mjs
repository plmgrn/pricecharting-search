// Tests for lib/url-template.js
//
// Covers: selection normalization, URL building with filters,
// custom URL templates, and end-to-end pipeline.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchUrl, normalizeSelection } from "../src/lib/url-template.js";
import { parseQuery, applyOverrides } from "../src/lib/query-parser.js";
import { DEFAULTS } from "../src/lib/defaults.js";

// -- helpers --

function fullPipeline(input, storedSettings = DEFAULTS) {
  const parsed = parseQuery(input);
  const effective = applyOverrides(storedSettings, parsed);
  const selection = normalizeSelection(parsed.query, effective);
  return buildSearchUrl(selection, effective);
}

// -- normalizeSelection --

describe("normalizeSelection", () => {
  test("trims and collapses whitespace", () => {
    assert.equal(
      normalizeSelection("  hello   world  ", DEFAULTS),
      "hello world"
    );
  });

  test("respects trimSelection=false", () => {
    const s = { ...DEFAULTS, trimSelection: false };
    assert.equal(normalizeSelection("  hello   world  ", s), "  hello   world  ");
  });

  test("truncates to maxSelectionLength", () => {
    const s = { ...DEFAULTS, maxSelectionLength: 5 };
    assert.equal(normalizeSelection("abcdefghij", s), "abcde");
  });

  test("hard ceiling of 2000", () => {
    const s = { ...DEFAULTS, maxSelectionLength: 9999 };
    const long = "a".repeat(3000);
    assert.equal(normalizeSelection(long, s).length, 2000);
  });

  test("null input returns empty string", () => {
    assert.equal(normalizeSelection(null, DEFAULTS), "");
  });

  test("defaults maxSelectionLength when zero", () => {
    const s = { ...DEFAULTS, maxSelectionLength: 0 };
    // should fall back to 200
    assert.equal(normalizeSelection("a".repeat(300), s).length, 200);
  });

  test("undefined input returns empty string", () => {
    assert.equal(normalizeSelection(undefined, DEFAULTS), "");
  });

  test("numeric input is coerced to string", () => {
    assert.equal(normalizeSelection(42, DEFAULTS), "42");
  });

  test("negative maxSelectionLength treated as 0 (no truncation needed)", () => {
    const s = { ...DEFAULTS, maxSelectionLength: -5 };
    // Math.max(0, -5) = 0, max > 0 is false, no truncation
    assert.equal(normalizeSelection("hello", s), "hello");
  });

  test("NaN maxSelectionLength falls back to 200", () => {
    const s = { ...DEFAULTS, maxSelectionLength: NaN };
    assert.equal(normalizeSelection("a".repeat(300), s).length, 200);
  });

  test("string maxSelectionLength falls back to 200", () => {
    const s = { ...DEFAULTS, maxSelectionLength: "fifty" };
    assert.equal(normalizeSelection("a".repeat(300), s).length, 200);
  });

  test("float maxSelectionLength is truncated", () => {
    const s = { ...DEFAULTS, maxSelectionLength: 5.9 };
    assert.equal(normalizeSelection("abcdefghij", s), "abcde");
  });

  test("tabs and newlines are collapsed", () => {
    assert.equal(
      normalizeSelection("hello\t\nworld", DEFAULTS),
      "hello world"
    );
  });
});

// -- buildSearchUrl --

describe("buildSearchUrl", () => {
  test("empty selection returns null", () => {
    assert.equal(buildSearchUrl("", DEFAULTS), null);
  });

  test("basic query produces valid URL", () => {
    const url = buildSearchUrl("zelda", DEFAULTS);
    assert.ok(url.startsWith("https://www.pricecharting.com/search-products"));
    assert.ok(url.includes("q=zelda"));
  });

  test("includes always-sent params", () => {
    const url = buildSearchUrl("test", DEFAULTS);
    assert.ok(url.includes("type=prices"));
    assert.ok(url.includes("ignore-preferences=true"));
  });

  test("broadCategory adds broad-category param", () => {
    const s = { ...DEFAULTS, broadCategory: "video-games" };
    const url = buildSearchUrl("test", s);
    assert.ok(url.includes("broad-category=video-games"));
  });

  test("consoleUid adds console-uid param", () => {
    const s = { ...DEFAULTS, consoleUid: "G7" };
    const url = buildSearchUrl("test", s);
    assert.ok(url.includes("console-uid=G7"));
  });

  test("regionName adds region-name param", () => {
    const s = { ...DEFAULTS, regionName: "pal" };
    const url = buildSearchUrl("test", s);
    assert.ok(url.includes("region-name=pal"));
  });

  test("empty filter strings are omitted", () => {
    const url = buildSearchUrl("test", DEFAULTS);
    assert.ok(!url.includes("broad-category="));
    assert.ok(!url.includes("console-uid="));
    assert.ok(!url.includes("region-name="));
  });

  test("language inserts locale prefix", () => {
    const s = { ...DEFAULTS, language: "de" };
    const url = buildSearchUrl("test", s);
    assert.ok(url.includes("/de/search-products"));
  });

  test("boolean params are sent as strings", () => {
    const s = { ...DEFAULTS, excludeVariants: true, showImages: false };
    const url = buildSearchUrl("test", s);
    assert.ok(url.includes("exclude-variants=true"));
    assert.ok(url.includes("show-images=false"));
  });
  test("non-boolean excludeVariants is not sent", () => {
    const s = { ...DEFAULTS, excludeVariants: "true" };
    const url = buildSearchUrl("test", s);
    assert.ok(!url.includes("exclude-variants="));
  });

  test("non-boolean showImages is not sent", () => {
    const s = { ...DEFAULTS, showImages: "false" };
    const url = buildSearchUrl("test", s);
    assert.ok(!url.includes("show-images="));
  });

  test("null consoleUid is omitted", () => {
    const s = { ...DEFAULTS, consoleUid: null };
    const url = buildSearchUrl("test", s);
    assert.ok(!url.includes("console-uid="));
  });

  test("sort param is sent when non-default", () => {
    const s = { ...DEFAULTS, sort: "price-highest" };
    const { params } = deconstruct(buildSearchUrl("test", s));
    assert.equal(params["sort"], "price-highest");
  });

  test("language with spaces is used as-is (no validation)", () => {
    const s = { ...DEFAULTS, language: " de " };
    const url = buildSearchUrl("test", s);
    // trimmed by the code
    assert.ok(url.includes("/de/search-products"));
  });

  test("empty language after trim is omitted", () => {
    const s = { ...DEFAULTS, language: "   " };
    const url = buildSearchUrl("test", s);
    assert.ok(!url.includes("//search-products"));
    const { pathname } = deconstruct(url);
    assert.equal(pathname, "/search-products");
  });

  test("selection with special characters is encoded", () => {
    const url = buildSearchUrl("a&b=c", DEFAULTS);
    const { params } = deconstruct(url);
    assert.equal(params["q"], "a&b=c");
  });
});

describe("custom URL template", () => {
  test("template with {q} is used verbatim", () => {
    const s = { ...DEFAULTS, customUrlTemplate: "https://example.com/?q={q}" };
    assert.equal(buildSearchUrl("zelda", s), "https://example.com/?q=zelda");
  });

  test("template without {q} returns null", () => {
    const s = { ...DEFAULTS, customUrlTemplate: "https://example.com/" };
    assert.equal(buildSearchUrl("zelda", s), null);
  });

  test("non-http template returns null", () => {
    const s = { ...DEFAULTS, customUrlTemplate: "javascript:alert({q})" };
    assert.equal(buildSearchUrl("zelda", s), null);
  });

  test("template encodes query", () => {
    const s = { ...DEFAULTS, customUrlTemplate: "https://example.com/?q={q}" };
    const url = buildSearchUrl("god of war", s);
    assert.ok(url.includes("q=god%20of%20war"));
  });

  test("multiple {q} tokens are all replaced", () => {
    const s = { ...DEFAULTS, customUrlTemplate: "https://example.com/?q={q}&r={q}" };
    const url = buildSearchUrl("zelda", s);
    assert.equal(url, "https://example.com/?q=zelda&r=zelda");
  });

  test("whitespace-only template is ignored", () => {
    const s = { ...DEFAULTS, customUrlTemplate: "   " };
    const url = buildSearchUrl("test", s);
    // falls through to standard URL building
    assert.ok(url.includes("pricecharting.com"));
  });

  test("data: scheme template returns null", () => {
    const s = { ...DEFAULTS, customUrlTemplate: "data:text/html,{q}" };
    assert.equal(buildSearchUrl("test", s), null);
  });

  test("ftp: scheme template returns null", () => {
    const s = { ...DEFAULTS, customUrlTemplate: "ftp://example.com/{q}" };
    assert.equal(buildSearchUrl("test", s), null);
  });

  test("HTTP (uppercase) template is accepted", () => {
    const s = { ...DEFAULTS, customUrlTemplate: "HTTP://example.com/?q={q}" };
    const url = buildSearchUrl("test", s);
    assert.ok(url.startsWith("HTTP://"));
  });
});

// -- end-to-end pipeline --

describe("end-to-end URL pipeline", () => {
  test("jp,ds -> console-uid=G111, no region-name", () => {
    const url = fullPipeline("jp,ds:zelda");
    assert.ok(url.includes("console-uid=G111"));
    assert.ok(!url.includes("region-name="));
    assert.ok(url.includes("q=zelda"));
  });

  test("lego,eu -> broad-category + region-name", () => {
    const url = fullPipeline("lego,eu:star wars");
    assert.ok(url.includes("broad-category=lego-sets"));
    assert.ok(url.includes("region-name=pal"));
    assert.ok(!url.includes("console-uid="));
    assert.ok(url.includes("q=star+wars"));
  });

  test("raw strips stored settings", () => {
    const url = fullPipeline("raw:zelda", {
      ...DEFAULTS,
      broadCategory: "video-games",
      consoleUid: "G7",
      regionName: "ntsc",
    });
    assert.ok(!url.includes("broad-category="));
    assert.ok(!url.includes("console-uid="));
    assert.ok(!url.includes("region-name="));
    assert.ok(url.includes("q=zelda"));
  });

  test("no filter passes stored settings through", () => {
    const url = fullPipeline("zelda", {
      ...DEFAULTS,
      broadCategory: "video-games",
      consoleUid: "G7",
      regionName: "ntsc",
    });
    assert.ok(url.includes("console-uid=G7"));
    assert.ok(url.includes("region-name=ntsc"));
  });

  test("custom template ignores filter keywords", () => {
    const url = fullPipeline("jp,ds:zelda", {
      ...DEFAULTS,
      customUrlTemplate: "https://example.com/?search={q}",
    });
    assert.equal(url, "https://example.com/?search=zelda");
  });

  test("empty query after colon returns null", () => {
    assert.equal(fullPipeline("jp,ds:"), null);
  });

  test("console filter overrides stored non-game category in URL", () => {
    const url = fullPipeline("ps2:god of war", {
      ...DEFAULTS,
      broadCategory: "comic-books",
    });
    assert.ok(url.includes("broad-category=video-games"));
    assert.ok(!url.includes("broad-category=comic-books"));
    assert.ok(url.includes("console-uid=G7"));
  });

  test("console-implied category appears in URL without explicit keyword", () => {
    const url = fullPipeline("snes:zelda");
    assert.ok(url.includes("broad-category=video-games"));
    assert.ok(url.includes("console-uid=G13"));
  });

  test("context-menu-like flow: filter prefix is not in the search query", () => {
    // simulates what the context menu handler does
    const url = fullPipeline("ps2:god of war");
    assert.ok(url.includes("q=god+of+war"));
    assert.ok(!url.includes("q=ps2"));
  });

  test("plain text selection preserves stored category in URL", () => {
    const url = fullPipeline("zelda", {
      ...DEFAULTS,
      broadCategory: "comic-books",
    });
    assert.ok(url.includes("broad-category=comic-books"));
    assert.ok(!url.includes("console-uid="));
  });

  test("kitchen sink URL has all params", () => {
    const url = fullPipeline("games,jp,ds,expensive,novar,noimages:final fantasy");
    assert.ok(url.includes("broad-category=video-games"));
    assert.ok(url.includes("console-uid=G111"));
    assert.ok(!url.includes("region-name="));
    assert.ok(url.includes("sort=price-highest"));
    assert.ok(url.includes("exclude-variants=true"));
    assert.ok(url.includes("show-images=false"));
    assert.ok(url.includes("q=final+fantasy"));
  });

  test("kitchen sink with conflicting stored settings", () => {
    const url = fullPipeline("games,jp,ds,expensive,novar,noimages:final fantasy", {
      ...DEFAULTS,
      broadCategory: "trading-cards",
      consoleUid: "G17",
      regionName: "pal",
      sort: "name",
      excludeVariants: false,
      showImages: true,
      language: "fr",
    });
    assert.ok(url.includes("console-uid=G111"));
    assert.ok(!url.includes("region-name=pal"));
    assert.ok(!url.includes("region-name="));
    assert.ok(url.includes("broad-category=video-games"));
    assert.ok(url.includes("sort=price-highest"));
    assert.ok(url.includes("/fr/"));
  });
});

// -- URL structural integrity (round-trip deconstruction) --

const VALID_PARAMS = new Set([
  "type", "q", "sort", "broad-category", "console-uid",
  "region-name", "exclude-variants", "show-images", "ignore-preferences",
]);

function deconstruct(url) {
  const parsed = new URL(url);
  const params = Object.create(null);
  for (const [k, v] of parsed.searchParams) {
    params[k] = v;
  }
  return { params, pathname: parsed.pathname };
}

describe("URL round-trip deconstruction", () => {
  test("every param name is in the PriceCharting allowlist", () => {
    const url = fullPipeline("games,jp,ds,expensive,novar,noimages:final fantasy");
    const { params } = deconstruct(url);
    for (const key of Object.keys(params)) {
      assert.ok(VALID_PARAMS.has(key), `unexpected param: ${key}`);
    }
  });

  test("no duplicate param keys", () => {
    const url = fullPipeline("games,eu,expensive:zelda");
    const raw = url.split("?")[1];
    const keys = raw.split("&").map(p => p.split("=")[0]);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    assert.deepEqual(dupes, [], `duplicate params: ${dupes}`);
  });

  test("round-trip: all filters decoded correctly", () => {
    const url = fullPipeline("games,jp,ds,expensive,novar,noimages:final fantasy");
    const { params } = deconstruct(url);

    assert.equal(params["type"], "prices");
    assert.equal(params["ignore-preferences"], "true");
    assert.equal(params["broad-category"], "video-games");
    assert.equal(params["console-uid"], "G111");
    assert.equal(params["sort"], "price-highest");
    assert.equal(params["exclude-variants"], "true");
    assert.equal(params["show-images"], "false");
    assert.equal(params["q"], "final fantasy");
    assert.equal(params["region-name"], undefined);
  });

  test("round-trip: minimal query has only required params", () => {
    const url = fullPipeline("zelda");
    const { params } = deconstruct(url);

    assert.equal(params["type"], "prices");
    assert.equal(params["ignore-preferences"], "true");
    assert.equal(params["q"], "zelda");
    assert.equal(params["broad-category"], undefined);
    assert.equal(params["console-uid"], undefined);
    assert.equal(params["region-name"], undefined);
  });

  test("round-trip: query with special chars survives encoding", () => {
    const url = fullPipeline("Mario & Luigi: Partners");
    const { params } = deconstruct(url);
    assert.equal(params["q"], "Mario & Luigi: Partners");
  });

  test("language prefix in pathname, not in params", () => {
    const url = buildSearchUrl("test", { ...DEFAULTS, language: "fr" });
    const { params, pathname } = deconstruct(url);
    assert.ok(pathname.startsWith("/fr/"), `expected /fr/ prefix, got ${pathname}`);
    assert.equal(params["language"], undefined);
  });

  test("absent optional string params are undefined", () => {
    const url = fullPipeline("zelda");
    const { params } = deconstruct(url);
    assert.equal(params["broad-category"], undefined);
    assert.equal(params["console-uid"], undefined);
    assert.equal(params["region-name"], undefined);
  });

  test("boolean params are always sent when boolean-typed", () => {
    const url = fullPipeline("zelda");
    const { params } = deconstruct(url);
    // DEFAULTS has excludeVariants=false and showImages=true
    assert.equal(params["exclude-variants"], "false");
    assert.equal(params["show-images"], "true");
  });

  test("raw clears stored custom template", () => {
    const url = fullPipeline("raw:zelda", {
      ...DEFAULTS,
      customUrlTemplate: "https://example.com/?q={q}",
    });
    // raw blanks customUrlTemplate, so standard URL is built
    assert.ok(url.includes("pricecharting.com"));
    assert.ok(url.includes("q=zelda"));
  });

  test("region + language both applied", () => {
    const url = fullPipeline("eu:zelda", {
      ...DEFAULTS,
      language: "de",
    });
    const { params, pathname } = deconstruct(url);
    assert.ok(pathname.startsWith("/de/"));
    assert.equal(params["region-name"], "pal");
  });
});
