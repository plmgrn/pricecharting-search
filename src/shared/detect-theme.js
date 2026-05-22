// Detect browser + colour scheme and apply the matching profile class.
//
// Adds one of: chrome-dark, chrome-light, firefox-dark, firefox-light
// to <html>. Import this from any surface's JS to activate the
// colour-profiles.css variables (both live in shared/).
//
// Side effect on import, intentional.

import { api } from "../lib/api.js";

// consistent with api.js: browser.runtime exists only in Firefox
const isFirefox = api === globalThis.browser;
const prefix = isFirefox ? "firefox" : "chrome";
const mql = window.matchMedia("(prefers-color-scheme: dark)");

function applyProfile() {
  const profile = prefix + (mql.matches ? "-dark" : "-light");
  // swap both classes so only the current one remains
  document.documentElement.classList.remove(prefix + "-dark", prefix + "-light");
  document.documentElement.classList.add(profile);
}

applyProfile();
mql.addEventListener("change", applyProfile);
