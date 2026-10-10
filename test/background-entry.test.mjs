import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

function event() {
  const listeners = [];
  return {
    addListener(listener) {
      listeners.push(listener);
    },
    async emit(...args) {
      return Promise.all(listeners.map(listener => listener(...args)));
    },
  };
}

const storageData = {};
const calls = { tabsCreated: [], tabsUpdated: [], windowsCreated: [] };
const contextMenuClick = event();
const command = event();
const omniboxInput = event();
const onInstalled = event();
const onStartup = event();
const storageChanged = event();
let selectedText = "";
const api = {
  runtime: {
    onInstalled,
    onStartup,
    getURL: path => `chrome-extension://test/${path}`,
  },
  contextMenus: {
    onClicked: contextMenuClick,
    async remove() {},
    create() {},
  },
  commands: { onCommand: command },
  omnibox: {
    onInputEntered: omniboxInput,
    setDefaultSuggestion() {},
  },
  storage: {
    sync: {
      async get(keys) {
        if (keys == null) return { ...storageData };
        return Object.fromEntries(keys.filter(key => key in storageData).map(key => [key, storageData[key]]));
      },
      async set(patch) {
        Object.assign(storageData, patch);
      },
      async clear() {
        for (const key of Object.keys(storageData)) delete storageData[key];
      },
    },
    onChanged: storageChanged,
  },
  tabs: {
    async create(options) {
      calls.tabsCreated.push(options);
      return { id: 99 };
    },
    async update(id, options) {
      calls.tabsUpdated.push({ id, ...options });
    },
    async query() {
      return [{ id: 7, index: 3 }];
    },
  },
  windows: {
    async create(options) {
      calls.windowsCreated.push(options);
    },
  },
  scripting: {
    async executeScript() {
      return [{ result: selectedText }];
    },
  },
};

before(async () => {
  globalThis.chrome = api;
  await import("../src/background/index.js?background-entry-test");
});

function searchUrls() {
  return [
    ...calls.tabsCreated.map(call => call.url),
    ...calls.tabsUpdated.map(call => call.url),
    ...calls.windowsCreated.map(call => call.url),
  ];
}

function clearCalls() {
  calls.tabsCreated.length = 0;
  calls.tabsUpdated.length = 0;
  calls.windowsCreated.length = 0;
}

describe("background entry point", () => {
  test("context-menu filters are parsed before building the search URL", async () => {
    await contextMenuClick.emit(
      { menuItemId: "pricecharting-search-selection", selectionText: "ps2:god of war" },
      { id: 7, index: 3 },
    );

    const [opened] = calls.tabsCreated;
    const url = new URL(opened.url);
    assert.equal(url.searchParams.get("q"), "god of war");
    assert.equal(url.searchParams.get("console-uid"), "G7");
    assert.equal(url.searchParams.get("broad-category"), "video-games");
  });

  test("empty, whitespace-only, and filter-only selections open no tab", async () => {
    clearCalls();
    for (const selectionText of ["", "   ", "ps2:"]) {
      await contextMenuClick.emit(
        { menuItemId: "pricecharting-search-selection", selectionText },
        { id: 7, index: 3 },
      );
    }
    assert.equal(calls.tabsCreated.length, 0);
  });

  test("selection length is capped at 2000 characters", async () => {
    clearCalls();
    await contextMenuClick.emit(
      { menuItemId: "pricecharting-search-selection", selectionText: "x".repeat(100_000) },
      { id: 7, index: 3 },
    );
    assert.equal(new URL(calls.tabsCreated[0].url).searchParams.get("q").length, 200);
  });

  test("omnibox filter terms never leak into the query parameter", async () => {
    clearCalls();
    await omniboxInput.emit("ps2:god of war", "newForegroundTab");
    const url = new URL(calls.tabsCreated[0].url);
    assert.equal(url.searchParams.get("q"), "god of war");
    assert.equal(url.searchParams.get("console-uid"), "G7");
  });

  test("disabled keyboard shortcut does not search", async () => {
    clearCalls();
    storageData.shortcutEnabled = false;
    await command.emit("search-selection");
    assert.equal(searchUrls().length, 0);
  });

  test("enabled keyboard shortcut parses the selected text", async () => {
    clearCalls();
    storageData.shortcutEnabled = true;
    selectedText = "ps2:zelda";
    await command.emit("search-selection");
    const url = new URL(calls.tabsCreated[0].url);
    assert.equal(url.searchParams.get("q"), "zelda");
    assert.equal(url.searchParams.get("console-uid"), "G7");
    selectedText = "";
  });

  test("tab creation failures are handled by the context-menu callback", async () => {
    clearCalls();
    const originalCreate = api.tabs.create;
    api.tabs.create = async () => {
      throw new Error("tab creation failed");
    };
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      await assert.doesNotReject(contextMenuClick.emit(
        { menuItemId: "pricecharting-search-selection", selectionText: "zelda" },
        { id: 7, index: 3 },
      ));
    } finally {
      api.tabs.create = originalCreate;
      console.warn = originalWarn;
    }
  });
});
