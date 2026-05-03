import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import { computeTranspose } from "~/blocks/linear-algebra/transpose/compute";
import type { MathValue } from "~/math/types";
import { computeSvd, SvdError, type SvdPayload } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const PREC = 1e-5;

function approxEqual(a: number[][], b: number[][], tol = PREC): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i] ?? [];
    const rb = b[i] ?? [];
    if (ra.length !== rb.length) return false;
    for (let j = 0; j < ra.length; j++) {
      if (Math.abs((ra[j] ?? 0) - (rb[j] ?? 0)) > tol) return false;
    }
  }
  return true;
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

/** Expand singular values S into an m×n diagonal matrix Σ. */
function diag(S: number[], m: number, n: number): number[][] {
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? (S[i] ?? 0) : 0)),
  );
}

const intMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

describe("la.svd compute", () => {
  test("rejects missing input", () => {
    expect(() => computeSvd({})).toThrow(SvdError);
  });

  test("output type is Tuple of Matrix, Vector, Matrix", () => {
    const result = computeSvd({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    expect(result.type.kind).toBe("Tuple");
    if (result.type.kind === "Tuple") {
      expect(result.type.elements[0]?.kind).toBe("Matrix");
      expect(result.type.elements[1]?.kind).toBe("Vector");
      expect(result.type.elements[2]?.kind).toBe("Matrix");
    }
  });

  test("SVD of 2×2 identity: S=[1,1]", () => {
    const { S } = computeSvd({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    }).payload as SvdPayload;
    expect(S).toHaveLength(2);
    expect(S[0]).toBeCloseTo(1, 5);
    expect(S[1]).toBeCloseTo(1, 5);
  });

  test("SVD of 2×2 diagonal [[3,0],[0,2]]: S=[3,2]", () => {
    const { S } = computeSvd({
      A: mvalue([
        [3, 0],
        [0, 2],
      ]),
    }).payload as SvdPayload;
    const sorted = [...S].sort((a, b) => b - a);
    expect(sorted[0]).toBeCloseTo(3, 5);
    expect(sorted[1]).toBeCloseTo(2, 5);
  });

  test("SVD of rank-1 matrix has exactly one non-zero singular value", () => {
    const { S } = computeSvd({
      A: mvalue([
        [1, 2],
        [2, 4],
      ]),
    }).payload as SvdPayload;
    expect(S).toHaveLength(2);
    expect(S[0]).toBeGreaterThan(PREC);
    expect(Math.abs(S[1] ?? 0)).toBeLessThan(PREC);
  });

  test("property: A = U·diag(S)·Vᵀ for square matrices (tol 1e-5)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(n, n)),
        (A) => {
          const m = A.length;
          const n = A[0]?.length ?? 0;
          const { U, S, V } = computeSvd({ A: mvalue(A) }).payload as SvdPayload;
          const Sigma = diag(S, m, n);
          const Vt = computeTranspose({ A: mvalue(V) }).payload as number[][];
          const SigmaVt = computeMatMul({ A: mvalue(Sigma), B: mvalue(Vt) }).payload as number[][];
          const reconstructed = computeMatMul({
            A: mvalue(U),
            B: mvalue(SigmaVt),
          }).payload as number[][];
          expect(approxEqual(A, reconstructed, 1e-5)).toBe(true);
        },
      ),
    );
  });

  test("property: A = U·diag(S)·Vᵀ for rectangular matrices m≥n (tol 1e-5)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((n) =>
            fc.integer({ min: n, max: Math.min(n + 2, 4) }).chain((m) => intMatrix(m, n)),
          ),
        (A) => {
          const m = A.length;
          const n = A[0]?.length ?? 0;
          const { U, S, V } = computeSvd({ A: mvalue(A) }).payload as SvdPayload;
          const Sigma = diag(S, m, n);
          const Vt = computeTranspose({ A: mvalue(V) }).payload as number[][];
          const SigmaVt = computeMatMul({ A: mvalue(Sigma), B: mvalue(Vt) }).payload as number[][];
          const reconstructed = computeMatMul({
            A: mvalue(U),
            B: mvalue(SigmaVt),
          }).payload as number[][];
          expect(approxEqual(A, reconstructed, 1e-5)).toBe(true);
        },
      ),
    );
  });

  test("property: U is orthogonal — Uᵀ·U ≈ I (tol 1e-5)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(n, n)),
        (A) => {
          const m = A.length;
          const { U } = computeSvd({ A: mvalue(A) }).payload as SvdPayload;
          const Ut = computeTranspose({ A: mvalue(U) }).payload as number[][];
          const UtU = computeMatMul({ A: mvalue(Ut), B: mvalue(U) }).payload as number[][];
          expect(approxEqual(UtU, identity(m), 1e-5)).toBe(true);
        },
      ),
    );
  });

  test("property: V is orthogonal — Vᵀ·V ≈ I (tol 1e-5)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(n, n)),
        (A) => {
          const n = A[0]?.length ?? 0;
          const { V } = computeSvd({ A: mvalue(A) }).payload as SvdPayload;
          const Vt = computeTranspose({ A: mvalue(V) }).payload as number[][];
          const VtV = computeMatMul({ A: mvalue(Vt), B: mvalue(V) }).payload as number[][];
          expect(approxEqual(VtV, identity(n), 1e-5)).toBe(true);
        },
      ),
    );
  });

  test("property: singular values are non-negative and descending", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(n, n)),
        (A) => {
          const { S } = computeSvd({ A: mvalue(A) }).payload as SvdPayload;
          for (const s of S) {
            expect(s).toBeGreaterThanOrEqual(-PREC);
          }
          for (let i = 0; i < S.length - 1; i++) {
            expect((S[i] ?? 0) + PREC).toBeGreaterThanOrEqual(S[i + 1] ?? 0);
          }
        },
      ),
    );
  });
});
