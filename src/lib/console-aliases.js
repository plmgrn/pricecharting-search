// Manual console alias mappings for nicknames and alternative names
// that generateAbbreviations() in query-parser.js can't derive.
//
// Add entries here when users report "I typed X but it didn't find
// the console." Keep generateAbbreviations for pattern-based stuff,
// use this map for one-offs and cultural nicknames.

/**
 * Lowercase alias string => CONSOLES id.
 * Merged into the alias map *after* auto-generated entries,
 * so curated aliases win ties.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const MANUAL_ALIASES = Object.freeze({
  // -- Playstation family --
  "ps1":          "G6",
  "psone":        "G6",
  "psx":          "G6",
  "playstation1": "G6",
  "ps vita":      "G43",
  "vita":         "G43",
  "psvita":       "G43",
  "pstv":         "G43",   // PlayStation TV, uses same cartridges as vita (could the pstv non-supported vita games be listed?)
  "ps tv":        "G43",
  "playstation tv": "G43",
  "vita tv":      "G43",
  "ps vita tv":   "G43",

  // -- Nintendo handhelds --
  "gba sp":       "G1",   // still a GBA
  "dsi":          "G5",   // still a DS
  "2ds":          "G39",  // plays 3DS games

  // -- Nintendo home --
  "gc":           "G3",
  "gamecube":     "G3",
  "sfc":          "G13",  // Super Famicom = Super Nintendo
  "wiiu":         "G47",
  "wii u":        "G47",
  "switch":       "G59",
  "switch 2":     "G80178",
  "switch2":      "G80178",

  // -- Sega --
  "megadrive":    "G15",  // Sega Genesis in Americas
  "mega drive":   "G15",
  "md":           "G15",

  // -- Xbox --
  "xbone":        "G54",
  "xb1":          "G54",
  "xsx":          "G7585",
});
