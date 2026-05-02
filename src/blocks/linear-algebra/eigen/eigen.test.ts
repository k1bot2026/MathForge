import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import { computeTranspose } from "~/blocks/linear-algebra/transpose/compute";
import type { MathValue } from "~/math/types";
import { computeEigen, EigenError, type EigenPayload } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const PREC = 1e-6;

function approxEqVec(a: number[], b: number[], tol = PREC): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => Math.abs(x - (b[i] ?? 0)) < tol);
}

const symmetricMatrix = (n: number) =>
  fc
    .array(fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }), {
      minLength: n,
      maxLength: n,
    })
    .map((rows) =>
      // Symmetrize: S = A + Aᵀ (guarantees real eigenvalues)
      rows.map((row, i) => row.map((_, j) => (rows[i]?.[j] ?? 0) + (rows[j]?.[i] ?? 0))),
    );

describe("la.eigen compute", () => {
  test("eigenvalues of 2×2 diagonal [[2,0],[0,3]] are [2,3]", () => {
    const { eigenvalues } = computeEigen({
      A: mvalue([
        [2, 0],
        [0, 3],
      ]),
    }).payload as EigenPayload;
    const sorted = [...eigenvalues].sort((a, b) => a - b);
    expect(sorted[0]).toBeCloseTo(2, 6);
    expect(sorted[1]).toBeCloseTo(3, 6);
  });

  test("eigenvalues of 2×2 [[1,2],[2,1]] are [-1, 3]", () => {
    const { eigenvalues } = computeEigen({
      A: mvalue([
        [1, 2],
        [2, 1],
      ]),
    }).payload as EigenPayload;
    const sorted = [...eigenvalues].sort((a, b) => a - b);
    expect(sorted[0]).toBeCloseTo(-1, 6);
    expect(sorted[1]).toBeCloseTo(3, 6);
  });

  test("output type is Tuple of Vector + Matrix", () => {
    const result = computeEigen({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    expect(result.type.kind).toBe("Tuple");
  });

  test("rejects non-square matrix", () => {
    expect(() =>
      computeEigen({
        A: mvalue([
          [1, 2, 3],
          [4, 5, 6],
        ]),
      }),
    ).toThrow(EigenError);
  });

  test("rejects missing input", () => {
    expect(() => computeEigen({})).toThrow(EigenError);
  });

  test("rejects matrix with complex eigenvalues (rotation [[0,-1],[1,0]])", () => {
    expect(() =>
      computeEigen({
        A: mvalue([
          [0, -1],
          [1, 0],
        ]),
      }),
    ).toThrow(EigenError);
  });

  test("property: A · v === λ · v for each eigenpair (symmetric matrices, tol 1e-5)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) => symmetricMatrix(n)),
        (A) => {
          const { eigenvalues, eigenvectors } = computeEigen({
            A: mvalue(A),
          }).payload as EigenPayload;
          const n = A.length;
          for (let k = 0; k < n; k++) {
            const lambda = eigenvalues[k] ?? 0;
            // Extract column k from eigenvectors matrix
            const v = eigenvectors.map((row) => row[k] ?? 0);
            // Compute A·v
            const Av = A.map((row) => row.reduce((sum, aij, j) => sum + aij * (v[j] ?? 0), 0));
            // Compute λ·v
            const lambdaV = v.map((x) => lambda * x);
            expect(approxEqVec(Av, lambdaV, 1e-5)).toBe(true);
          }
        },
      ),
    );
  });

  test("property: eigenvectors of symmetric matrix are orthonormal (Vᵀ·V = I, tol 1e-5)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) => symmetricMatrix(n)),
        (A) => {
          const { eigenvectors } = computeEigen({ A: mvalue(A) }).payload as EigenPayload;
          const n = A.length;
          const V = mvalue(eigenvectors);
          const Vt = computeTranspose({ A: V }).payload as number[][];
          const VtV = computeMatMul({ A: mvalue(Vt), B: V }).payload as number[][];
          // Check approximate identity
          for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
              const expected = i === j ? 1 : 0;
              expect(Math.abs((VtV[i]?.[j] ?? 0) - expected)).toBeLessThan(1e-5);
            }
          }
        },
      ),
    );
  });
});
