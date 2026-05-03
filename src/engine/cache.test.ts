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
});
