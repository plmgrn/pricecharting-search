// Background service worker / event-page entry point.
//
// Responsibilities (kept minimal — pure logic lives in lib/):
//  1. On install/update: run settings migration, register the context
//     menu with the (possibly user-customized) title.
//  2. On menu click: build the search URL from current settings and
//     open it according to the user's preferred open-behavior.
//  3. On settings change: refresh the menu title if it changed.

import { api } from "../lib/api.js";
import { migrateSettings, readSettings, onSettingsChanged } from "../lib/settings.js";
import { buildSearchUrl, normalizeSelection } from "../lib/url-template.js";

const MENU_ID = "pricecharting-search-selection";

async function createOrUpdateMenu() {
  const settings = await readSettings();
  // `contextMenus.create` throws on duplicate id, so remove first.
  // `remove` rejects if it doesn't exist — swallow that.
  try {
    await api.contextMenus.remove(MENU_ID);
  } catch { /* not present yet */ }

  api.contextMenus.create({
    id: MENU_ID,
    title: settings.menuTitle,
    contexts: ["selection"],
  });
}

api.runtime.onInstalled.addListener(async () => {
  await migrateSettings();
  await createOrUpdateMenu();
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
onSettingsChanged(async (settings) => {
  if (settings.menuTitle !== lastMenuTitle) {
    lastMenuTitle = settings.menuTitle;
    await createOrUpdateMenu();
  }
});

api.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  const settings = await readSettings();
  const selection = normalizeSelection(info.selectionText, settings);
  const url = buildSearchUrl(selection, settings);
  if (!url) return;

  await openResult(url, tab, settings);
});

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
