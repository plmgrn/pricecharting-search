// Tests for lib/query-parser.js
//
// Covers: input robustness, keyword parsing, regional console
// resolution, conflict handling, raw mode, and adversarial inputs.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseQuery, applyOverrides } from "../src/lib/query-parser.js";
import { CONSOLES } from "../src/lib/consoles.js";
import { MANUAL_ALIASES } from "../src/lib/console-aliases.js";
import { DEFAULTS } from "../src/lib/defaults.js";

// -- helpers --

const Q = '"';

// -- A. Input type robustness --

describe("input type robustness", () => {
  for (const bad of [null, undefined, "", 0, false, NaN, {}, [], 42, 3.14, true, -1]) {
    test(`parseQuery(${JSON.stringify(bad)}) does not throw`, () => {
      assert.doesNotThrow(() => parseQuery(bad));
    });
  }

  test("BigInt does not throw", () => {
    assert.doesNotThrow(() => parseQuery(BigInt(99)));
  });
});

// -- B. Single-token filter keywords --

describe("single-token keywords", () => {
  const EXPECTED = {
    games:      { key: "broadCategory", value: "video-games" },
    videogames: { key: "broadCategory", value: "video-games" },
    vg:         { key: "broadCategory", value: "video-games" },
    cards:      { key: "broadCategory", value: "trading-cards" },
    pokemon:    { key: "broadCategory", value: "trading-cards" },
    tcg:        { key: "broadCategory", value: "trading-cards" },
    mtg:        { key: "broadCategory", value: "trading-cards" },
    magic:      { key: "broadCategory", value: "trading-cards" },
    yugioh:     { key: "broadCategory", value: "trading-cards" },
    lorcana:    { key: "broadCategory", value: "trading-cards" },
    onepiece:   { key: "broadCategory", value: "trading-cards" },
    comics:     { key: "broadCategory", value: "comic-books" },
    manga:      { key: "broadCategory", value: "comic-books" },
    funko:      { key: "broadCategory", value: "funko-pops" },
    pops:       { key: "broadCategory", value: "funko-pops" },
    toys:       { key: "broadCategory", value: "funko-pops" },
    figures:    { key: "broadCategory", value: "funko-pops" },
    coins:      { key: "broadCategory", value: "coins" },
    lego:       { key: "broadCategory", value: "lego-sets" },
    pal:        { key: "regionName", value: "pal" },
    eu:         { key: "regionName", value: "pal" },
    europe:     { key: "regionName", value: "pal" },
    aus:        { key: "regionName", value: "pal" },
    uk:         { key: "regionName", value: "pal" },
    ntsc:       { key: "regionName", value: "ntsc" },
    us:         { key: "regionName", value: "ntsc" },
    usa:        { key: "regionName", value: "ntsc" },
    na:         { key: "regionName", value: "ntsc" },
    american:   { key: "regionName", value: "ntsc" },
    jp:         { key: "regionName", value: "japan" },
    japan:      { key: "regionName", value: "japan" },
    japanese:   { key: "regionName", value: "japan" },
    popular:    { key: "sort", value: "popularity" },
    alpha:      { key: "sort", value: "name" },
    az:         { key: "sort", value: "name" },
    expensive:  { key: "sort", value: "price-highest" },
    pricey:     { key: "sort", value: "price-highest" },
    cheap:      { key: "sort", value: "price-lowest" },
    budget:     { key: "sort", value: "price-lowest" },
    rising:     { key: "sort", value: "change-dollar" },
    trending:   { key: "sort", value: "change-dollar" },
    newest:     { key: "sort", value: "date-added" },
    recent:     { key: "sort", value: "date-added" },
    latest:     { key: "sort", value: "date-added" },
    asc:        { key: "sort", value: "name" },
    desc:       { key: "sort", value: "price-highest" },
    novar:      { key: "excludeVariants", value: true },
    novariants: { key: "excludeVariants", value: true },
    noimages:   { key: "showImages", value: false },
    images:     { key: "showImages", value: true },
  };

  for (const [kw, { key, value }] of Object.entries(EXPECTED)) {
    test(`${kw}: sets ${key}=${JSON.stringify(value)}`, () => {
      const r = parseQuery(`${kw}:test`);
      assert.equal(r.overrides[key], value);
      assert.equal(r.query, "test");
      assert.equal(r.raw, false);
    });
  }
});

// -- C. Keyword combos (category x region x sort) --

describe("keyword combos", () => {
  const CATS = ["games", "cards", "comics", "funko", "coins", "lego"];
  const REGIONS = ["jp", "eu", "us"];
  const SORTS = ["popular", "alpha", "expensive", "rising"];

  for (const cat of CATS) {
    for (const reg of REGIONS) {
      for (const sort of SORTS) {
        const input = `${cat},${reg},${sort}:test query`;
        test(input, () => {
          const r = parseQuery(input);
          assert.ok(r.overrides.broadCategory);
          assert.ok(r.overrides.regionName);
          assert.ok(r.overrides.sort);
          assert.equal(r.query, "test query");
          assert.equal(r.overrides.consoleUid, undefined);
        });
      }
    }
  }

  const TOGGLES = ["novar", "noimages", "images"];
  for (const toggle of TOGGLES) {
    test(`cards,jp,alpha,${toggle}`, () => {
      const r = parseQuery(`cards,jp,alpha,${toggle}:pikachu`);
      assert.equal(r.overrides.broadCategory, "trading-cards");
      assert.equal(r.overrides.regionName, "japan");
      assert.equal(r.overrides.sort, "name");
      assert.ok(
        r.overrides.excludeVariants !== undefined ||
        r.overrides.showImages !== undefined
      );
    });
  }
});

// -- D. Category + region + console (triple combo) --

describe("category + region + console", () => {
  test("games,jp,ds resolves to JP DS", () => {
    const r = parseQuery("games,jp,ds:mario");
    assert.equal(r.overrides.broadCategory, "video-games");
    assert.equal(r.overrides.consoleUid, "G111");
    assert.equal(r.overrides.regionName, "");
  });

  test("lego,eu,ps2 resolves to PAL PS2", () => {
    const r = parseQuery("lego,eu,ps2:test");
    assert.equal(r.overrides.broadCategory, "lego-sets");
    assert.equal(r.overrides.consoleUid, "G63");
    assert.equal(r.overrides.regionName, "");
  });
});

// -- E. Token order independence --

describe("token order independence", () => {
  test("jp,ds,novar,alpha === alpha,novar,ds,jp", () => {
    const a = parseQuery("jp,ds,novar,alpha:test");
    const b = parseQuery("alpha,novar,ds,jp:test");
    assert.equal(a.overrides.consoleUid, b.overrides.consoleUid);
    assert.equal(a.overrides.regionName, b.overrides.regionName);
    assert.equal(a.overrides.sort, b.overrides.sort);
    assert.equal(a.overrides.excludeVariants, b.overrides.excludeVariants);
  });
});

// -- F. Conflict resolution (last keyword wins) --

describe("conflict resolution", () => {
  test("jp,eu -> last region (pal)", () => {
    assert.equal(parseQuery("jp,eu:t").overrides.regionName, "pal");
  });
  test("eu,jp -> last region (japan)", () => {
    assert.equal(parseQuery("eu,jp:t").overrides.regionName, "japan");
  });
  test("games,cards -> last category", () => {
    assert.equal(parseQuery("games,cards:t").overrides.broadCategory, "trading-cards");
  });
  test("cards,games -> last category", () => {
    assert.equal(parseQuery("cards,games:t").overrides.broadCategory, "video-games");
  });
  test("alpha,expensive -> last sort", () => {
    assert.equal(parseQuery("alpha,expensive:t").overrides.sort, "price-highest");
  });
  test("ds,ps2 -> last console (G7)", () => {
    assert.equal(parseQuery("ds,ps2:t").overrides.consoleUid, "G7");
  });
  test("ps2,ds -> last console (G5)", () => {
    assert.equal(parseQuery("ps2,ds:t").overrides.consoleUid, "G5");
  });

  test("eu,ds,jp -> jp wins, console G111", () => {
    const r = parseQuery("eu,ds,jp:test");
    assert.equal(r.overrides.consoleUid, "G111");
  });
  test("jp,ds,eu -> eu wins, console G78", () => {
    const r = parseQuery("jp,ds,eu:test");
    assert.equal(r.overrides.consoleUid, "G78");
  });
});

// -- G. Raw mode --

describe("raw mode", () => {
  test("raw:zelda sets raw=true, no overrides", () => {
    const r = parseQuery("raw:zelda");
    assert.equal(r.raw, true);
    assert.equal(Object.keys(r.overrides).length, 0);
  });

  test("raw,jp,ds still captures overrides", () => {
    const r = parseQuery("raw,jp,ds:zelda");
    assert.equal(r.raw, true);
    assert.ok(r.overrides.consoleUid);
  });

  test("raw applied blanks stored settings", () => {
    const rawOnly = parseQuery("raw:zelda");
    const applied = applyOverrides(
      { ...DEFAULTS, broadCategory: "video-games", consoleUid: "G7", regionName: "ntsc" },
      rawOnly
    );
    assert.equal(applied.broadCategory, "");
    assert.equal(applied.consoleUid, "");
    assert.equal(applied.regionName, "");
    assert.equal(applied.sort, "popularity");
    assert.equal(applied.language, "");
  });
});

// -- H. applyOverrides preserves unrelated settings --

describe("applyOverrides integration", () => {
  const userHeavy = {
    ...DEFAULTS,
    broadCategory: "video-games",
    consoleUid: "G7",
    regionName: "ntsc",
    sort: "name",
    excludeVariants: true,
    showImages: false,
    language: "de",
    customUrlTemplate: "",
    openBehavior: "window",
    focusNew: false,
    trimSelection: true,
    maxSelectionLength: 100,
    menuTitle: 'Custom "%s"',
  };

  test("jp,ds overrides console+region, preserves rest", () => {
    const r = applyOverrides(userHeavy, parseQuery("jp,ds:zelda"));
    assert.equal(r.consoleUid, "G111");
    assert.equal(r.regionName, "");
    assert.equal(r.broadCategory, "video-games");
    assert.equal(r.sort, "name");
    assert.equal(r.excludeVariants, true);
    assert.equal(r.showImages, false);
    assert.equal(r.language, "de");
    assert.equal(r.openBehavior, "window");
    assert.equal(r.focusNew, false);
    assert.equal(r.trimSelection, true);
    assert.equal(r.maxSelectionLength, 100);
  });

  test("cards overrides category, preserves rest", () => {
    const r = applyOverrides(userHeavy, parseQuery("cards:pikachu"));
    assert.equal(r.broadCategory, "trading-cards");
    assert.equal(r.consoleUid, "G7");
    assert.equal(r.regionName, "ntsc");
  });

  test("funko,eu overrides category+region", () => {
    const r = applyOverrides(userHeavy, parseQuery("funko,eu:batman"));
    assert.equal(r.broadCategory, "funko-pops");
    assert.equal(r.regionName, "pal");
    assert.equal(r.consoleUid, "G7");
  });

  test("console filter overrides stale non-game category", () => {
    const comicsUser = { ...DEFAULTS, broadCategory: "comic-books" };
    const r = applyOverrides(comicsUser, parseQuery("ps2:god of war"));
    assert.equal(r.consoleUid, "G7");
    assert.equal(r.broadCategory, "video-games");
  });

  test("console+region overrides stale category", () => {
    const comicsUser = { ...DEFAULTS, broadCategory: "comic-books" };
    const r = applyOverrides(comicsUser, parseQuery("pal,ps2:god of war"));
    // regional resolution swaps to PAL PS2 and blanks regionName
    assert.ok(r.consoleUid, "consoleUid should be set");
    assert.equal(r.broadCategory, "video-games");
  });

  test("explicit category keyword wins over console-implied category", () => {
    const r = applyOverrides(userHeavy, parseQuery("cards:pikachu"));
    assert.equal(r.broadCategory, "trading-cards");
    assert.equal(r.consoleUid, "G7");
  });
});

// -- Delimiter edge cases --

describe("delimiter edge cases", () => {
  test("just colon", () => {
    const r = parseQuery(":");
    assert.equal(r.query, "");
    assert.equal(Object.keys(r.overrides).length, 0);
  });

  test("multiple colons keeps everything after first", () => {
    const r = parseQuery("ps2:god:of:war");
    assert.equal(r.query, "god:of:war");
  });

  test("commas + colon with empty filter", () => {
    const r = parseQuery(",,:zelda");
    assert.equal(r.query, "zelda");
    assert.equal(Object.keys(r.overrides).length, 0);
  });

  test("spaces in filter tokens", () => {
    const r = parseQuery(" ps2 , pal : zelda");
    assert.ok(r.overrides.consoleUid);
  });

  test("quoted input skips filter parsing", () => {
    const r = parseQuery(Q + "ps2:zelda" + Q);
    assert.equal(r.query, "ps2:zelda");
    assert.equal(r.raw, true);
  });

  test("unknown token falls back to full text", () => {
    const r = parseQuery("asdf:zelda");
    assert.equal(r.query, "asdf:zelda");
    assert.deepEqual(r.overrides, {});
  });
});

// -- Console alias edge cases --

describe("console aliases", () => {
  // every non-trivial abbreviation generated by generateAbbreviations,
  // plus the whitespace-collapsed form for multi-word names
  const ALIAS_TESTS = [
    // playstation family
    ["ps", "G6"],
    ["ps2", "G7"],
    ["ps3", "G12"],
    ["ps4", "G53"],
    ["ps5", "G7468"],
    ["psvita", "G43"],
    // nintendo
    ["snes", "G13"],
    ["n64", "G4"],
    ["nds", "G5"],
    ["ds", "G5"],
    ["3ds", "G39"],
    // gameboy
    ["gb", "G49"],
    ["gba", "G1"],
    ["gbc", "G2"],
    // xbox
    ["xbox360", "G10"],
    ["x360", "G10"],
    ["xone", "G54"],
    ["xseriesx", "G7585"],
    // sega-strip (with space and collapsed)
    ["genesis", "G15"],
    ["dreamcast", "G16"],
    ["saturn", "G14"],
    ["master system", "G29"],
    ["mastersystem", "G29"],
    ["game gear", "G20"],
    ["gamegear", "G20"],
    ["32x", "G50"],
    ["cd", "G23"],
    ["pico", "G136"],
  ];

  for (const [alias, expectedId] of ALIAS_TESTS) {
    test(`${alias} resolves to ${expectedId}`, () => {
      const r = parseQuery(`${alias}:test`);
      assert.equal(r.overrides.consoleUid, expectedId);
    });
  }
});

// -- No alias collisions --
// verify that generateAbbreviations never maps two different consoles
// to the same alias (first-write-wins is fine, but we want to know about it)

describe("alias collision check", () => {
  test("no two Americas consoles share an abbreviation", () => {
    const seen = Object.create(null);
    const americas = CONSOLES.filter(c => c.group === "Americas");
    const collisions = [];

    function generateAbbreviations(lower) {
      const abbrevs = [];
      if (lower.startsWith("playstation")) {
        const suffix = lower.replace("playstation", "").trim();
        abbrevs.push("ps" + suffix);
        if (suffix) abbrevs.push("ps" + suffix.replace(/\s/g, ""));
      }
      if (lower === "super nintendo") abbrevs.push("snes");
      if (lower === "nintendo 64") abbrevs.push("n64");
      if (lower === "nintendo ds") { abbrevs.push("nds", "ds"); }
      if (lower === "nintendo 3ds") { abbrevs.push("3ds"); }
      if (lower.startsWith("gameboy")) {
        const suffix = lower.replace("gameboy", "").trim();
        if (suffix) { abbrevs.push("gb" + suffix[0]); } else { abbrevs.push("gb"); }
      }
      if (lower.startsWith("xbox")) {
        const suffix = lower.replace("xbox", "").trim();
        if (suffix) {
          abbrevs.push("xbox" + suffix.replace(/\s/g, ""));
          abbrevs.push("x" + suffix.replace(/\s/g, ""));
        }
      }
      if (lower.startsWith("sega ")) {
        const stripped = lower.replace("sega ", "");
        abbrevs.push(stripped);
        abbrevs.push(stripped.replace(/\s+/g, ""));
      }
      abbrevs.push(lower.replace(/\s+/g, ""));
      return abbrevs;
    }

    for (const c of americas) {
      const lower = c.name.toLowerCase();
      const aliases = [lower, ...generateAbbreviations(lower)];
      for (const a of aliases) {
        if (seen[a] && seen[a] !== c.id) {
          collisions.push(`"${a}" -> ${seen[a]} AND ${c.id} (${c.name})`);
        }
        if (!seen[a]) seen[a] = c.id;
      }
    }

    assert.deepEqual(collisions, [], "alias collisions found");
  });
});

// -- Case insensitivity --

describe("case insensitivity", () => {
  for (const c of ["JP,DS", "Jp,Ds", "jP,dS", "JP,ds", "jp,DS"]) {
    test(`${c} -> G111`, () => {
      assert.equal(parseQuery(`${c}:test`).overrides.consoleUid, "G111");
    });
  }

  test("LEGO -> lego-sets", () => {
    assert.equal(parseQuery("LEGO:test").overrides.broadCategory, "lego-sets");
  });

  test("RAW -> raw mode", () => {
    assert.equal(parseQuery("RAW:test").raw, true);
  });
});

// -- Malformed / adversarial inputs --

describe("adversarial inputs", () => {
  test("unicode in filter falls back to full text", () => {
    const r = parseQuery("\u65E5\u672C\u8A9E:test");
    assert.equal(r.query, "\u65E5\u672C\u8A9E:test");
  });

  test("XSS in query is preserved literally", () => {
    const r = parseQuery("jp:hello<script>alert(1)</script>");
    assert.equal(r.query, "hello<script>alert(1)</script>");
    assert.equal(r.overrides.regionName, "japan");
  });

  test("colon in query after split", () => {
    const r = parseQuery("jp:time 12:30");
    assert.equal(r.query, "time 12:30");
    assert.equal(r.overrides.regionName, "japan");
  });

  test("__proto__ is unknown, falls back", () => {
    const r = parseQuery("__proto__:test");
    assert.equal(r.query, "__proto__:test");
  });

  test("constructor is unknown, falls back", () => {
    const r = parseQuery("constructor:test");
    assert.equal(r.query, "constructor:test");
  });

  test("whitespace-only filter treated as bare colon", () => {
    const r = parseQuery("   :test");
    assert.equal(Object.keys(r.overrides).length, 0);
    assert.equal(r.query, "test");
  });

  test("empty between commas still parses", () => {
    const r = parseQuery("jp,,ds:test");
    assert.equal(r.overrides.consoleUid, "G111");
  });
});

// -- Regional console cross-swap --

describe("regional console cross-swap", () => {
  const CROSS_TESTS = [
    ["jp,pal nintendo ds:t",     "G111", "PAL DS -> JP DS"],
    ["jp,pal playstation 2:t",   "G108", "PAL PS2 -> JP PS2"],
    ["jp,pal gamecube:t",        "G98",  "PAL GC -> JP GC"],
    ["eu,jp nintendo ds:t",      "G78",  "JP DS -> PAL DS"],
    ["eu,jp playstation 2:t",    "G63",  "JP PS2 -> PAL PS2"],
    ["eu,jp gamecube:t",         "G70",  "JP GC -> PAL GC"],
  ];

  for (const [input, expectedId, label] of CROSS_TESTS) {
    test(`${label} -> ${expectedId}`, () => {
      const r = parseQuery(input);
      assert.equal(r.overrides.consoleUid, expectedId);
      assert.equal(r.overrides.regionName, "");
    });
  }
});

// -- All regional consoles (exhaustive) --

describe("all regional consoles", () => {
  const REGION_PREFIX = { japan: "JP ", pal: "PAL " };
  const REGION_KW = { japan: "jp", pal: "eu" };

  for (const [region, prefix] of Object.entries(REGION_PREFIX)) {
    const kw = REGION_KW[region];
    const regionals = CONSOLES.filter(
      c => c.name.startsWith(prefix) && c.group !== "Magazines & misc"
    );

    for (const rc of regionals) {
      const baseName = rc.name.slice(prefix.length);
      const base = CONSOLES.find(c => c.name === baseName && c.group === "Americas");
      if (!base) continue;

      const token = baseName.toLowerCase();
      test(`${kw},${token} -> ${rc.id}`, () => {
        const r = parseQuery(`${kw},${token}:test`);
        assert.equal(r.overrides.consoleUid, rc.id);
        assert.equal(r.overrides.regionName, "");
      });
    }
  }
});

// -- Exhaustive Americas console name lookup --
// every Americas console name, lowercased, should resolve to its ID

describe("every Americas console resolves by name", () => {
  const americas = CONSOLES.filter(c => c.group === "Americas");
  for (const c of americas) {
    const token = c.name.toLowerCase();
    test(`"${token}" -> ${c.id}`, () => {
      const r = parseQuery(`${token}:test`);
      assert.equal(r.overrides.consoleUid, c.id);
    });
  }
});

// -- REGIONAL_NAME_OVERRIDES exhaustive --
// verify all 6 override entries swap correctly

describe("regional name overrides", () => {
  const OVERRIDE_TESTS = [
    // Genesis -> Mega Drive
    ["jp,genesis:test", "JP Sega Mega Drive"],
    ["eu,genesis:test", "PAL Sega Mega Drive"],
    // Sega CD -> Mega CD
    ["jp,sega cd:test", "JP Sega Mega CD"],
    ["eu,sega cd:test", "PAL Sega Mega CD"],
    // 32X -> Super 32X (JP), Mega Drive 32X (PAL)
    ["jp,sega 32x:test", "JP Super 32X"],
    ["eu,sega 32x:test", "PAL Mega Drive 32X"],
    // TurboGrafx-16 -> PC Engine (JP only)
    ["jp,turbografx-16:test", "JP PC Engine"],
    // TurboGrafx CD -> PC Engine CD (JP only)
    ["jp,turbografx cd:test", "JP PC Engine CD"],
    // Master System -> Mark III (JP only)
    ["jp,sega master system:test", "JP Sega Mark III"],
  ];

  for (const [input, expectedName] of OVERRIDE_TESTS) {
    const expected = CONSOLES.find(c => c.name === expectedName);
    test(`${input} -> ${expectedName} (${expected?.id})`, () => {
      const r = parseQuery(input);
      assert.equal(r.overrides.consoleUid, expected.id);
      assert.equal(r.overrides.regionName, "");
    });
  }
});

// -- Americas console without regional variant --
// region keyword + console with no regional entry: regionName stays

describe("console without regional variant keeps regionName", () => {
  // Atari 2600 has no JP or PAL variant in CONSOLES
  test("jp,atari 2600 -> keeps regionName=japan", () => {
    const base = CONSOLES.find(c => c.name === "Atari 2600");
    const r = parseQuery("jp,atari 2600:test");
    assert.equal(r.overrides.consoleUid, base.id);
    assert.equal(r.overrides.regionName, "japan");
  });
});

// -- Sega-strip abbreviations --

describe("sega-strip abbreviations", () => {
  const SEGA_TESTS = [
    ["genesis", "Sega Genesis"],
    ["dreamcast", "Sega Dreamcast"],
    ["saturn", "Sega Saturn"],
    ["mastersystem", "Sega Master System"],
    ["gamegear", "Sega Game Gear"],
    ["cd", "Sega CD"],
    ["32x", "Sega 32X"],
  ];

  for (const [alias, fullName] of SEGA_TESTS) {
    const expected = CONSOLES.find(c => c.name === fullName && c.group === "Americas");
    if (!expected) continue;
    test(`${alias} -> ${expected.id} (${fullName})`, () => {
      const r = parseQuery(`${alias}:test`);
      assert.equal(r.overrides.consoleUid, expected.id);
    });
  }
});

// -- Neo Geo whitespace-collapse abbreviations --

describe("neo geo abbreviations", () => {
  const NEO_TESTS = [
    ["neogeo", "Neo Geo"],
    ["neogeoaes", "Neo Geo AES"],
    ["neogeomvs", "Neo Geo MVS"],
    ["neogeocd", "Neo Geo CD"],
    ["neopocketcolor", "Neo Pocket Color"],
  ];

  for (const [alias, fullName] of NEO_TESTS) {
    const expected = CONSOLES.find(c => c.name === fullName && c.group === "Americas");
    if (!expected) continue;
    test(`${alias} -> ${expected.id} (${fullName})`, () => {
      const r = parseQuery(`${alias}:test`);
      assert.equal(r.overrides.consoleUid, expected.id);
    });
  }
});

// -- Fuzz: parseQuery never throws --

describe("fuzz - parseQuery never throws", () => {
  // deterministic pseudo-random strings
  const FUZZ_INPUTS = [
    "", " ", ":", "::", ":::", "a:b:c:d",
    ",,,,:test", "a".repeat(500) + ":x",
    "\x00\x01\x02:test", "\n\t\r:test",
    "jp,jp,jp,jp:test", "raw,raw,raw:test",
    "🎮:mario", "null:test", "undefined:test",
    "true:test", "false:test", "NaN:test",
    "0:test", "-1:test", "Infinity:test",
    String.fromCharCode(0xFFFF) + ":test",
    "a,".repeat(100) + ":test",
    " ".repeat(200) + ":" + " ".repeat(200),
    "jp,eu,jp,eu,games,toys,games:conflict",
  ];

  for (const input of FUZZ_INPUTS) {
    test(`does not throw: ${JSON.stringify(input).slice(0, 60)}`, () => {
      assert.doesNotThrow(() => parseQuery(input));
    });
  }
});

// -- Kitchen sink --

describe("manual aliases", () => {
  const CONSOLE_BY_ID = Object.fromEntries(CONSOLES.map(c => [c.id, c.name]));

  for (const [alias, expectedId] of Object.entries(MANUAL_ALIASES)) {
    test(`"${alias}" => ${CONSOLE_BY_ID[expectedId] || expectedId}`, () => {
      const r = parseQuery(`${alias}:test`);
      assert.equal(r.overrides.consoleUid, expectedId);
      assert.equal(r.query, "test");
    });
  }

  test("manual alias IDs all exist in CONSOLES", () => {
    const ids = new Set(CONSOLES.map(c => c.id));
    for (const [alias, id] of Object.entries(MANUAL_ALIASES)) {
      assert.ok(ids.has(id), `alias "${alias}" points to unknown ID "${id}"`);
    }
  });
});

describe("kitchen sink", () => {
  test("all override types at once", () => {
    const r = parseQuery("games,jp,ds,expensive,novar,noimages:final fantasy");
    assert.equal(r.overrides.broadCategory, "video-games");
    assert.equal(r.overrides.consoleUid, "G111");
    assert.equal(r.overrides.regionName, "");
    assert.equal(r.overrides.sort, "price-highest");
    assert.equal(r.overrides.excludeVariants, true);
    assert.equal(r.overrides.showImages, false);
    assert.equal(r.query, "final fantasy");
  });
});
