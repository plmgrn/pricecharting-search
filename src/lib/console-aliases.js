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
  "ps2 slim":     "G7",   // hardware variant, same games
  "ps2 fat":      "G7",
  "ps3 slim":     "G12",
  "ps3 fat":      "G12",
  "ps3 super slim": "G12",
  "ps4 slim":     "G53",
  "ps4 pro":      "G53",
  "ps5 slim":     "G7468",
  "ps5 pro":      "G7468",
  "ps5 digital":  "G7468",
  "ps vita":      "G43",
  "vita":         "G43",
  "psvita":       "G43",
  "pstv":         "G43",   // PlayStation TV, uses same cartridges as Vita
  "ps tv":        "G43",
  "playstation tv": "G43",
  "vita tv":      "G43",
  "ps vita tv":   "G43",

  // -- Nintendo handhelds --
  "gba sp":       "G1",   // still a GBA
  "gba micro":    "G1",
  "dsi":          "G5",   // still a DS
  "dsi xl":       "G5",
  "ds lite":      "G5",
  "2ds":          "G39",  // plays 3DS games
  "2ds xl":       "G39",
  "new 3ds":      "G39",
  "new 3ds xl":   "G39",
  "3ds xl":       "G39",

  // -- Nintendo home --
  "gc":           "G3",
  "gamecube":     "G3",
  "sfc":          "G13",  // Super Famicom = Super Nintendo
  "wiiu":         "G47",
  "wii u":        "G47",
  "wii mini":     "G11",  // hardware variant, same games
  "switch":       "G59",
  "switch lite":  "G59",
  "switch oled":  "G59",
  "switch 2":     "G80178",
  "switch2":      "G80178",

  // -- Sega --
  "megadrive":    "G15",  // Sega Genesis in Americas
  "mega drive":   "G15",
  "md":           "G15",

  // -- Xbox --
  "xbone":        "G54",
  "xb1":          "G54",
  "xbox one s":   "G54",  // hardware variant, same games
  "xbox one x":   "G54",
  "one x":        "G54",
  "one s":        "G54",
  "xsx":          "G7585",
  "series x":     "G7585",

  // Xbox Series S is digital-only (no disc drive) but plays the same
  // digital game library as Series X, so filtering to G7585 is correct
  // when searching for games. Searching "xbox series s" without a colon
  // still hits PriceCharting as plain text for the console itself.
  "xss":          "G7585",
  "series s":     "G7585",

  // -- Xbox 360 --
  "360 slim":     "G10",  // hardware variant, same games
  "360 e":        "G10",

  // -- Atari --
  "2600":         "G24",
  "7800":         "G33",

  // -- Sega --
  "saturn":       "G14",
  "dreamcast":    "G16",
  "dc":           "G16",
  "sms":          "G29",  // Sega Master System
  "gg":           "G20",  // Sega Game Gear

  // -- Nintendo --
  "fc":           "G55",  // Famicom
});
