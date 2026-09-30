// Robustness tests for lib/query-parser.js
//
// Three kinds of test that the hand-written suite doesn't cover:
//   1. Property tests: generate thousands of inputs from a grammar and
//      check invariants (seeded, so failures reproduce: SEED=123 node --test ...)
//   2. Metamorphic tests: change whitespace/case, result must not change
//   3. Pipeline invariants: stored settings x inline filters, checked
//      against an independent oracle of what a correct URL looks like
//
// Tests marked `todo` are open policy decisions, not bugs.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseQuery, applyOverrides } from "../src/lib/query-parser.js";
import { CONSOLES } from "../src/lib/consoles.js";
import { MANUAL_ALIASES } from "../src/lib/console-aliases.js";
import { buildSearchUrl, normalizeSelection } from "../src/lib/url-template.js";
import { DEFAULTS } from "../src/lib/defaults.js";

// -- generators --

const SEED = Number(process.env.SEED ?? 12345);
const RUNS = Number(process.env.RUNS ?? 1500);

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const pickN = (r, arr, min, max) =>
  Array.from({ length: min + Math.floor(r() * (max - min + 1)) }, () => pick(r, arr));

function forAll(name, gen, check) {
  test(`${name} (${RUNS} runs, seed ${SEED})`, () => {
    const r = mulberry32(SEED);
    for (let i = 0; i < RUNS; i++) {
      const sample = gen(r);
      try {
        check(sample);
      } catch (e) {
        e.message = `run ${i}, sample ${JSON.stringify(sample)}\n${e.message}`;
        throw e;
      }
    }
  });
}

const CATEGORY_KW = ["games", "cards", "funko", "lego", "comics", "coins"];
// TCG keywords keep the game name in the query. Independent copy of the table.
const TCG_TERMS = {
  pokemon: "pokemon", pkmn: "pokemon", poke: "pokemon", mtg: "magic", magic: "magic",
  yugioh: "yugioh", ygo: "yugioh", lorcana: "lorcana", onepiece: "one piece",
  digimon: "digimon", dragonball: "dragon ball", dbz: "dragon ball",
};
const TCG_KW = Object.keys(TCG_TERMS);
// what the query should be after parsing: term of the LAST category keyword
function expectedQuery(tokens, q) {
  const q2 = q.trim();
  let term = "";
  for (const t of tokens) {
    if (t in TCG_TERMS) term = TCG_TERMS[t];
    else if (CATEGORY_KW.includes(t) || t === "cards" || t === "tcg") term = "";
  }
  if (!term) return q2;
  if (q2.toLowerCase().split(/\s+/).includes(term.split(" ")[0])) return q2;
  return q2 ? term + " " + q2 : term;
}
const REGION_KW   = ["pal", "eu", "jp", "japan", "us", "ntsc"];
const SORT_KW     = ["alpha", "expensive", "cheap", "latest", "novar", "noimages"];
const AMERICAS    = CONSOLES.filter(c => c.group === "Americas");
const CONSOLE_KW  = [
  ...Object.keys(MANUAL_ALIASES),
  ...AMERICAS.map(c => c.name.toLowerCase()),
  "ps2", "ds", "gba", "snes", "n64", "vita",
];
const VALID = [...CATEGORY_KW, ...TCG_KW, ...REGION_KW, ...SORT_KW, ...CONSOLE_KW];
const JUNK  = ["typo", "foo", "xyz123", "ps9", "pall", "switchh", "gamess"];
const QUERIES = [
  "zelda", "god of war", "time 12:30", "a:b:c", "ps2:zelda", "pal:zelda",
  "novar", "Pokemon: Red", "x, y", "  spaced  ", "", "raw", "jp,ds", "9:00",
];
const WORDS = ["zelda", "god", "of", "war", "mario", "kart", "8", "pal", "ps2", "jp", "a,b"];

const randomCase = (r, s) => [...s].map(ch => (r() < 0.5 ? ch.toUpperCase() : ch)).join("");

// -- 1. property tests on parseQuery --

describe("parseQuery properties", () => {
  forAll(
    "all-valid prefix: query is exactly the text after the first colon",
    r => ({
      tokens: pickN(r, VALID, 1, 4),
      sep: pick(r, [",", " , ", ", "]),
      q: pick(r, QUERIES),
    }),
    ({ tokens, sep, q }) => {
      const res = parseQuery(tokens.join(sep) + ":" + q);
      assert.equal(res.query, expectedQuery(tokens, q));
      assert.equal(res.raw, false);
    }
  );

  forAll(
    "valid + unknown tokens: no filter text leaks into the query",
    r => {
      const tokens = [...pickN(r, VALID, 1, 2), ...pickN(r, JUNK, 1, 2)]
        .sort(() => r() - 0.5);
      return { tokens, q: pick(r, QUERIES) };
    },
    ({ tokens, q }) => {
      const res = parseQuery(tokens.join(",") + ":" + q);
      assert.equal(res.query, expectedQuery(tokens, q));
    }
  );

  forAll(
    "prefix with only unknown tokens: input passes through untouched",
    r => ({ tokens: pickN(r, JUNK, 1, 3), q: pick(r, QUERIES) }),
    ({ tokens, q }) => {
      const input = tokens.join(",") + ":" + q;
      const res = parseQuery(input);
      assert.equal(res.query, input.trim());
      assert.deepEqual(res.overrides, {});
      assert.equal(res.raw, false);
    }
  );

  forAll(
    "no colon: query is the trimmed input, nothing is parsed",
    r => pickN(r, [...WORDS, ...VALID, "  "], 1, 6).join(pick(r, [" ", ",", " , "])),
    input => {
      const res = parseQuery(input);
      assert.equal(res.query, input.trim());
      assert.deepEqual(res.overrides, {});
    }
  );

  forAll(
    "raw token is honoured whatever else is in the prefix",
    r => ({
      tokens: [...pickN(r, [...VALID, ...JUNK], 0, 3), "raw"].sort(() => r() - 0.5),
      q: pick(r, QUERIES),
    }),
    ({ tokens, q }) => {
      const res = parseQuery(tokens.join(",") + ":" + q);
      assert.equal(res.raw, true);
      assert.equal(res.query, expectedQuery(tokens, q));
    }
  );
});

// -- 2. metamorphic: whitespace and case must not change the result --

describe("parseQuery metamorphic", () => {
  forAll(
    "extra whitespace and random casing in the prefix change nothing",
    r => ({ tokens: pickN(r, VALID, 1, 4), q: pick(r, QUERIES), seed: r() }),
    ({ tokens, q, seed }) => {
      const rr = mulberry32(Math.floor(seed * 1e9));
      const plain = parseQuery(tokens.join(",") + ":" + q);
      const noisy = parseQuery(
        tokens.map(t => "  " + randomCase(rr, t) + " ").join(",") + " :  " + q
      );
      assert.deepEqual(noisy, plain);
    }
  );

  forAll(
    "repeating a token does not change the result",
    r => ({ tokens: pickN(r, VALID, 1, 3), q: pick(r, QUERIES) }),
    ({ tokens, q }) => {
      const once  = parseQuery(tokens.join(",") + ":" + q);
      const twice = parseQuery([...tokens, ...tokens].join(",") + ":" + q);
      assert.deepEqual(twice, once);
    }
  );
});

// -- 3. pipeline invariants: stored settings x inline filters --

// Independent oracle. Deliberately does not import the parser's own tables.
const PAIRS = {
  "Sega Genesis":       { JP: "JP Sega Mega Drive", PAL: "PAL Sega Mega Drive" },
  "Sega CD":            { JP: "JP Sega Mega CD",    PAL: "PAL Sega Mega CD" },
  "Sega 32X":           { JP: "JP Super 32X",       PAL: "PAL Mega Drive 32X" },
  "TurboGrafx-16":      { JP: "JP PC Engine" },
  "TurboGrafx CD":      { JP: "JP PC Engine CD" },
  "Sega Master System": { JP: "JP Sega Mark III" },
};
const REGION_GROUP  = { pal: "PAL", japan: "Japan" };
const GROUP_PREFIX  = { PAL: "PAL ", Japan: "JP " };
const PAIR_KEY      = { PAL: "PAL", Japan: "JP" };
const byId = Object.fromEntries(CONSOLES.map(c => [c.id, c]));

function americasNameOf(c) {
  if (c.group === "Americas") return c.name;
  const key = PAIR_KEY[c.group];
  for (const [am, m] of Object.entries(PAIRS)) if (m[key] === c.name) return am;
  return c.name.slice(GROUP_PREFIX[c.group].length);
}
function correctVariant(c, regionName) {
  const group = REGION_GROUP[regionName];
  if (!group || !["Americas", "PAL", "Japan"].includes(c.group)) return null;
  const am = americasNameOf(c);
  const want = PAIRS[am]?.[PAIR_KEY[group]] ?? GROUP_PREFIX[group] + am;
  return CONSOLES.find(x => x.name === want && x.group === group) ?? null;
}

const STORED_CATEGORIES = ["", "video-games", "funko-pops", "trading-cards", "comic-books"];

function genPipeline(r) {
  const stored = {
    broadCategory: pick(r, STORED_CATEGORIES),
    consoleUid: r() < 0.3 ? "" : pick(r, CONSOLES).id,
    regionName: pick(r, ["", "pal", "japan", "ntsc"]),
    sort: "popularity",
  };
  const inline = [];
  if (r() < 0.4) inline.push(pick(r, CATEGORY_KW));
  if (r() < 0.4) inline.push(pick(r, REGION_KW));
  if (r() < 0.4) inline.push(pick(r, CONSOLE_KW));
  const input = inline.length ? inline.join(",") + ":zelda" : "zelda";
  return { stored, input, inlineHasConsole: inline.some(t => CONSOLE_KW.includes(t)) };
}

describe("pipeline invariants (stored settings x inline filters)", () => {
  forAll(
    "effective settings never pair a console with the wrong region variant",
    genPipeline,
    ({ stored, input }) => {
      const eff = applyOverrides(stored, parseQuery(input));
      const c = byId[eff.consoleUid];
      const gamesish = eff.broadCategory === "" || eff.broadCategory === "video-games";
      if (!c || !gamesish || !REGION_GROUP[eff.regionName]) return;
      const correct = correctVariant(c, eff.regionName);
      if (correct && correct.id !== c.id) {
        assert.fail(
          `region ${eff.regionName} with ${c.name} (${c.id}); expected ${correct.name} (${correct.id})`
        );
      }
    }
  );

  forAll(
    "non-game category leaves stored console and region alone",
    genPipeline,
    ({ stored, input, inlineHasConsole }) => {
      const parsed = parseQuery(input);
      const eff = applyOverrides(stored, parsed);
      if (inlineHasConsole) return;
      if (eff.broadCategory === "" || eff.broadCategory === "video-games") return;
      assert.equal(eff.consoleUid, stored.consoleUid);
      assert.equal(eff.regionName, parsed.overrides.regionName ?? stored.regionName);
    }
  );

  forAll(
    "applyOverrides never mutates its inputs",
    genPipeline,
    ({ stored, input }) => {
      const before = JSON.stringify(stored);
      const parsed = parseQuery(input);
      const pBefore = JSON.stringify(parsed);
      applyOverrides(stored, parsed);
      assert.equal(JSON.stringify(stored), before);
      assert.equal(JSON.stringify(parsed), pBefore);
    }
  );
});

// -- 4. regressions from real bugs --

describe("regressions", () => {
  test("stored PAL + inline 'vita' resolves to PAL Vita (G101)", () => {
    const eff = applyOverrides(
      { regionName: "pal", consoleUid: "", broadCategory: "", sort: "popularity" },
      parseQuery("vita:zelda")
    );
    assert.equal(eff.consoleUid, "G101");
  });

  test("stored JP + stored Americas Vita, no filters, resolves to JP Vita (G106)", () => {
    const eff = applyOverrides(
      { regionName: "japan", consoleUid: "G43", broadCategory: "video-games", sort: "popularity" },
      parseQuery("zelda")
    );
    assert.equal(eff.consoleUid, "G106");
  });

  test("funko,eu keeps region=pal even with a stored console", () => {
    const eff = applyOverrides(
      { regionName: "ntsc", consoleUid: "G7", broadCategory: "video-games", sort: "popularity" },
      parseQuery("funko,eu:batman")
    );
    assert.equal(eff.broadCategory, "funko-pops");
    assert.equal(eff.regionName, "pal");
  });

  test("ps2,typo:zelda searches 'zelda', not 'ps2,typo:zelda'", () => {
    const r = parseQuery("ps2,typo:zelda");
    assert.equal(r.query, "zelda");
    assert.equal(r.overrides.consoleUid, "G7");
  });

  test("raw,typo:zelda keeps raw mode", () => {
    const r = parseQuery("raw,typo:zelda");
    assert.equal(r.raw, true);
    assert.equal(r.query, "zelda");
  });

  test("'ps2 pal:zelda' (space instead of comma) is understood", () => {
    const r = parseQuery("ps2 pal:zelda");
    assert.equal(r.query, "zelda");
    assert.equal(r.overrides.consoleUid, "G63");
  });
});

// -- 5. decided syntax --
//   pokemon:red   => filter, category trading-cards, query "pokemon red"
//   :Pokemon:red  => bare colon = literal, nothing parsed, query "Pokemon:red"
//   ps2:pal:zelda => only the FIRST colon delimits, query "pal:zelda"

describe("colon syntax", () => {
  test("pokemon:red is a category filter and keeps the game name in the query", () => {
    const r = parseQuery("pokemon:red");
    assert.equal(r.overrides.broadCategory, "trading-cards");
    assert.equal(r.query, "pokemon red");
    assert.equal(r.raw, false);
  });
  test("space after the colon changes nothing: 'Pokemon: Red Version'", () => {
    const r = parseQuery("Pokemon: Red Version");
    assert.equal(r.overrides.broadCategory, "trading-cards");
    assert.equal(r.query, "pokemon Red Version");
  });
  test(":Pokemon:red searches the literal text with no filters", () => {
    const r = parseQuery(":Pokemon:red");
    assert.equal(r.raw, true);
    assert.equal(r.query, "Pokemon:red");
    assert.deepEqual(r.overrides, {});
  });
  test("only the first colon delimits: ps2:pal:zelda", () => {
    const r = parseQuery("ps2:pal:zelda");
    assert.equal(r.overrides.consoleUid, "G7");
    assert.equal(r.query, "pal:zelda");
  });
  test("term is not doubled when the query already has it", () => {
    assert.equal(parseQuery("pokemon:pokemon red").query, "pokemon red");
    assert.equal(parseQuery("pokemon:Pokemon Red").query, "Pokemon Red");
  });
  test("empty query after a TCG keyword searches the game name", () => {
    assert.equal(parseQuery("mtg:").query, "magic");
  });
  test("last category keyword wins, term included", () => {
    assert.equal(parseQuery("pokemon,cards:x").query, "x");
    assert.equal(parseQuery("cards,pokemon:x").query, "pokemon x");
    assert.equal(parseQuery("pokemon,mtg:x").query, "magic x");
  });
  test("curly-quoted input is treated like straight-quoted (raw)", () => {
    assert.equal(parseQuery("\u201cps2:zelda\u201d").raw, false);
  });
});

// -- 5b. URL level: what PriceCharting is actually sent --

function url(input, stored = DEFAULTS) {
  const parsed = parseQuery(input);
  const eff = applyOverrides(stored, parsed);
  return buildSearchUrl(normalizeSelection(parsed.query, eff), eff);
}
const params = u => Object.fromEntries(new URL(u).searchParams);

describe("URL sent to PriceCharting", () => {
  test("pokemon:red with a stored PAL region: no region-name, query has the game", () => {
    const p = params(url("pokemon:red", { ...DEFAULTS, regionName: "pal" }));
    assert.equal(p["broad-category"], "trading-cards");
    assert.equal(p["region-name"], undefined);
    assert.equal(p.q, "pokemon red");
  });

  forAll(
    "non-game categories never send console-uid or region-name",
    r => ({
      stored: {
        ...DEFAULTS,
        broadCategory: pick(r, ["", "video-games", "trading-cards", "funko-pops", "lego-sets", "comic-books", "coins"]),
        consoleUid: r() < 0.5 ? "" : pick(r, CONSOLES).id,
        regionName: pick(r, ["", "pal", "japan", "ntsc"]),
      },
      input: pick(r, ["zelda", "pokemon:red", "lego,eu:x", "funko,jp:x", "cards,ds:x", "ps2:x", "vita,pal:x", "coins:x", "mtg,jp:x"]),
    }),
    ({ stored, input }) => {
      const p = params(url(input, stored));
      const cat = p["broad-category"] ?? "";
      if (cat !== "" && cat !== "video-games") {
        assert.equal(p["console-uid"], undefined, `console-uid sent with ${cat}`);
        assert.equal(p["region-name"], undefined, `region-name sent with ${cat}`);
      }
    }
  );

  forAll(
    "a console-uid that is sent always belongs to the region that is sent",
    genPipeline,
    ({ stored, input }) => {
      const p = params(url(input, { ...DEFAULTS, ...stored }));
      const c = byId[p["console-uid"]];
      if (!c || !REGION_GROUP[p["region-name"]]) return;
      const fix = correctVariant(c, p["region-name"]);
      assert.ok(!fix || fix.id === c.id, `${c.name} sent with region ${p["region-name"]}`);
    }
  );

  forAll(
    "q is never empty and never contains filter syntax that was parsed",
    r => ({ tokens: pickN(r, [...TCG_KW, ...REGION_KW, ...SORT_KW], 1, 3), q: pick(r, ["red", "black lotus", "x"]) }),
    ({ tokens, q }) => {
      const p = params(url(tokens.join(",") + ":" + q));
      assert.ok(p.q && p.q.length > 0);
      assert.ok(!p.q.includes(":"), `colon in q: ${p.q}`);
      for (const t of tokens) {
        if (!(t in TCG_TERMS)) assert.ok(!p.q.split(" ").includes(t), `keyword ${t} leaked into q: ${p.q}`);
      }
    }
  );
});

// -- 6. data integrity the resolver depends on --

describe("resolver data assumptions", () => {
  test("every manual alias points at an Americas console", () => {
    // resolveRegionalConsole only knows how to remap from these
    for (const [alias, id] of Object.entries(MANUAL_ALIASES)) {
      assert.equal(byId[id]?.group, "Americas", `alias "${alias}" -> ${id}`);
    }
  });
});
