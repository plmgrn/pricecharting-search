import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

const handlers = new Map();
const calls = { tabsCreated: [], tabsUpdated: [], windowsCreated: [] };
const elements = {
  "search-form": {
    addEventListener(type, listener) {
      handlers.set(`form:${type}`, listener);
    },
  },
  query: { value: "", focus() {} },
  "options-btn": {
    addEventListener(type, listener) {
      handlers.set(`options:${type}`, listener);
    },
  },
};
const api = {
  runtime: { async openOptionsPage() {} },
  storage: {
    sync: {
      async get(keys) {
        return keys == null ? {} : {};
      },
    },
  },
  tabs: {
    async query() {
      return [{ id: 3, index: 1 }];
    },
    async create(options) {
      calls.tabsCreated.push(options);
    },
    async update(id, options) {
      calls.tabsUpdated.push({ id, ...options });
    },
  },
  windows: {
    async create(options) {
      calls.windowsCreated.push(options);
    },
  },
};

before(async () => {
  globalThis.chrome = api;
  globalThis.window = {
    close() {},
    matchMedia() {
      return { matches: false, addEventListener() {} };
    },
  };
  globalThis.document = {
    getElementById(id) {
      return elements[id];
    },
    documentElement: {
      classList: { add() {}, remove() {} },
    },
  };
  await import("../src/popup/popup.js?popup-entry-test");
});

function clearCalls() {
  calls.tabsCreated.length = 0;
  calls.tabsUpdated.length = 0;
  calls.windowsCreated.length = 0;
}

describe("popup entry point", () => {
  test("parses an inline filter before opening the search URL", async () => {
    clearCalls();
    elements.query.value = "ps2:god of war";
    await handlers.get("form:submit")({ preventDefault() {} });

    const [opened] = calls.tabsCreated;
    const url = new URL(opened.url);
    assert.equal(url.searchParams.get("q"), "god of war");
    assert.equal(url.searchParams.get("console-uid"), "G7");
  });

  test("empty popup input opens no search tab", async () => {
    clearCalls();
    elements.query.value = "   ";
    await handlers.get("form:submit")({ preventDefault() {} });
    assert.equal(calls.tabsCreated.length, 0);
    assert.equal(calls.tabsUpdated.length, 0);
    assert.equal(calls.windowsCreated.length, 0);
  });
});
