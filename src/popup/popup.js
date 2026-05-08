// Popup controller.
//
// Provides a quick-search bar in the toolbar popup. Builds the
// search URL using the same pipeline as the context menu and
// opens it according to the user's open-behavior setting.

import { api } from "../lib/api.js";
import { readSettings } from "../lib/settings.js";
import { buildSearchUrl, normalizeSelection } from "../lib/url-template.js";
import { parseQuery, applyOverrides } from "../lib/query-parser.js";

// activate the right colour profile
const isFirefox = /Firefox/i.test(navigator.userAgent);
const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const profile = (isFirefox ? "firefox" : "chrome") + (isDark ? "-dark" : "-light");
document.documentElement.classList.add(profile);

const form = document.getElementById("search-form");
const queryInput = document.getElementById("query");

// auto-focus if user opted in
readSettings().then(s => {
  if (s.popupAutofocus) queryInput.focus();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = queryInput.value.trim();
  if (!input) return;

  const settings = await readSettings();
  const parsed = parseQuery(input);
  const effective = applyOverrides(settings, parsed);
  const selection = normalizeSelection(parsed.query, effective);
  const url = buildSearchUrl(selection, effective);
  if (!url) return;

  // respect the user's openBehavior setting
  const [currentTab] = await api.tabs.query({ active: true, currentWindow: true });
  switch (effective.openBehavior) {
    case "current":
      if (currentTab?.id) {
        await api.tabs.update(currentTab.id, { url });
      } else {
        await api.tabs.create({ url, active: true });
      }
      break;
    case "window":
      await api.windows.create({ url, focused: effective.focusNew });
      break;
    case "end":
      await api.tabs.create({ url, active: effective.focusNew });
      break;
    case "next":
    default:
      await api.tabs.create({
        url,
        index: currentTab ? currentTab.index + 1 : undefined,
        active: effective.focusNew,
      });
      break;
  }
  window.close();
});

// settings button
document.getElementById("options-btn").addEventListener("click", () => {
  api.runtime.openOptionsPage();
  window.close();
});
