import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { buildCacheKey, EvalCache, hashInput } from "./cache";
import { stableStringify } from "./hash";

const value = (n: number): MathValue => ({
  type: { kind: "Scalar", field: "real", precision: "exact" },
  payload: n,
  provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
});

describe("stableStringify", () => {
  test("produces the same string regardless of key order", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }));
  });
  test("nested objects are also key-sorted", () => {
    expect(stableStringify({ x: { b: 2, a: 1 } })).toBe(stableStringify({ x: { a: 1, b: 2 } }));
  });
  test("arrays preserve order", () => {
    expect(stableStringify([1, 2, 3])).toBe("[1,2,3]");
    expect(stableStringify([1, 2, 3])).not.toBe(stableStringify([3, 2, 1]));
  });
  test("null serialises to 'null'", () => {
    expect(stableStringify(null)).toBe("null");
  });
  test("undefined serialises to 'undefined'", () => {
    expect(stableStringify(undefined)).toBe("undefined");
  });
  test("boolean values serialise correctly", () => {
    expect(stableStringify(true)).toBe("true");
    expect(stableStringify(false)).toBe("false");
  });
  test("bigint serialises to its string representation", () => {
    expect(stableStringify(BigInt(42))).toBe("42");
    expect(stableStringify(BigInt(0))).toBe("0");
  });
  test("string values are JSON-quoted", () => {
    expect(stableStringify("hello")).toBe('"hello"');
  });
  test("nested arrays preserve inner order", () => {
    expect(
      stableStringify([
        [1, 2],
        [3, 4],
      ]),
    ).toBe("[[1,2],[3,4]]");
  });
});

describe("EvalCache", () => {
  test("get returns undefined before set", () => {
    expect(new EvalCache().get("k")).toBeUndefined();
  });
  test("set then get round-trips", () => {
    const c = new EvalCache();
    c.set("k", value(7));
    expect(c.get("k")?.payload).toBe(7);
  });
  test("clear empties the store", () => {
    const c = new EvalCache();
    c.set("a", value(1));
    c.set("b", value(2));
    expect(c.size()).toBe(2);
    c.clear();
    expect(c.size()).toBe(0);
  });

  test("delete removes an existing entry and returns true", () => {
    const c = new EvalCache();
    c.set("k", value(5));
    expect(c.delete("k")).toBe(true);
    expect(c.get("k")).toBeUndefined();
    expect(c.size()).toBe(0);
  });

  test("delete returns false for a missing entry", () => {
    expect(new EvalCache().delete("nonexistent")).toBe(false);
  });

  test("__getCacheStats returns zero counts on fresh cache", () => {
    const c = new EvalCache();
    expect(c.__getCacheStats()).toEqual({ hits: 0, misses: 0 });
  });

  test("__getCacheStats counts hits and misses correctly", () => {
    const c = new EvalCache();
    c.get("missing"); // miss
    c.set("k", value(1));
    c.get("k"); // hit
    c.get("k"); // hit
    c.get("other"); // miss
    expect(c.__getCacheStats()).toEqual({ hits: 2, misses: 2 });
  });

  test("__resetCacheStats zeroes counters without clearing store", () => {
    const c = new EvalCache();
    c.set("k", value(1));
    c.get("k"); // hit
    c.get("none"); // miss
    c.__resetCacheStats();
    expect(c.__getCacheStats()).toEqual({ hits: 0, misses: 0 });
    // store still intact
    expect(c.get("k")?.payload).toBe(1);
    expect(c.__getCacheStats()).toEqual({ hits: 1, misses: 0 });
  });
});

describe("buildCacheKey + hashInput", () => {
  test("buildCacheKey is deterministic", () => {
    expect(buildCacheKey("la.matmul", "p", ["a", "b"])).toBe(
      buildCacheKey("la.matmul", "p", ["a", "b"]),
    );
  });
  test("different inputs → different keys", () => {
    expect(buildCacheKey("x", "p", ["a"])).not.toBe(buildCacheKey("x", "p", ["b"]));
  });
  test("hashInput is order-stable on objects", () => {
    expect(hashInput({ a: 1, b: 2 })).toBe(hashInput({ b: 2, a: 1 }));
  });
  test("hashInput differentiates null from undefined from zero", () => {
    expect(hashInput(null)).not.toBe(hashInput(undefined));
    expect(hashInput(null)).not.toBe(hashInput(0));
  });
});
