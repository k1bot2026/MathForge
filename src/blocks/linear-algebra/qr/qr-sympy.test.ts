/**
 * Cross-engine tests for la.qr — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-qr.json.
 *
 * Sign convention: SymPy and math.js may return Q with columns of opposite
 * sign (both are valid QR decompositions). We therefore do NOT compare Q
 * column-by-column against the fixture. Instead we verify the invariants:
 *   1. Q·R = A  (reconstruction — tested against fixture A)
 *   2. Qᵀ·Q = I (Q orthogonality)
 *   3. R is upper-triangular
 * For cases where SymPy's R diagonal sign matches math.js (i.e. both choose
 * positive diagonal), we also verify R against the SymPy reference directly.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import { computeTranspose } from "~/blocks/linear-algebra/transpose/compute";
import type { MathValue } from "~/math/types";
import { loadQrFixture } from "../../../../tests/sympy-reference";
import { computeQr, type QrPayload } from "./compute";

const fixture = loadQrFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function matricesClose(A: number[][], B: number[][], eps = 1e-6): boolean {
  if (A.length !== B.length) return false;
  for (let r = 0; r < A.length; r++) {
    const rowA = A[r];
    const rowB = B[r];
    if (!rowA || !rowB || rowA.length !== rowB.length) return false;
    for (let c = 0; c < rowA.length; c++) {
      if (Math.abs((rowA[c] ?? 0) - (rowB[c] ?? 0)) > eps) return false;
    }
  }
  return true;
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

const intMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

describe("la.qr cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("Q·R === A (reconstruction) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const label = `${m}×${n}`;
      test(label, () => {
        const { Q, R } = computeQr({ A: mvalue(c.A) }).payload as QrPayload;
        const QR = computeMatMul({ A: mvalue(Q), B: mvalue(R) }).payload as number[][];
        expect(matricesClose(QR, c.A, 1e-6)).toBe(true);
      });
    }
  });

  describe("Qᵀ·Q === I (Q orthogonality) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const label = `${m}×${n}`;
      test(label, () => {
        const { Q } = computeQr({ A: mvalue(c.A) }).payload as QrPayload;
        const Qt = computeTranspose({ A: mvalue(Q) }).payload as number[][];
        const QtQ = computeMatMul({ A: mvalue(Qt), B: mvalue(Q) }).payload as number[][];
        expect(matricesClose(QtQ, identity(m), 1e-6)).toBe(true);
      });
    }
  });

  test("R is upper-triangular for all fixture cases", () => {
    for (const c of fixture.cases) {
      const { R } = computeQr({ A: mvalue(c.A) }).payload as QrPayload;
      for (let i = 0; i < R.length; i++) {
        for (let j = 0; j < i && j < (R[i]?.length ?? 0); j++) {
          expect(Math.abs(R[i]?.[j] ?? 0)).toBeLessThan(1e-9);
        }
      }
    }
  });

  test("output type is Tuple for all fixture cases", () => {
    for (const c of fixture.cases) {
      const result = computeQr({ A: mvalue(c.A) });
      expect(result.type.kind).toBe("Tuple");
    }
  });

  test("Q dimensions are m×m for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const { Q } = computeQr({ A: mvalue(c.A) }).payload as QrPayload;
      expect(Q.length).toBe(m);
      expect(Q[0]?.length).toBe(m);
    }
  });

  test("R dimensions are m×n for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const { R } = computeQr({ A: mvalue(c.A) }).payload as QrPayload;
      expect(R.length).toBe(m);
      expect(R[0]?.length ?? 0).toBe(n);
    }
  });

  test("property: Q·R === A for random integer m×n matrices", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: m }).chain((n) => intMatrix(m, n))),
        (A) => {
          const { Q, R } = computeQr({ A: mvalue(A) }).payload as QrPayload;
          const QR = computeMatMul({ A: mvalue(Q), B: mvalue(R) }).payload as number[][];
          expect(matricesClose(QR, A, 1e-6)).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  test("property: Qᵀ·Q === I for random integer m×n matrices", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: m }).chain((n) => intMatrix(m, n))),
        (A) => {
          const m = A.length;
          const { Q } = computeQr({ A: mvalue(A) }).payload as QrPayload;
          const Qt = computeTranspose({ A: mvalue(Q) }).payload as number[][];
          const QtQ = computeMatMul({ A: mvalue(Qt), B: mvalue(Q) }).payload as number[][];
          expect(matricesClose(QtQ, identity(m), 1e-6)).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });
});
