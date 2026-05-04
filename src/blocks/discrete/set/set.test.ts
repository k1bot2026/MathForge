import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, SetPayload } from "~/math/types";
import { computeSet } from "./compute";
import { SetBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function getElements(v: MathValue): ReadonlyArray<number> {
  const payload = v.payload as SetPayload;
  return payload.map((mv) => mv.payload as number);
}

describe("computeSet", () => {
  test("produces a Set<Scalar(integer)> output", () => {
    const result = computeSet([1, 2, 3]);
    expect(result.type.kind).toBe("Set");
    if (result.type.kind === "Set") {
      expect(result.type.element).toEqual({ kind: "Scalar", field: "integer", precision: "exact" });
    }
  });

  test("deduplicates repeated values", () => {
    const result = computeSet([1, 1, 2, 2, 3]);
    expect(getElements(result)).toEqual([1, 2, 3]);
  });

  test("preserves first-occurrence order", () => {
    const result = computeSet([3, 1, 2]);
    expect(getElements(result)).toEqual([3, 1, 2]);
  });

  test("empty input yields empty set", () => {
    const result = computeSet([]);
    expect(getElements(result)).toEqual([]);
  });

  test("non-finite values are skipped", () => {
    const result = computeSet([1, NaN, Infinity, 2]);
    expect(getElements(result)).toEqual([1, 2]);
  });

  test("floats are rounded to integers and then deduplicated", () => {
    // 1.7 → 2, 2.3 → 2 — both round to 2, so result is {2}
    const result = computeSet([1.7, 2.3]);
    expect(getElements(result)).toEqual([2]);
  });

  test("negative integers are accepted", () => {
    const result = computeSet([-3, -1, 0, 1]);
    expect(getElements(result)).toEqual([-3, -1, 0, 1]);
  });
});

describe("computeSet — property tests", () => {
  test("idempotence: set of a set's elements equals the original set", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -50, max: 50 }), { maxLength: 20 }), (arr) => {
        const s1 = getElements(computeSet(arr));
        const s2 = getElements(computeSet(s1));
        expect(s2).toEqual(s1);
      }),
    );
  });

  test("order-independence: sorted and unsorted inputs produce the same element set", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -50, max: 50 }), { maxLength: 20 }), (arr) => {
        const sorted = [...arr].sort((a, b) => a - b);
        const elems1 = new Set(getElements(computeSet(arr)));
        const elems2 = new Set(getElements(computeSet(sorted)));
        expect(elems1).toEqual(elems2);
      }),
    );
  });

  test("size invariant: result size ≤ input length", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -100, max: 100 }), { maxLength: 30 }), (arr) => {
        const result = getElements(computeSet(arr));
        expect(result.length).toBeLessThanOrEqual(arr.length);
      }),
    );
  });

  test("no duplicates in output", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -50, max: 50 }), { maxLength: 30 }), (arr) => {
        const elems = getElements(computeSet(arr));
        const unique = new Set(elems);
        expect(unique.size).toBe(elems.length);
      }),
    );
  });
});

describe("SetBlock definition", () => {
  test("has id discrete.set", () => {
    expect(SetBlock.id).toBe("discrete.set");
  });

  test("has no inputs and one Set output", () => {
    expect(SetBlock.inputs).toHaveLength(0);
    expect(SetBlock.outputs).toHaveLength(1);
    const out = SetBlock.outputs[0];
    expect(out?.id).toBe("S");
    const outType = typeof out?.type === "function" ? out.type({}) : out?.type;
    expect(outType?.kind).toBe("Set");
  });

  test("has count param with default 3", () => {
    expect(SetBlock.params?.count?.default).toBe(3);
  });

  test("has element params e0..e15", () => {
    for (let i = 0; i < 16; i++) {
      expect(SetBlock.params?.[`e${String(i)}`]).toBeDefined();
    }
  });
});

describe("SetBlock compute", () => {
  test("returns a Set with default params {1, 2, 3}", () => {
    const result = SetBlock.compute({}, { count: 3, e0: 1, e1: 2, e2: 3 }, ctx) as MathValue;
    expect(result.type.kind).toBe("Set");
    expect(getElements(result)).toEqual([1, 2, 3]);
  });

  test("deduplicates via block interface", () => {
    const result = SetBlock.compute({}, { count: 4, e0: 5, e1: 5, e2: 7, e3: 5 }, ctx) as MathValue;
    expect(getElements(result)).toEqual([5, 7]);
  });

  test("respects count — elements beyond count are ignored", () => {
    const result = SetBlock.compute({}, { count: 2, e0: 10, e1: 20, e2: 30 }, ctx) as MathValue;
    expect(getElements(result)).toHaveLength(2);
    expect(getElements(result)).toEqual([10, 20]);
  });

  test("count 0 produces empty set", () => {
    const result = SetBlock.compute({}, { count: 0 }, ctx) as MathValue;
    expect(getElements(result)).toHaveLength(0);
  });
});

describe("SetBlock explain", () => {
  test("effect shows set contents and size", () => {
    const result = SetBlock.compute({}, { count: 3, e0: 1, e1: 2, e2: 3 }, ctx) as MathValue;
    const msg = SetBlock.explain.effect?.({}, result);
    expect(msg).toMatch(/\{1, 2, 3\}/);
    expect(msg).toMatch(/3 elements/);
  });

  test("effect uses singular for single element", () => {
    const result = SetBlock.compute({}, { count: 1, e0: 42 }, ctx) as MathValue;
    const msg = SetBlock.explain.effect?.({}, result);
    expect(msg).toMatch(/1 element\b/);
  });
});
