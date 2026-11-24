// First-run setup page controller.
//
// Saves the user's quick-start choices and marks setup as complete
// so the welcome page doesn't reopen on browser restart. The user
// can still revisit setup from the options page footer.

import { api } from "../lib/api.js";
import { writeSettings } from "../lib/settings.js";
import { DEFAULTS } from "../lib/defaults.js";
import "../shared/detect-theme.js";

const form = document.getElementById("setup-form");

/** Collect form values into a settings patch. */
function collect() {
  const patch = {};
  for (const name of ["broadCategory", "regionName", "language"]) {
    const el = form.elements[name];
    if (el) patch[name] = el.value;
  }
  return patch;
}

/**
 * Close this setup tab. Prefers the tabs API (works for any tab), and
 * falls back to window.close() where it isn't available.
 * @returns {Promise<void>}
 */
async function closeSelf() {
  try {
    //getCurrent needs no extra permission and returns this page's tab
    const tab = await api.tabs?.getCurrent?.();
    if (tab?.id != null) {
      await api.tabs.remove(tab.id);
      return;
    }
  } catch {
    //fall through to window.close()
  }
  window.close();
}

/**
 * Persist a settings patch and mark setup as complete.
 * Only the patch is written, so re-running setup never resets other settings.
 * @param {object} patch partial settings chosen on this page
 * @returns {Promise<void>}
 */
async function completeSetup(patch) {
  //single atomic write, avoids a race if the page closes between calls
  await writeSettings({ ...patch, setupComplete: true });
}

/** Open the options page, if the browser supports it. */
async function openOptions() {
  if (api.runtime.openOptionsPage) {
    await api.runtime.openOptionsPage();
  }
}

// "Finish", save choices, then go to settings
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await completeSetup(collect());
  await openOptions();
  await closeSelf();
});

// "Skip", mark setup done without changing anything, then just close
document.getElementById("skip").addEventListener("click", async (e) => {
  e.preventDefault();
  await completeSetup({});
  await closeSelf();
});

// "settings" link, go straight to options
document.getElementById("open-settings").addEventListener("click", async (e) => {
  e.preventDefault();
  await openOptions();
  await closeSelf();
});

// "settings" link, go straight to options
document.getElementById("open-settings").addEventListener("click", async (e) => {
  e.preventDefault();
  if (api.runtime.openOptionsPage) {
    await api.runtime.openOptionsPage();
  }
  window.close();
});


// Pin instructions per browser family. Chromium has no way to pin
// programmatically, and Firefox hides the pin option in a gear menu.
const PIN_STEPS = Object.freeze({
  firefox: "Click the puzzle icon in the toolbar, click the ... menu next to this extension and choose Pin to Toolbar.",
  chromium: "Click the puzzle icon in the toolbar, then click the pin icon next to this extension.",
});

/**
 * Detect Firefox with the same runtime check the api shim uses
 * (no user-agent sniffing).
 * @returns {boolean}
 */
function isFirefox() {
  return Boolean(globalThis.browser?.runtime);
}

/**
 * Decide whether the pin hint is useful. If the browser can tell us the
 * button is already on the toolbar we hide it; otherwise we show it.
 * @returns {Promise<boolean>}
 */
async function shouldShowPinHint() {
  try {
    // getUserSettings is missing in older browsers, so guard every step
    const settings = await api.action?.getUserSettings?.();
    return settings ? !settings.isOnToolbar : true;
  } catch {
    return true;
  }
}

/** Fill in and reveal the pin hint when it applies. */
async function initPinHint() {
  if (!(await shouldShowPinHint())) return;

  const hint = document.getElementById("pin-hint");
  const steps = document.getElementById("pin-steps");
  if (!hint || !steps) return;

  // textContent (not innerHTML) keeps the page free of injected markup
  steps.textContent = isFirefox() ? PIN_STEPS.firefox : PIN_STEPS.chromium;
  hint.hidden = false;
}

initPinHint();