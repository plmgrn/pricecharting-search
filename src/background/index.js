// Use `browser` if available (Firefox), otherwise fall back to `chrome`.
const api = (typeof browser !== "undefined") ? browser : chrome;

const MENU_ID = "pricecharting-search-selection";

// PriceCharting search URL. `?q=` is their standard search query parameter.
const SEARCH_URL = "https://www.pricecharting.com/search-products?type=prices&ignore-preferences=true&q=";

// Create the context menu entry on install / update.
api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({
    id: MENU_ID,
    title: 'Search "%s" on PriceCharting',
    contexts: ["selection"]
  });
});

// Handle clicks on the menu item.
api.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const text = (info.selectionText || "").trim();
  if (!text) return;

  const url = SEARCH_URL + encodeURIComponent(text);

  // Open in a new tab right next to the current one.
  api.tabs.create({
    url,
    index: tab ? tab.index + 1 : undefined,
    active: true
  });
});
