import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import type { MathValue } from "~/math/types";
import { invertibleMatrix, singularMatrix } from "../../../../tests/arbitraries";
import { computeInverse, InverseError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function isApproxIdentity(m: number[][]): boolean {
  const n = m.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const expected = i === j ? 1 : 0;
      if (Math.abs((m[i]?.[j] ?? 0) - expected) > 1e-6) return false;
    }
  }
  return true;
}

describe("la.inverse compute", () => {
  test("inverse of 2×2 identity is identity", () => {
    const result = computeInverse({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    expect(result.payload).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  test("inverse of [[2,0],[0,4]] is [[0.5,0],[0,0.25]]", () => {
    const result = computeInverse({
      A: mvalue([
        [2, 0],
        [0, 4],
      ]),
    });
    expect(result.payload).toEqual([
      [0.5, 0],
      [0, 0.25],
    ]);
  });

  test("inverse of [[1,2],[3,4]] is [[-2,1],[1.5,-0.5]]", () => {
    const result = computeInverse({
      A: mvalue([
        [1, 2],
        [3, 4],
      ]),
    });
    const p = result.payload as number[][];
    expect(p[0]?.[0]).toBeCloseTo(-2, 10);
    expect(p[0]?.[1]).toBeCloseTo(1, 10);
    expect(p[1]?.[0]).toBeCloseTo(1.5, 10);
    expect(p[1]?.[1]).toBeCloseTo(-0.5, 10);
  });

  test("rejects singular matrix with typed error", () => {
    expect(() =>
      computeInverse({
        A: mvalue([
          [1, 2],
          [2, 4],
        ]),
      }),
    ).toThrow(InverseError);
  });

  test("rejects non-square matrix with typed error", () => {
    expect(() =>
      computeInverse({
        A: mvalue([
          [1, 2, 3],
          [4, 5, 6],
        ]),
      }),
    ).toThrow(InverseError);
  });

  test("rejects missing input", () => {
    expect(() => computeInverse({})).toThrow(InverseError);
  });

  test("property: A · A⁻¹ === I", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) => invertibleMatrix(n)),
        (A) => {
          const Ainv = computeInverse({ A: mvalue(A) });
          const product = computeMatMul({ A: mvalue(A), B: Ainv }).payload as number[][];
          expect(isApproxIdentity(product)).toBe(true);
        },
      ),
    );
  });

  test("property: (A⁻¹)⁻¹ === A", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) => invertibleMatrix(n)),
        (A) => {
          const Ainv = computeInverse({ A: mvalue(A) });
          const Ainvinv = computeInverse({ A: Ainv }).payload as number[][];
          const n = A.length;
          for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
              expect(Ainvinv[i]?.[j] ?? 0).toBeCloseTo(A[i]?.[j] ?? 0, 6);
            }
          }
        },
      ),
    );
  });

  test("property: (A·B)⁻¹ === B⁻¹ · A⁻¹", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((n) => fc.tuple(invertibleMatrix(n), invertibleMatrix(n))),
        ([A, B]) => {
          const AB = computeMatMul({ A: mvalue(A), B: mvalue(B) });
          const ABinv = computeInverse({ A: AB }).payload as number[][];
          const Binv = computeInverse({ A: mvalue(B) });
          const Ainv = computeInverse({ A: mvalue(A) });
          const BinvAinv = computeMatMul({ A: Binv, B: Ainv }).payload as number[][];
          const n = A.length;
          for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
              expect(ABinv[i]?.[j] ?? 0).toBeCloseTo(BinvAinv[i]?.[j] ?? 0, 5);
            }
          }
        },
      ),
    );
  });

  test("property: singular matrices throw InverseError", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) => singularMatrix(n)),
        (S) => {
          expect(() => computeInverse({ A: mvalue(S) })).toThrow(InverseError);
        },
      ),
    );
  });
});
