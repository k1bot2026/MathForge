/**
 * Cross-engine tests for la.lu — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-lu.json.
 *
 * Key invariant: P·A = L·U exactly (within float tolerance).
 * L is lower-triangular with unit diagonal; U is upper-triangular.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import type { MathValue } from "~/math/types";
import { invertibleMatrix } from "../../../../tests/arbitraries";
import { loadLuFixture } from "../../../../tests/sympy-reference";
import { computeLu, type LuPayload } from "./compute";

const fixture = loadLuFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function matricesClose(A: number[][], B: number[][], eps = 1e-9): boolean {
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

describe("la.lu cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("P·A === L·U for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.A.length;
      const label = `${n}×${n}`;
      test(label, () => {
        const { L, U, P } = computeLu({ A: mvalue(c.A) }).payload as LuPayload;
        const PA = computeMatMul({ A: mvalue(P), B: mvalue(c.A) }).payload as number[][];
        const LU = computeMatMul({ A: mvalue(L), B: mvalue(U) }).payload as number[][];
        expect(matricesClose(PA, LU, 1e-9)).toBe(true);
      });
    }
  });

  test("L is lower-triangular with unit diagonal for all fixture cases", () => {
    for (const c of fixture.cases) {
      const { L } = computeLu({ A: mvalue(c.A) }).payload as LuPayload;
      const n = L.length;
      for (let i = 0; i < n; i++) {
        expect(Math.abs((L[i]?.[i] ?? 0) - 1)).toBeLessThan(1e-9);
        for (let j = i + 1; j < n; j++) {
          expect(Math.abs(L[i]?.[j] ?? 0)).toBeLessThan(1e-9);
        }
      }
    }
  });

  test("U is upper-triangular for all fixture cases", () => {
    for (const c of fixture.cases) {
      const { U } = computeLu({ A: mvalue(c.A) }).payload as LuPayload;
      const n = U.length;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
          expect(Math.abs(U[i]?.[j] ?? 0)).toBeLessThan(1e-9);
        }
      }
    }
  });

  test("output type is Tuple for all fixture cases", () => {
    for (const c of fixture.cases) {
      const result = computeLu({ A: mvalue(c.A) });
      expect(result.type.kind).toBe("Tuple");
    }
  });

  test("property: P·A === L·U for randomly generated invertible matrices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => invertibleMatrix(n)),
        (A) => {
          const { L, U, P } = computeLu({ A: mvalue(A) }).payload as LuPayload;
          const PA = computeMatMul({ A: mvalue(P), B: mvalue(A) }).payload as number[][];
          const LU = computeMatMul({ A: mvalue(L), B: mvalue(U) }).payload as number[][];
          expect(matricesClose(PA, LU, 1e-9)).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });
});
