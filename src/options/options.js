// Options page controller.
//
// - Loads current settings on open and populates the form.
// - Auto-saves on any change (debounced) — no "Save" button.
// - Reset button restores DEFAULTS.
// - Listens for storage changes from elsewhere (e.g. another open
//   options tab, sync from another device) and refreshes the form.

import { DEFAULTS } from "../lib/defaults.js";
import { CONSOLES, CONSOLE_GROUPS } from "../lib/consoles.js";
import {
  readSettings,
  writeSettings,
  resetSettings,
  onSettingsChanged,
} from "../lib/settings.js";

const form = document.getElementById("settings-form");
const statusEl = document.getElementById("status");
const resetButton = document.getElementById("reset-button");

/**
 * Read a value from a form field, coerced to the type implied by
 * its DEFAULTS entry. Treats empty strings on number fields as "use
 * the default" (the browser sometimes hands back "" for a cleared
 * number input).
 */
function readField(name) {
  const el = form.elements[name];
  if (!el) return undefined;
  const def = DEFAULTS[name];

  if (el.type === "checkbox") return !!el.checked;

  if (typeof def === "number") {
    const n = Number(el.value);
    return Number.isFinite(n) && el.value !== "" ? n : def;
  }

  return el.value;
}

/** Mirror an entire settings object onto the form. */
function populate(settings) {
  for (const name of Object.keys(DEFAULTS)) {
    if (name === "schemaVersion") continue;
    const el = form.elements[name];
    if (!el) continue;
    const v = settings[name];
    if (el.type === "checkbox") {
      el.checked = !!v;
    } else {
      el.value = v == null ? "" : String(v);
    }
  }
}

/** Read every form field into a settings patch. */
function collect() {
  const patch = {};
  for (const name of Object.keys(DEFAULTS)) {
    if (name === "schemaVersion") continue;
    const v = readField(name);
    if (v !== undefined) patch[name] = v;
  }
  return patch;
}

/* ── Status indicator ───────────────────────────────────────────── */

let statusTimer = null;
function flashStatus(text) {
  statusEl.textContent = text;
  statusEl.classList.add("flash");
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.classList.remove("flash");
    statusEl.textContent = "";
  }, 1200);
}

/* ── Auto-save (debounced) ───────────────────────────────────────── */

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const userSettings = collect();
      const mergedSettings = { ...DEFAULTS, ...userSettings };
      // don't let user save a blank menu title — context menu would be invisible
      if (!mergedSettings.menuTitle) {
        mergedSettings.menuTitle = DEFAULTS.menuTitle;
        form.elements["menuTitle"].value = DEFAULTS.menuTitle;
      }
      await writeSettings(mergedSettings);
      flashStatus("Saved");
      return;
    } catch (e) {
      statusEl.textContent = "Save failed: " + (e && e.message ? e.message : e);
    }
  }, 250);
}

/* ── Wiring ─────────────────────────────────────────────────────── */

form.addEventListener("input", scheduleSave);
form.addEventListener("change", scheduleSave);

resetButton.addEventListener("click", async () => {
  if (!confirm("Reset all settings to their defaults?")) return;
  await resetSettings();
  populate(DEFAULTS);
  flashStatus("Reset to defaults");
});

// Refresh the form if another tab/device changes settings while this
// page is open. Avoid clobbering the field the user is currently
// editing.
let suppressExternalRefresh = false;
form.addEventListener("focusin", () => { suppressExternalRefresh = true; });
form.addEventListener("focusout", () => { suppressExternalRefresh = false; });

onSettingsChanged((settings) => {
  if (suppressExternalRefresh) return;
  populate(settings);
});

// Initial load.
(async () => {
  populateGroupSelect();  //populate group/region dropdown
  const localSettings = await readSettings(); //Fetch the user stored settings
  //if settings exist for the selected region, fill console dropdown with that region
  populateConsoleSelect(localSettings.consoleGroup ?? "");
  populate(localSettings);  //Populate the UI with local settings
})();


// filter the console list when the region dropdown changes
const groupSelect = form.elements["consoleGroup"];
if (groupSelect) {
  groupSelect.addEventListener("change", (e) => {  //=> passing a function and not calling it
    const prev = form.elements["consoleUid"]?.value;
    populateConsoleSelect(e.target.value);
    tryRestoreConsole(prev, e.target.value);
  });
}

/**
 * After repopulating the console dropdown for a new group, try to
 * keep the user's selection if an equivalent console exists.
 * e.g. "PAL Super Nintendo" → Americas → "Super Nintendo".
 *
 * Strategy: strip known region prefixes from the old name, then look
 * for a console whose name ends with that base string. Not perfect
 * (some names diverge: "Sega Genesis" vs "Sega Mega Drive") but
 * covers the common case.
 *
 * @param {string} prevId - previously selected console-uid
 * @param {string} newGroup - the group we just switched to
 */
function tryRestoreConsole(prevId, newGroup) {
  if (!prevId) return; // was (any), nothing to match
  const sel = form.elements["consoleUid"];
  if (!sel) return;

  const prev = CONSOLES.find(c => c.id === prevId);
  if (!prev) return;

  const baseName = stripRegionPrefix(prev.name);

  // find a match in the new group (or all groups if newGroup is empty)
  const match = CONSOLES.find(c =>
    (!newGroup || c.group === newGroup) &&
    stripRegionPrefix(c.name) === baseName
  );

  if (match) sel.value = match.id;
}

const REGION_PREFIXES = /^(PAL |JP |Asian English |Asian )/;
/** @param {string} name */
function stripRegionPrefix(name) {
  return name.replace(REGION_PREFIXES, "");
}


/** Build the console-uid <select> from CONSOLES, grouped by region. 
 * @param {string} region - if provided, only consoles from this region will be included
*/
function populateConsoleSelect(region = "") {

  //get the console select element
  const sel = form.elements["consoleUid"];
  if (!sel) return;

  // remove children one-by-one instead of innerHTML to keep the
  // no-innerHTML-with-data convention clear for future contributors
  while (sel.firstChild) sel.removeChild(sel.firstChild);

  //populate with the default (any)
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "(any)";
  defaultOption.selected = true;
  sel.appendChild(defaultOption);

  // Bucket by group (={region,[list of consoles in that region]}), preserving array order within each.
  const byGroup = new Map();
  for (const g of CONSOLE_GROUPS) byGroup.set(g, []); //empty first

  // Populate byGroup map with consoles, skip unknown
  for (const c of CONSOLES) {
    if (region && c.group !== region) continue; //if region is selected and this is not that group, skip this group
    const arr = byGroup.get(c.group) ?? [];
    arr.push(c);
    byGroup.set(c.group, arr);
  }


  for (const group of CONSOLE_GROUPS) {
    const items = byGroup.get(group);

    //Skip empty groups
    if (!items || items.length === 0) continue;

    //label the group as optgroup
    const og = document.createElement("optgroup");
    og.label = group;

    //Add each console in the group as option
    for (const c of items) {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      og.appendChild(opt);
    }
    sel.appendChild(og);
  }
}

/** Populate the console-group dropdown from CONSOLE_GROUPS. */
function populateGroupSelect() {
  const sel = form.elements["consoleGroup"];
  if (!sel) return;
  for (const r of CONSOLE_GROUPS) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    sel.appendChild(opt);
  }
}

/* ── Collapsible <details> with smooth height animation ─────────────
 *
 * Native <details> snaps display:none on close, which kills any pure-
 * CSS height transition after the first cycle. We intercept the
 * summary click, animate height + opacity ourselves, and only flip
 * the [open] attribute at the right moment (immediately on open;
 * after the close animation finishes).
 *
 * CSS handles the transitions via the `.more-body` rule; we just set
 * inline `height` and `opacity` to the start/end values and clear
 * them on transitionend.
 */
function setupCollapsible(details) {
  const summary = details.querySelector(":scope > summary");
  const body = details.querySelector(":scope > .more-body");
  if (!summary || !body) return;

  let animating = false;

  // Set the initial state so opacity is correct on first render.
  body.style.opacity = details.open ? "1" : "0";
  body.style.height = details.open ? "auto" : "0px";

  function open() {
    animating = true;
    details.open = true;
    // Measure target height with current content.
    body.style.height = "0px";
    body.style.opacity = "0";
    // Force layout so the next change transitions.
    void body.offsetHeight;
    const target = body.scrollHeight;
    body.style.height = target + "px";
    body.style.opacity = "1";

    body.addEventListener("transitionend", function onEnd(e) {
      if (e.propertyName !== "height") return;
      body.removeEventListener("transitionend", onEnd);
      body.style.height = "auto"; // let it grow if content changes later
      animating = false;
    });
  }

  function close() {
    animating = true;
    // From auto → fixed px so we can transition to 0.
    body.style.height = body.scrollHeight + "px";
    void body.offsetHeight;
    body.style.height = "0px";
    body.style.opacity = "0";

    body.addEventListener("transitionend", function onEnd(e) {
      if (e.propertyName !== "height") return;
      body.removeEventListener("transitionend", onEnd);
      details.open = false;
      animating = false;
    });
  }

  summary.addEventListener("click", (e) => {
    e.preventDefault(); // we manage the open attribute ourselves
    if (animating) return;
    if (details.open) close();
    else open();
  });
}

document.querySelectorAll("details.more").forEach(setupCollapsible);
