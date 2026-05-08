// Query parser with filter-delimiter syntax.
//
// Syntax: `filters:query` where filters are comma-separated keywords
// before the FIRST colon. Everything after the first `:` is the
// literal search query, untouched.
//
// Examples:
//   "latest,eu:resident evil"  → sort=newest, region=pal, q="resident evil"
//   "cards,jp:pikachu"         → category=trading-cards, region=japan, q="pikachu"
//   "ps2:god of war"           → console=G7, q="god of war"
//   "resident evil"            → no colon, entire string is the query
//   "raw:zelda"                → bypass all filters, q="zelda"
//
// Pure module — no DOM, no side effects.

import { CONSOLES } from "./consoles.js";

/**
 * @typedef {{ query: string, overrides: Record<string, string|boolean>, raw: boolean }} ParseResult
 */

/**
 * Static keyword → setting mapping.
 * Easily extended — just add rows.
 */
const KEYWORDS = Object.freeze({
  // ── Categories ──────────────────────────────────────────
  games:      { key: "broadCategory", value: "video-games" },
  videogames: { key: "broadCategory", value: "video-games" },
  cards:      { key: "broadCategory", value: "trading-cards" },
  pokemon:    { key: "broadCategory", value: "trading-cards" },
  tcg:        { key: "broadCategory", value: "trading-cards" },
  comics:     { key: "broadCategory", value: "comic-books" },
  funko:      { key: "broadCategory", value: "funko-pops" },
  pops:       { key: "broadCategory", value: "funko-pops" },
  coins:      { key: "broadCategory", value: "coins" },
  lego:       { key: "broadCategory", value: "lego-sets" },

  // ── Regions ─────────────────────────────────────────────
  pal:        { key: "regionName", value: "pal" },
  eu:         { key: "regionName", value: "pal" },
  europe:     { key: "regionName", value: "pal" },
  ntsc:       { key: "regionName", value: "ntsc" },
  us:         { key: "regionName", value: "ntsc" },
  usa:        { key: "regionName", value: "ntsc" },
  na:         { key: "regionName", value: "ntsc" },
  jp:         { key: "regionName", value: "japan" },
  japan:      { key: "regionName", value: "japan" },

  // ── Sort ────────────────────────────────────────────────
  latest:     { key: "sort", value: "name" },
  newest:     { key: "sort", value: "name" },
  popular:    { key: "sort", value: "popularity" },
  cheapest:   { key: "sort", value: "price-highest" },
  expensive:  { key: "sort", value: "price-highest" },
  rising:     { key: "sort", value: "change-dollar" },

  // ── Toggles ─────────────────────────────────────────────
  novar:      { key: "excludeVariants", value: true },
  novariants: { key: "excludeVariants", value: true },
  noimages:   { key: "showImages", value: false },
  images:     { key: "showImages", value: true },
});

/**
 * Build a console alias lookup from the CONSOLES array.
 * Maps lowercased short names to consoleUid values.
 * e.g. "playstation 2" → G7, "gameboy color" → G2, "ps2" → G7
 */
function buildConsoleAliases() {
  const map = {};
  for (const c of CONSOLES) {
    const lower = c.name.toLowerCase();
    map[lower] = c.id;

    // common abbreviation patterns
    const abbrevs = generateAbbreviations(lower, c.name);
    for (const a of abbrevs) {
      if (!map[a]) map[a] = c.id;
    }
  }
  return Object.freeze(map);
}

/**
 * Generate common abbreviations for console names.
 * @param {string} lower - lowercased name
 * @param {string} _original - original cased name (unused for now)
 * @returns {string[]}
 */
function generateAbbreviations(lower) {
  const abbrevs = [];

  // "playstation 2" → "ps2"
  if (lower.startsWith("playstation")) {
    const suffix = lower.replace("playstation", "").trim();
    abbrevs.push("ps" + suffix);
    if (suffix) abbrevs.push("ps" + suffix.replace(/\s/g, ""));
  }
  // "super nintendo" → "snes"
  if (lower === "super nintendo") abbrevs.push("snes");
  // "nintendo 64" → "n64"
  if (lower === "nintendo 64") abbrevs.push("n64");
  // "nintendo ds" → "nds", "ds"
  if (lower === "nintendo ds") { abbrevs.push("nds", "ds"); }
  if (lower === "nintendo 3ds") { abbrevs.push("3ds"); }
  // "game boy" variants
  if (lower.startsWith("gameboy")) {
    const suffix = lower.replace("gameboy", "").trim();
    abbrevs.push("gb" + (suffix ? suffix[0] : ""));
  }
  // "xbox 360" → "x360"
  if (lower.startsWith("xbox")) {
    const suffix = lower.replace("xbox", "").trim();
    abbrevs.push("xbox" + suffix.replace(/\s/g, ""));
    if (suffix) abbrevs.push("x" + suffix.replace(/\s/g, ""));
  }
  // "sega genesis" → "genesis"
  if (lower.startsWith("sega ")) {
    abbrevs.push(lower.replace("sega ", ""));
  }
  // "neo geo" → "neogeo"
  abbrevs.push(lower.replace(/\s+/g, ""));

  return abbrevs;
}

const CONSOLE_ALIASES = buildConsoleAliases();

/**
 * Parse a raw query string using the `filters:query` delimiter syntax.
 *
 * @param {string} input - raw input from popup, omnibox, or selection
 * @returns {ParseResult}
 */
export function parseQuery(input) {
  const text = (input || "").trim();
  const overrides = {};
  let raw = false;
  let query = text;

  // look for the first colon as delimiter
  const colonIdx = text.indexOf(":");
  if (colonIdx === -1) {
    // no colon — entire string is the query, no parsing
    return { query: text, overrides, raw };
  }

  const filterPart = text.slice(0, colonIdx).trim().toLowerCase();
  query = text.slice(colonIdx + 1).trim();

  // split filter part by commas
  const tokens = filterPart.split(",").map(t => t.trim()).filter(Boolean);

  for (const token of tokens) {
    if (token === "raw") {
      raw = true;
      continue;
    }

    // check static keywords first
    const kw = KEYWORDS[token];
    if (kw) {
      overrides[kw.key] = kw.value;
      continue;
    }

    // check console aliases
    const consoleId = CONSOLE_ALIASES[token];
    if (consoleId) {
      overrides.consoleUid = consoleId;
      continue;
    }

    // unknown token — put the whole original text back as query
    // (don't silently drop user's input)
    return { query: text, overrides: {}, raw: false };
  }

  return { query, overrides, raw };
}

/**
 * Merge parsed overrides into a settings object.
 * When `raw` is true, filter-related settings are blanked out.
 *
 * @param {object} settings - full settings object (DEFAULTS + stored)
 * @param {ParseResult} parsed - output of parseQuery
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
