// fake-indexeddb must be imported before idb-keyval so its globals are in
// place when createStore() opens the database for the first time.
import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { ENGINE_VERSION, IndexedDBCache } from "./cache";

function makeValue(n: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: n,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

// Each test gets a fresh IndexedDBCache instance. Because fake-indexeddb
// is module-scoped, databases persist across tests within a file unless
// we clear explicitly. We clear in beforeEach to isolate tests.
let cache: IndexedDBCache;

beforeEach(async () => {
  cache = new IndexedDBCache();
  cache.clear();
  // Allow any pending IDB writes from previous test to settle before clearing
  await new Promise((r) => setTimeout(r, 0));
  cache.clear();
});

afterEach(async () => {
  // Drain any pending void-idbSet promises before the next test starts
  await new Promise((r) => setTimeout(r, 0));
});

describe("IndexedDBCache — hydrate on startup", () => {
  test("hydrate() loads version-matched entries written by a previous instance", async () => {
    // Simulate a prior session writing to IDB
    const prior = new IndexedDBCache();
    prior.set("k1", makeValue(42));
    prior.set("k2", makeValue(99));
    // Let IDB writes settle
    await new Promise((r) => setTimeout(r, 10));

    // New instance starts cold (no in-memory entries)
    const fresh = new IndexedDBCache();
    expect(fresh.get("k1")).toBeUndefined();

    await fresh.hydrate();

    expect(fresh.get("k1")?.payload).toBe(42);
    expect(fresh.get("k2")?.payload).toBe(99);
  });

  test("hydrate() ignores entries from a different ENGINE_VERSION prefix", async () => {
    // Manually write a stale-version entry into IDB
    const { createStore, set: idbSet } = await import("idb-keyval");
    const store = createStore("mathforge:eval-cache", "entries");
    await idbSet("v0:stale-key", makeValue(7), store);

    const fresh = new IndexedDBCache();
    await fresh.hydrate();

    // v0 key must not appear under current version
    expect(fresh.get("stale-key")).toBeUndefined();
  });

  test("hydrate() with empty IDB leaves cache empty", async () => {
    const fresh = new IndexedDBCache();
    await fresh.hydrate();
    expect(fresh.size()).toBe(0);
  });
});

describe("IndexedDBCache — write-through", () => {
  test("set() makes value available in memory immediately", () => {
    cache.set("foo", makeValue(1));
    expect(cache.get("foo")?.payload).toBe(1);
  });

  test("set() persists to IDB (visible after hydrate on new instance)", async () => {
    cache.set("persist-me", makeValue(55));
    await new Promise((r) => setTimeout(r, 10));

    const fresh = new IndexedDBCache();
    await fresh.hydrate();
    expect(fresh.get("persist-me")?.payload).toBe(55);
  });
});

describe("IndexedDBCache — reload simulation", () => {
  test("values written in session 1 are accessible in session 2 after hydrate", async () => {
    // Session 1
    const session1 = new IndexedDBCache();
    session1.set("result-a", makeValue(111));
    session1.set("result-b", makeValue(222));
    await new Promise((r) => setTimeout(r, 10));

    // Session 2 — new instance, no in-memory data
    const session2 = new IndexedDBCache();
    expect(session2.get("result-a")).toBeUndefined();

    await session2.hydrate();

    expect(session2.get("result-a")?.payload).toBe(111);
    expect(session2.get("result-b")?.payload).toBe(222);
  });
});

describe("IndexedDBCache — version-bump invalidation", () => {
  test("ENGINE_VERSION constant is exported and non-empty", () => {
    expect(typeof ENGINE_VERSION).toBe("string");
    expect(ENGINE_VERSION.length).toBeGreaterThan(0);
  });

  test("entries written under a future version prefix are not loaded by current hydrate", async () => {
    const { createStore, set: idbSetFn } = await import("idb-keyval");
    const store = createStore("mathforge:eval-cache", "entries");
    const futureVersion = String(Number(ENGINE_VERSION) + 1);
    await idbSetFn(`v${futureVersion}:future-key`, makeValue(88), store);

    const fresh = new IndexedDBCache();
    await fresh.hydrate();

    expect(fresh.get("future-key")).toBeUndefined();
  });
});

describe("IndexedDBCache — clear", () => {
  test("clear() empties in-memory store", () => {
    cache.set("a", makeValue(1));
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  test("clear() removes IDB entries so subsequent hydrate loads nothing", async () => {
    cache.set("will-be-cleared", makeValue(5));
    await new Promise((r) => setTimeout(r, 10));

    cache.clear();
    await new Promise((r) => setTimeout(r, 10));

    const fresh = new IndexedDBCache();
    await fresh.hydrate();
    expect(fresh.size()).toBe(0);
  });
});
