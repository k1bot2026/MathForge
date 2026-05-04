import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { SetPayload } from "~/math/types";
import {
  CombinationsBlock,
  CombinationsError,
  computeCombinations,
} from "./combinations/definition";
import { binomial, makeScalar } from "./combinatorics";
import {
  computePermutations,
  PermutationsBlock,
  PermutationsError,
} from "./permutations/definition";

const ctx = { signal: new AbortController().signal };

function makeSet(elements: ReadonlyArray<number>) {
  return {
    type: {
      kind: "Set" as const,
      element: { kind: "Scalar" as const, field: "integer" as const, precision: "exact" as const },
    },
    payload: elements.map((v) => makeScalar(v)) as SetPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" as const },
  };
}

function getResultCount(v: ReturnType<typeof computePermutations>): number {
  return (v.payload as SetPayload).length;
}

function getTupleValues(
  v: ReturnType<typeof computePermutations>,
): ReadonlyArray<ReadonlyArray<number>> {
  return (v.payload as SetPayload).map((tuple) =>
    (tuple.payload as SetPayload).map((mv) => mv.payload as number),
  );
}

// ──────────────────────────────────────────────────────────────────────
// computePermutations
// ──────────────────────────────────────────────────────────────────────

describe("computePermutations", () => {
  test("|P({1,2,3}, 2)| = 6", () => {
    expect(getResultCount(computePermutations([1, 2, 3], 2))).toBe(6);
  });

  test("|P({1,2,3,4}, 3)| = 24", () => {
    expect(getResultCount(computePermutations([1, 2, 3, 4], 3))).toBe(24);
  });

  test("P(S, 0) = 1 empty tuple", () => {
    expect(getResultCount(computePermutations([1, 2], 0))).toBe(1);
    expect(getTupleValues(computePermutations([1, 2], 0))).toEqual([[]]);
  });

  test("P(S, n) = n! permutations", () => {
    const res = computePermutations([1, 2, 3], 3);
    expect(getResultCount(res)).toBe(6);
  });

  test("all elements in each permutation are distinct", () => {
    const tuples = getTupleValues(computePermutations([1, 2, 3, 4], 3));
    for (const t of tuples) {
      expect(new Set(t).size).toBe(t.length);
    }
  });

  test("output type is Set<Tuple>", () => {
    const res = computePermutations([1, 2], 2);
    expect(res.type.kind).toBe("Set");
    if (res.type.kind === "Set") {
      expect(res.type.element.kind).toBe("Tuple");
    }
  });

  test("throws when k > |S|", () => {
    expect(() => computePermutations([1, 2], 3)).toThrow(PermutationsError);
  });

  test("throws on negative k", () => {
    expect(() => computePermutations([1, 2, 3], -1)).toThrow(PermutationsError);
  });

  test("property: |P(S,k)| = n!/(n-k)!", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 0, maxLength: 6 }),
        fc.integer({ min: 0, max: 5 }),
        (arr, k) => {
          const unique = [...new Set(arr)];
          fc.pre(k <= unique.length);
          const n = unique.length;
          let expected = 1;
          for (let i = n; i > n - k; i--) expected *= i;
          expect(getResultCount(computePermutations(unique, k))).toBe(expected);
        },
      ),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// computeCombinations
// ──────────────────────────────────────────────────────────────────────

describe("computeCombinations", () => {
  test("|C({1,2,3,4,5}, 3)| = 10", () => {
    expect(getResultCount(computeCombinations([1, 2, 3, 4, 5], 3))).toBe(10);
  });

  test("C(S, 0) = 1 empty tuple", () => {
    expect(getResultCount(computeCombinations([1, 2, 3], 0))).toBe(1);
  });

  test("C(S, n) = 1 (whole set)", () => {
    expect(getResultCount(computeCombinations([1, 2, 3], 3))).toBe(1);
  });

  test("each combination is sorted ascending", () => {
    const tuples = getTupleValues(computeCombinations([3, 1, 4, 2], 2));
    for (const t of tuples) {
      for (let i = 1; i < t.length; i++) {
        expect(t[i] ?? 0).toBeGreaterThan(t[i - 1] ?? 0);
      }
    }
  });

  test("throws when k > |S|", () => {
    expect(() => computeCombinations([1, 2], 3)).toThrow(CombinationsError);
  });

  test("output type is Set<Tuple>", () => {
    const res = computeCombinations([1, 2, 3], 2);
    expect(res.type.kind).toBe("Set");
    if (res.type.kind === "Set") {
      expect(res.type.element.kind).toBe("Tuple");
    }
  });

  test("property: |C(S,k)| = C(n,k)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 20 }), { minLength: 0, maxLength: 8 }),
        fc.integer({ min: 0, max: 7 }),
        (arr, k) => {
          const unique = [...new Set(arr)];
          fc.pre(k <= unique.length);
          const n = unique.length;
          expect(getResultCount(computeCombinations(unique, k))).toBe(binomial(n, k));
        },
      ),
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// Block smoke tests
// ──────────────────────────────────────────────────────────────────────

describe("PermutationsBlock", () => {
  test("id is discrete.permutations", () =>
    expect(PermutationsBlock.id).toBe("discrete.permutations"));

  test("P({1,2,3}, k=2) has 6 results", () => {
    const r = PermutationsBlock.compute({ S: makeSet([1, 2, 3]), k: makeScalar(2) }, {}, ctx);
    expect(getResultCount(r as ReturnType<typeof computePermutations>)).toBe(6);
  });

  test("throws when S missing", () => {
    expect(() => PermutationsBlock.compute({ k: makeScalar(2) }, {}, ctx)).toThrow(
      PermutationsError,
    );
  });
});

describe("CombinationsBlock", () => {
  test("id is discrete.combinations", () =>
    expect(CombinationsBlock.id).toBe("discrete.combinations"));

  test("C({1,2,3,4}, k=2) has 6 results", () => {
    const r = CombinationsBlock.compute({ S: makeSet([1, 2, 3, 4]), k: makeScalar(2) }, {}, ctx);
    expect(getResultCount(r as ReturnType<typeof computeCombinations>)).toBe(6);
  });

  test("throws when k missing", () => {
    expect(() => CombinationsBlock.compute({ S: makeSet([1, 2, 3]) }, {}, ctx)).toThrow(
      CombinationsError,
    );
  });
});
