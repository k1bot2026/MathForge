import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeRank } from "~/blocks/linear-algebra/rank/compute";
import type { MathValue } from "~/math/types";
import { computeKernel, KernelError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][], m?: number, n?: number): MathValue {
  const rows = m ?? payload.length;
  const cols = n ?? payload[0]?.length ?? 0;
  return {
    type: REAL_MATRIX(rows, cols),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const PREC = 1e-9;

function approxZeroVec(v: number[], tol = PREC): boolean {
  return v.every((x) => Math.abs(x) < tol);
}

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, a, j) => s + a * (x[j] ?? 0), 0));
}

const anyMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -4, max: 4 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

describe("la.kernel compute", () => {
  test("rejects missing input", () => {
    expect(() => computeKernel({})).toThrow(KernelError);
  });

  test("kernel of identity 2×2 is empty (trivial null space)", () => {
    const result = computeKernel({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    expect(result.type.kind).toBe("Matrix");
    if (result.type.kind === "Matrix") {
      expect(result.type.n).toBe(0);
    }
  });

  test("kernel of zero 2×2 is R² — output is 2×2 identity (or any 2×2 basis)", () => {
    const result = computeKernel({
      A: mvalue([
        [0, 0],
        [0, 0],
      ]),
    });
    expect(result.type.kind).toBe("Matrix");
    if (result.type.kind === "Matrix") {
      expect(result.type.m).toBe(2);
      expect(result.type.n).toBe(2);
    }
    // Both columns should be in the null space of zero matrix (trivially satisfied)
    const K = result.payload as number[][];
    const n = K[0]?.length ?? 0;
    for (let j = 0; j < n; j++) {
      const kj = K.map((row) => row[j] ?? 0);
      const Akj = matVec(
        [
          [0, 0],
          [0, 0],
        ],
        kj,
      );
      expect(approxZeroVec(Akj)).toBe(true);
    }
  });

  test("kernel of rank-1 [[1,2],[2,4]] has dimension 1", () => {
    const result = computeKernel({
      A: mvalue([
        [1, 2],
        [2, 4],
      ]),
    });
    expect(result.type.kind).toBe("Matrix");
    if (result.type.kind === "Matrix") {
      expect(result.type.n).toBe(1);
    }
    // Verify the kernel vector: should satisfy A·v = 0
    const K = result.payload as number[][];
    const v = [K[0]?.[0] ?? 0, K[1]?.[0] ?? 0];
    const Av = matVec(
      [
        [1, 2],
        [2, 4],
      ],
      v,
    );
    expect(approxZeroVec(Av, 1e-9)).toBe(true);
  });

  test("kernel of full-rank 2×3 has dimension 1", () => {
    const A = [
      [1, 0, 2],
      [0, 1, 3],
    ];
    const result = computeKernel({ A: mvalue(A) });
    if (result.type.kind === "Matrix") {
      expect(result.type.n).toBe(1);
    }
    const K = result.payload as number[][];
    const v = [K[0]?.[0] ?? 0, K[1]?.[0] ?? 0, K[2]?.[0] ?? 0];
    const Av = matVec(A, v);
    expect(approxZeroVec(Av, 1e-9)).toBe(true);
  });

  test("property: A·ker(A) ≈ 0 for all square matrices (tol 1e-8)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => anyMatrix(n, n)),
        (A) => {
          const result = computeKernel({ A: mvalue(A) });
          const K = result.payload as number[][];
          const nullity = K[0]?.length ?? 0;
          if (nullity === 0) return; // trivial null space — nothing to check
          for (let j = 0; j < nullity; j++) {
            const kj = K.map((row) => row[j] ?? 0);
            const Akj = matVec(A, kj);
            expect(approxZeroVec(Akj, 1e-8)).toBe(true);
          }
        },
      ),
    );
  });

  test("property: A·ker(A) ≈ 0 for rectangular matrices (tol 1e-8)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => anyMatrix(m, n))),
        (A) => {
          const result = computeKernel({ A: mvalue(A) });
          const K = result.payload as number[][];
          const nullity = K[0]?.length ?? 0;
          if (nullity === 0) return;
          for (let j = 0; j < nullity; j++) {
            const kj = K.map((row) => row[j] ?? 0);
            const Akj = matVec(A, kj);
            expect(approxZeroVec(Akj, 1e-8)).toBe(true);
          }
        },
      ),
    );
  });

  test("property: rank + nullity = n for all square matrices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => anyMatrix(n, n)),
        (A) => {
          const n = A[0]?.length ?? 0;
          const rank = computeRank({ A: mvalue(A) }).payload as number;
          const result = computeKernel({ A: mvalue(A) });
          const nullity = result.type.kind === "Matrix" ? (result.type.n as number) : 0;
          expect(rank + nullity).toBe(n);
        },
      ),
    );
  });

  test("property: rank + nullity = n for rectangular matrices", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => anyMatrix(m, n))),
        (A) => {
          const n = A[0]?.length ?? 0;
          const rank = computeRank({ A: mvalue(A) }).payload as number;
          const result = computeKernel({ A: mvalue(A) });
          const nullity = result.type.kind === "Matrix" ? (result.type.n as number) : 0;
          expect(rank + nullity).toBe(n);
        },
      ),
    );
  });
});
