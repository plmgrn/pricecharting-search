// Background service worker / event-page entry point.
//
// Responsibilities (kept minimal, pure logic lives in lib/):
//  1. On install/update: run settings migration, register the context
//     menu with the (possibly user-customized) title.
//  2. On menu click: build the search URL from current settings and
//     open it according to the user's preferred open-behavior.
//  3. On settings change: refresh the menu title if it changed.
//  4. Omnibox: type "price <query>" in the address bar to search.
//  5. Keyboard shortcut: Alt+S to search the current selection.

import { api } from "../lib/api.js";
import { migrateSettings, readSettings, onSettingsChanged } from "../lib/settings.js";
import { buildSearchUrl, normalizeSelection } from "../lib/url-template.js";
import { parseQuery, applyOverrides } from "../lib/query-parser.js";

const MENU_ID = "pricecharting-search-selection";

async function createOrUpdateMenu() {
  const settings = await readSettings();
  // `contextMenus.create` throws on duplicate id, so remove first.
  // `remove` rejects if it doesn't exist, swallow that.
  try {
    await api.contextMenus.remove(MENU_ID);
  } catch { /* not present yet */ }

  //TODO: allow multiple menu items (Search for LEGO *input*, Search for PAL videogames *input*)
  //      For this multiple stored setting sets need to be stored.
  api.contextMenus.create({
    id: MENU_ID,
    title: settings.menuTitle,
    contexts: ["selection"],
  });
}

api.runtime.onInstalled.addListener(async (details) => {
  await migrateSettings();
  await createOrUpdateMenu();

  // show the first-run setup page on fresh install
  if (details.reason === "install") {
    const settings = await readSettings();
    if (!settings.setupComplete) {
      api.tabs.create({ url: api.runtime.getURL("setup/setup.html") });
    }
  }
});

// Service workers can be killed and restarted; re-create the menu on
// startup too. (Harmless if the menu already exists thanks to the
// remove-then-create pattern.)
if (api.runtime.onStartup) {
  api.runtime.onStartup.addListener(createOrUpdateMenu);
}

// Refresh the menu when settings change (e.g. user edited menuTitle in
// the options page, or sync pulled in changes from another device).
let lastMenuTitle = null;
const initTitle = readSettings().then(s => { lastMenuTitle = s.menuTitle; });

onSettingsChanged(async (settings) => {
  await initTitle; // ensure we have baseline before comparing
  if (settings.menuTitle !== lastMenuTitle) {
    lastMenuTitle = settings.menuTitle;
    await createOrUpdateMenu();
  }
});

api.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  const settings = await readSettings();
  const parsed = parseQuery(info.selectionText);
  const effective = applyOverrides(settings, parsed);
  const selection = normalizeSelection(parsed.query, effective);
  const url = buildSearchUrl(selection, effective);
  if (!url) return;

  // guard against bad custom-template URLs that tabs.create rejects
  try {
    await openResult(url, tab, settings);
  } catch (e) {
    console.warn("Failed to open result:", e);
  }
});

/* -- Keyboard shortcut ---------------------------------------- */

if (api.commands) {
  api.commands.onCommand.addListener(async (command) => {
    if (command !== "search-selection") return;

    const settings = await readSettings();
    if (!settings.shortcutEnabled) return;

    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    let results;
    try {
      results = await api.scripting.executeScript({
        target: { tabId: tab.id },
        // runs in the content page, not the service worker
        func: () => window.getSelection()?.toString() ?? "", // eslint-disable-line no-undef
      });
    } catch {
      // can't inject into chrome:// or other restricted pages
      return;
    }

    const text = results?.[0]?.result;
    if (!text) return;

    const parsed = parseQuery(text);
    const effective = applyOverrides(settings, parsed);
    const selection = normalizeSelection(parsed.query, effective);
    const url = buildSearchUrl(selection, effective);
    if (!url) return;

    try {
      await openResult(url, tab, settings);
    } catch (e) {
      console.warn("Keyboard shortcut search failed:", e);
    }
  });
}

/* -- Omnibox (address-bar keyword: "pchart") ---------------------- */

if (api.omnibox) {
  // show a hint when the user activates the keyword
  api.omnibox.setDefaultSuggestion({
    description: "Search PriceCharting for %s",
  });

  api.omnibox.onInputEntered.addListener(async (text, disposition) => {
    const settings = await readSettings();
    const parsed = parseQuery(text);
    const effective = applyOverrides(settings, parsed);
    const selection = normalizeSelection(parsed.query, effective);
    const url = buildSearchUrl(selection, effective);
    if (!url) return;

    // disposition mirrors the user's intent (Enter / Ctrl+Enter / Shift+Enter)
    try {
      switch (disposition) {
        case "currentTab":
          await api.tabs.update(undefined, { url });
          break;
        case "newForegroundTab":
          await api.tabs.create({ url, active: true });
          break;
        case "newBackgroundTab":
          await api.tabs.create({ url, active: false });
          break;
      }
    } catch (e) {
      console.warn("Omnibox search failed:", e);
    }
  });
}

// Toolbar button opens the popup (set via default_popup in manifest).
// action.onClicked no longer fires when a popup is configured.

/**
 * Open the result URL according to settings.openBehavior.
 *
 *  - "next"    : new tab immediately after the source tab.
 *  - "end"     : new tab at the end of the current window.
 *  - "window"  : new browser window.
 *  - "current" : replace the source tab's URL.
 */
async function openResult(url, tab, settings) {
  switch (settings.openBehavior) {
    case "current":
      if (tab && tab.id != null) {
        await api.tabs.update(tab.id, { url });
      } else {
        await api.tabs.create({ url, active: settings.focusNew });
      }
      return;

    case "window":
      await api.windows.create({ url, focused: settings.focusNew });
      return;

    case "end":
      await api.tabs.create({ url, active: settings.focusNew });
      return;

    case "next":
    default:
      await api.tabs.create({
        url,
        index: tab ? tab.index + 1 : undefined,
        active: settings.focusNew,
      });
      return;
  }
}
