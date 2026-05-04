import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, SetPayload } from "~/math/types";
import { CartesianProductBlock } from "./cartesian-product/definition";
import { DifferenceBlock } from "./difference/definition";
import { IntersectionBlock } from "./intersection/definition";
import { computeSet } from "./set/compute";
import {
  SetOpError,
  setCartesianProduct,
  setDifference,
  setIntersection,
  setUnion,
} from "./set-ops";
import { UnionBlock } from "./union/definition";

const ctx = { signal: new AbortController().signal };

function makeSet(elements: ReadonlyArray<number>): MathValue {
  return computeSet(elements);
}

function getIntegers(v: MathValue): ReadonlyArray<number> {
  const payload = v.payload as SetPayload;
  return payload.map((mv) => mv.payload as number);
}

function asSortedSet(elems: ReadonlyArray<number>): Set<number> {
  return new Set(elems);
}

// ──────────────────────────────────────────────────────────────────────
// setUnion
// ──────────────────────────────────────────────────────────────────────

describe("setUnion", () => {
  test("disjoint sets: union contains all elements", () => {
    const result = setUnion(makeSet([1, 2]), makeSet([3, 4]));
    expect(asSortedSet(getIntegers(result))).toEqual(new Set([1, 2, 3, 4]));
  });

  test("overlapping sets: duplicates removed", () => {
    const result = setUnion(makeSet([1, 2, 3]), makeSet([2, 3, 4]));
    expect(asSortedSet(getIntegers(result))).toEqual(new Set([1, 2, 3, 4]));
  });

  test("union with empty set is identity", () => {
    const s = makeSet([1, 2, 3]);
    expect(asSortedSet(getIntegers(setUnion(s, makeSet([]))))).toEqual(new Set([1, 2, 3]));
    expect(asSortedSet(getIntegers(setUnion(makeSet([]), s)))).toEqual(new Set([1, 2, 3]));
  });

  test("throws SetOpError when A is not a Set", () => {
    const notASet: MathValue = {
      type: { kind: "Scalar", field: "integer", precision: "exact" },
      payload: 1,
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(() => setUnion(notASet, makeSet([1]))).toThrow(SetOpError);
  });

  test("property: commutativity (A ∪ B = B ∪ A as sets)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        (a, b) => {
          const ab = asSortedSet(getIntegers(setUnion(makeSet(a), makeSet(b))));
          const ba = asSortedSet(getIntegers(setUnion(makeSet(b), makeSet(a))));
          expect(ab).toEqual(ba);
        },
      ),
    );
  });

  test("property: idempotence (A ∪ A = A)", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 15 }), (a) => {
        const s = makeSet(a);
        const result = asSortedSet(getIntegers(setUnion(s, s)));
        const original = asSortedSet(getIntegers(s));
        expect(result).toEqual(original);
      }),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// setIntersection
// ──────────────────────────────────────────────────────────────────────

describe("setIntersection", () => {
  test("overlapping sets: only common elements", () => {
    const result = setIntersection(makeSet([1, 2, 3]), makeSet([2, 3, 4]));
    expect(asSortedSet(getIntegers(result))).toEqual(new Set([2, 3]));
  });

  test("disjoint sets: empty intersection", () => {
    const result = setIntersection(makeSet([1, 2]), makeSet([3, 4]));
    expect(getIntegers(result)).toHaveLength(0);
  });

  test("intersection with empty set is empty", () => {
    expect(getIntegers(setIntersection(makeSet([1, 2]), makeSet([])))).toHaveLength(0);
  });

  test("throws SetOpError when A is not a Set", () => {
    const notASet: MathValue = {
      type: { kind: "Scalar", field: "integer", precision: "exact" },
      payload: 1,
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(() => setIntersection(notASet, makeSet([1]))).toThrow(SetOpError);
  });

  test("property: commutativity (A ∩ B = B ∩ A as sets)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        (a, b) => {
          const ab = asSortedSet(getIntegers(setIntersection(makeSet(a), makeSet(b))));
          const ba = asSortedSet(getIntegers(setIntersection(makeSet(b), makeSet(a))));
          expect(ab).toEqual(ba);
        },
      ),
    );
  });

  test("property: A ∩ B ⊆ A", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        (a, b) => {
          const aSet = asSortedSet(getIntegers(makeSet(a)));
          const inter = getIntegers(setIntersection(makeSet(a), makeSet(b)));
          for (const x of inter) {
            expect(aSet.has(x)).toBe(true);
          }
        },
      ),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// setDifference
// ──────────────────────────────────────────────────────────────────────

describe("setDifference", () => {
  test("basic difference", () => {
    const result = setDifference(makeSet([1, 2, 3, 4]), makeSet([2, 4]));
    expect(asSortedSet(getIntegers(result))).toEqual(new Set([1, 3]));
  });

  test("A ∖ ∅ = A", () => {
    const s = makeSet([1, 2, 3]);
    expect(asSortedSet(getIntegers(setDifference(s, makeSet([]))))).toEqual(new Set([1, 2, 3]));
  });

  test("A ∖ A = ∅", () => {
    const s = makeSet([1, 2, 3]);
    expect(getIntegers(setDifference(s, s))).toHaveLength(0);
  });

  test("throws SetOpError when A is not a Set", () => {
    const notASet: MathValue = {
      type: { kind: "Scalar", field: "integer", precision: "exact" },
      payload: 1,
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(() => setDifference(notASet, makeSet([1]))).toThrow(SetOpError);
  });

  test("property: A ∖ B is disjoint from B", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        (a, b) => {
          const bSet = asSortedSet(getIntegers(makeSet(b)));
          const diff = getIntegers(setDifference(makeSet(a), makeSet(b)));
          for (const x of diff) {
            expect(bSet.has(x)).toBe(false);
          }
        },
      ),
    );
  });

  test("property: |A ∖ B| + |A ∩ B| = |A|", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        fc.array(fc.integer({ min: 0, max: 20 }), { maxLength: 10 }),
        (a, b) => {
          const aSet = makeSet(a);
          const bSet = makeSet(b);
          const diffSize = getIntegers(setDifference(aSet, bSet)).length;
          const interSize = getIntegers(setIntersection(aSet, bSet)).length;
          const aSize = getIntegers(aSet).length;
          expect(diffSize + interSize).toBe(aSize);
        },
      ),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// setCartesianProduct
// ──────────────────────────────────────────────────────────────────────

describe("setCartesianProduct", () => {
  test("2×2 product has 4 pairs", () => {
    const result = setCartesianProduct(makeSet([1, 2]), makeSet([3, 4]));
    const payload = result.payload as SetPayload;
    expect(payload).toHaveLength(4);
  });

  test("A × ∅ = ∅", () => {
    const result = setCartesianProduct(makeSet([1, 2, 3]), makeSet([]));
    expect(result.payload as SetPayload).toHaveLength(0);
  });

  test("output type is Set<Tuple>", () => {
    const result = setCartesianProduct(makeSet([1]), makeSet([2]));
    expect(result.type.kind).toBe("Set");
    if (result.type.kind === "Set") {
      expect(result.type.element.kind).toBe("Tuple");
    }
  });

  test("property: |A × B| = |A| × |B|", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { maxLength: 6 }),
        fc.array(fc.integer({ min: 0, max: 10 }), { maxLength: 6 }),
        (a, b) => {
          const aSet = makeSet(a);
          const bSet = makeSet(b);
          const product = setCartesianProduct(aSet, bSet);
          const aSize = getIntegers(aSet).length;
          const bSize = getIntegers(bSet).length;
          expect((product.payload as SetPayload).length).toBe(aSize * bSize);
        },
      ),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// Block interface smoke tests
// ──────────────────────────────────────────────────────────────────────

describe("UnionBlock", () => {
  test("has id discrete.union", () => expect(UnionBlock.id).toBe("discrete.union"));
  test("compute returns correct union", () => {
    const result = UnionBlock.compute(
      { A: makeSet([1, 2]), B: makeSet([2, 3]) },
      {},
      ctx,
    ) as MathValue;
    expect(asSortedSet(getIntegers(result))).toEqual(new Set([1, 2, 3]));
  });
  test("throws when A missing", () => {
    expect(() => UnionBlock.compute({ B: makeSet([1]) }, {}, ctx)).toThrow(SetOpError);
  });
});

describe("IntersectionBlock", () => {
  test("has id discrete.intersection", () =>
    expect(IntersectionBlock.id).toBe("discrete.intersection"));
  test("compute returns correct intersection", () => {
    const result = IntersectionBlock.compute(
      { A: makeSet([1, 2, 3]), B: makeSet([2, 3, 4]) },
      {},
      ctx,
    ) as MathValue;
    expect(asSortedSet(getIntegers(result))).toEqual(new Set([2, 3]));
  });
});

describe("DifferenceBlock", () => {
  test("has id discrete.difference", () => expect(DifferenceBlock.id).toBe("discrete.difference"));
  test("compute returns correct difference", () => {
    const result = DifferenceBlock.compute(
      { A: makeSet([1, 2, 3]), B: makeSet([2]) },
      {},
      ctx,
    ) as MathValue;
    expect(asSortedSet(getIntegers(result))).toEqual(new Set([1, 3]));
  });
});

describe("CartesianProductBlock", () => {
  test("has id discrete.cartesian-product", () =>
    expect(CartesianProductBlock.id).toBe("discrete.cartesian-product"));
  test("compute returns correct product size", () => {
    const result = CartesianProductBlock.compute(
      { A: makeSet([1, 2]), B: makeSet([3, 4, 5]) },
      {},
      ctx,
    ) as MathValue;
    expect(result.payload as SetPayload).toHaveLength(6);
  });
});
