import { describe, expect, test } from "vitest";
import { stableStringify } from "./hash";

describe("stableStringify", () => {
  test("null", () => {
    expect(stableStringify(null)).toBe("null");
  });

  test("undefined", () => {
    expect(stableStringify(undefined)).toBe("undefined");
  });

  test("number", () => {
    expect(stableStringify(42)).toBe("42");
    expect(stableStringify(-3.14)).toBe("-3.14");
    expect(stableStringify(0)).toBe("0");
  });

  test("boolean", () => {
    expect(stableStringify(true)).toBe("true");
    expect(stableStringify(false)).toBe("false");
  });

  test("bigint", () => {
    expect(stableStringify(9007199254740993n)).toBe("9007199254740993");
  });

  test("string", () => {
    expect(stableStringify("hello")).toBe('"hello"');
    expect(stableStringify("")).toBe('""');
  });

  test("array preserves order", () => {
    expect(stableStringify([1, "a", true])).toBe('[1,"a",true]');
  });

  test("empty array", () => {
    expect(stableStringify([])).toBe("[]");
  });

  test("nested array", () => {
    expect(stableStringify([[1, 2], [3]])).toBe("[[1,2],[3]]");
  });

  test("object keys are sorted for stability", () => {
    const a = stableStringify({ z: 1, a: 2 });
    const b = stableStringify({ a: 2, z: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"z":1}');
  });

  test("empty object", () => {
    expect(stableStringify({})).toBe("{}");
  });

  test("nested object is sorted recursively", () => {
    const result = stableStringify({ b: { z: 1, a: 2 }, a: 0 });
    expect(result).toBe('{"a":0,"b":{"a":2,"z":1}}');
  });

  test("function type falls back to JSON.stringify", () => {
    const fn = function named() {
      return 1;
    };
    expect(stableStringify(fn)).toBe(JSON.stringify(fn));
  });
});
