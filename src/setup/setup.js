// First-run setup page controller.
//
// Saves the user's quick-start choices and marks setup as complete
// so the welcome page doesn't reopen on browser restart. The user
// can still revisit setup from the options page footer.

import { api } from "../lib/api.js";
import { writeSettings, resetSettings } from "../lib/settings.js";

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

async function saveAndFinish(patch) {
  // reset to clean slate, then apply setup choices on top
  await resetSettings();
  await writeSettings({ ...patch, setupComplete: true });
  // navigate to options so the user sees their full settings
  if (api.runtime.openOptionsPage) {
    api.runtime.openOptionsPage();
  }
  window.close();
}

// "Get started" — save choices and go to settings
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveAndFinish(collect());
});

// "Skip" — defaults only
document.getElementById("skip").addEventListener("click", async (e) => {
  e.preventDefault();
  await saveAndFinish({});
});

// "settings" link — go straight to options
document.getElementById("open-settings").addEventListener("click", (e) => {
  e.preventDefault();
  if (api.runtime.openOptionsPage) {
    api.runtime.openOptionsPage();
  }
  window.close();
});
