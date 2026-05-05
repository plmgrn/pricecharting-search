// Cross-browser WebExtension API shim.
//
// Firefox exposes a promise-based `browser.*` namespace.
// Chromium exposes `chrome.*`, which in MV3 also returns promises when
// no callback is given. The two surfaces are otherwise identical for
// the APIs this extension uses (contextMenus, tabs, storage, runtime).
//
// Importing `api` from here means the rest of the codebase never has
// to think about which browser it's running in.

/* global browser, chrome */

export const api = (typeof browser !== "undefined") ? browser : chrome;
