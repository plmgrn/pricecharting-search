// Query parser with filter-delimiter syntax.
//
// Syntax: `filters:query` where filters are comma-separated keywords
// before the FIRST colon. Everything after the first `:` is the
// literal search query, untouched.
//
// Examples:
//   "latest,eu:resident evil  => sort=newest, region=pal, q="resident evil"
//   "cards,jp:pikachu"         => category=trading-cards, region=japan, q="pikachu"
//   "ps2:god of war"           => console=G7, q="god of war"
//   "resident evil"            => no colon, entire string is the query
//   "raw:zelda"                => bypass all filters, q="zelda"
//
// Pure module, no DOM, no side effects.

import { CONSOLES } from "./consoles.js";
import { MANUAL_ALIASES } from "./console-aliases.js";

/**
 * @typedef {{ query: string, overrides: Record<string, string|boolean>, raw: boolean }} ParseResult
 */

/**
 * Static keyword => setting mapping.
 * Easily extended, just add rows.
 */
//TODO: broaden keyword synonyms list whenever encountering some new alias to be used
const KEYWORDS = Object.freeze({
  // -- Categories --
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

  // -- Regions --
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

  // -- Sort --
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

  // -- Toggles --
  novar:      { key: "excludeVariants", value: true },
  novariants: { key: "excludeVariants", value: true },
  noimages:   { key: "showImages", value: false },
  images:     { key: "showImages", value: true },
});

// Curated nickname aliases live in console-aliases.js.
// They're merged after auto-generated abbreviations so they win ties.

/**
 * Build a console alias lookup from the CONSOLES array.
 * Maps lowercased short names to consoleUid values.
 * e.g. "playstation 2" => G7, "gameboy color" => G2, "ps2" => G7
 */
function buildConsoleAliases() {
  const map = Object.create(null);
  for (const c of CONSOLES) {
    const lower = c.name.toLowerCase();
    map[lower] = c.id;

    // common abbreviation patterns
    const abbrevs = generateAbbreviations(lower);
    for (const a of abbrevs) {
      if (!map[a]) map[a] = c.id;
    }
  }

  // curated aliases override auto-generated ones
  for (const [alias, id] of Object.entries(MANUAL_ALIASES)) {
    map[alias] = id;
  }

  return Object.freeze(map);
}

/**
 * Generate common abbreviations for console names.
 * @param {string} lower lowercased console name
 * @returns {string[]}
 */
function generateAbbreviations(lower) {
  const abbrevs = [];

  // "playstation 2" => "ps2"
  if (lower.startsWith("playstation")) {
    const suffix = lower.replace("playstation", "").trim();
    abbrevs.push("ps" + suffix);
    if (suffix) abbrevs.push("ps" + suffix.replace(/\s/g, ""));
  }
  // "super nintendo" => "snes"
  if (lower === "super nintendo") abbrevs.push("snes");
  // "nintendo 64" => "n64"
  if (lower === "nintendo 64") abbrevs.push("n64");
  // "nintendo ds" => "nds", "ds"
  if (lower === "nintendo ds") { abbrevs.push("nds", "ds"); }
  if (lower === "nintendo 3ds") { abbrevs.push("3ds"); }
  // "game boy" variants, bare "gb" intentionally maps to the first
  // matching CONSOLES entry (Americas GameBoy).
  if (lower.startsWith("gameboy")) {
    const suffix = lower.replace("gameboy", "").trim();
    if (suffix) {
      abbrevs.push("gb" + suffix[0]);
    } else {
      abbrevs.push("gb");
    }
  }
  // "xbox 360" => "x360", "xbox360"
  if (lower.startsWith("xbox")) {
    const suffix = lower.replace("xbox", "").trim();
    if (suffix) {
      abbrevs.push("xbox" + suffix.replace(/\s/g, ""));
      abbrevs.push("x" + suffix.replace(/\s/g, ""));
    }
  }
  // "sega genesis" => "genesis", "sega master system" => "mastersystem"
  if (lower.startsWith("sega ")) {
    const stripped = lower.replace("sega ", "");
    abbrevs.push(stripped);
    abbrevs.push(stripped.replace(/\s+/g, ""));
  }
  // "neo geo" => "neogeo"
  abbrevs.push(lower.replace(/\s+/g, ""));

  return abbrevs;
}

const CONSOLE_ALIASES = buildConsoleAliases();

/**
 * Region prefix used in CONSOLES names, keyed by regionName value.
 */
const REGION_PREFIX = Object.freeze({
  japan: "JP ",
  pal:   "PAL ",
});

/**
 * Americas names that differ in other regions.
 * Maps "Americas name" => { japan?: "JP name", pal?: "PAL name" }.
 * Only entries where the regional name != prefix + Americas name.
 */
const REGIONAL_NAME_OVERRIDES = Object.freeze({
  "Sega Genesis":       { japan: "JP Sega Mega Drive",  pal: "PAL Sega Mega Drive" },
  "Sega CD":            { japan: "JP Sega Mega CD",     pal: "PAL Sega Mega CD" },
  "Sega 32X":           { japan: "JP Super 32X",        pal: "PAL Mega Drive 32X" },
  "TurboGrafx-16":      { japan: "JP PC Engine" },
  "TurboGrafx CD":      { japan: "JP PC Engine CD" },
  "Sega Master System": { japan: "JP Sega Mark III" },
});

/**
 * Map CONSOLES group => regionName value for detecting
 * when a console is already region-specific.
 */
const REGION_FOR_GROUP = Object.freeze({
  "Japan": "japan",
  "PAL":   "pal",
});

/**
 * When a region + console are both specified, swap the generic
 * console-uid for the region-specific variant if one exists.
 * e.g. region=japan + consoleUid=G5 (Nintendo DS) => G111 (JP Nintendo DS).
 *
 * Also handles edge cases:
 * - Console already belongs to the requested region, just drop regionName.
 * - Console belongs to a *different* region, swap to correct variant
 *   by stripping the existing prefix first.
 */
function resolveRegionalConsole(overrides) {
  const prefix = REGION_PREFIX[overrides.regionName];
  if (!prefix || !overrides.consoleUid) return;

  const base = CONSOLES.find(c => c.id === overrides.consoleUid);
  if (!base) return;

  const region = overrides.regionName;
  const baseRegion = REGION_FOR_GROUP[base.group];

  // console is already region-specific
  if (baseRegion) {
    if (baseRegion === region) {
      // same region, blank it so user's stored region doesn't leak
      overrides.regionName = "";
      return;
    }
    // different region, strip existing prefix to get the bare name,
    // then resolve from there
    const existingPrefix = REGION_PREFIX[baseRegion];
    if (existingPrefix && base.name.startsWith(existingPrefix)) {
      const bareName = base.name.slice(existingPrefix.length);
      // try override table, then direct prefix
      const overrideLookup = Object.entries(REGIONAL_NAME_OVERRIDES)
        .find(([, map]) => map[baseRegion] === base.name);
      const americasName = overrideLookup?.[0] || bareName;
      const overrideName = REGIONAL_NAME_OVERRIDES[americasName]?.[region];
      const expectedName = overrideName || prefix + bareName;

      const target = CONSOLES.find(c => c.name === expectedName);
      if (target) {
        overrides.consoleUid = target.id;
        overrides.regionName = "";
      }
      return;
    }
  }

  // Americas console, check explicit name overrides first, then prefix
  const overrideName = REGIONAL_NAME_OVERRIDES[base.name]?.[region];
  const expectedName = overrideName || prefix + base.name;

  const target = CONSOLES.find(c => c.name === expectedName);
  if (target) {
    overrides.consoleUid = target.id;
    overrides.regionName = "";
  }
}

/**
 * Parse a raw query string using the `filters:query` delimiter syntax.
 *
 * @param {string} input is the raw text from the popup, omnibox, or context menu selection
 * @returns {ParseResult}
 */
export function parseQuery(input) {
  const text = String(input ?? "").trim();
  const overrides = {};
  let raw = false;
  let query = text;

  // quoted input, strip outer quotes and skip filter parsing
  if (text.length >= 2 && text[0] === '"' && text[text.length - 1] === '"') {
    return { query: text.slice(1, -1), overrides, raw: true };
  }

  // look for the first colon as delimiter
  const colonIdx = text.indexOf(":");
  if (colonIdx === -1) {
    // no colon, entire string is the query
    return { query: text, overrides, raw };
  }

  const filterPart = text.slice(0, colonIdx).trim().toLowerCase();
  query = text.slice(colonIdx + 1).trim();

  // split filter part by commas
  const tokens = filterPart.split(",").map(t => t.trim()).filter(Boolean);

  // bare colon with no keywords, treat as raw
  if (tokens.length === 0) {
    return { query, overrides, raw: true };
  }

  // go through all comma-delimited keywords from input (the xx and yy from xx,yy:string)
  for (const token of tokens) {
    if (token === "raw") {
      raw = true;
      continue;
    }

    // check static keywords first
    if (Object.hasOwn(KEYWORDS, token)) {
      const kw = KEYWORDS[token];
      overrides[kw.key] = kw.value;
      continue;
    }

    // check console aliases
    if (Object.hasOwn(CONSOLE_ALIASES, token)) {
      const consoleId = CONSOLE_ALIASES[token];
      overrides.consoleUid = consoleId;
      continue;
    }

    // unknown token, put the whole original text back as query
    // (don't silently drop user's input)
    return { query: text, overrides: {}, raw: false };
  }

  // a console filter implies video games -- clear any saved category
  // that would conflict (e.g. user default is "comics")
  if (overrides.consoleUid && !Object.hasOwn(overrides, "broadCategory")) {
    overrides.broadCategory = "video-games";
  }

  // swap to region-specific console-uid when both are present
  resolveRegionalConsole(overrides);

  return { query, overrides, raw };
}

/**
 * Merge parsed overrides into a settings object.
 * When `raw` is true, filter-related settings are blanked out.
 *
 * @param {object} settings full settings object (DEFAULTS merged with stored values)
 * @param {ParseResult} parsed result from parseQuery
 * @returns {object} new settings object with overrides applied
 */
export function applyOverrides(settings, parsed) {
  if (parsed.raw) {
    return {
      ...settings,
      broadCategory: "",
      consoleUid: "",
      regionName: "",
      sort: "popularity",
      excludeVariants: false,
      showImages: true,
      language: "",
      customUrlTemplate: "",
      ...parsed.overrides,
    };
  }

  return { ...settings, ...parsed.overrides };
}
