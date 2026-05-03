/**
 * Cross-engine tests for la.project — compares our math.js implementation
 * of A·(AᵀA)⁻¹·Aᵀ·v against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-project.json.
 *
 * Key invariants verified:
 *   1. P·v matches SymPy reference exactly (same formula, exact rational SymPy).
 *   2. P(P·v) ≈ P·v — idempotence of the projection.
 *   3. v − P·v is orthogonal to all columns of A.
 *   4. Output type is Vector<m>.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { loadProjectFixture } from "../../../../tests/sympy-reference";
import { computeProject } from "./compute";

const fixture = loadProjectFixture();

function mmatrix(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function mvector(payload: number[]): MathValue {
  return {
    type: { kind: "Vector", n: payload.length, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function dot(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
}

describe("la.project cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("P·v matches SymPy reference for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      test(`${m}×${n} subspace, v length ${c.v.length}`, () => {
        const result = computeProject({ A: mmatrix(c.A), v: mvector(c.v) });
        const Pv = result.payload as number[];
        for (let i = 0; i < c.Pv.length; i++) {
          expect(Math.abs((Pv[i] ?? 0) - (c.Pv[i] ?? 0))).toBeLessThan(1e-9);
        }
      });
    }
  });

  test("P(P·v) ≈ P·v — idempotence for all fixture cases (tol 1e-9)", () => {
    for (const c of fixture.cases) {
      const Pv = computeProject({ A: mmatrix(c.A), v: mvector(c.v) }).payload as number[];
      const PPv = computeProject({ A: mmatrix(c.A), v: mvector(Pv) }).payload as number[];
      for (let i = 0; i < Pv.length; i++) {
        expect(Math.abs((PPv[i] ?? 0) - (Pv[i] ?? 0))).toBeLessThan(1e-9);
      }
    }
  });

  test("v − P·v is orthogonal to all columns of A for all fixture cases (tol 1e-9)", () => {
    for (const c of fixture.cases) {
      const Pv = computeProject({ A: mmatrix(c.A), v: mvector(c.v) }).payload as number[];
      const residual = c.v.map((x, i) => x - (Pv[i] ?? 0));
      // Orthogonality: Aᵀ · residual ≈ 0
      const numCols = c.A[0]?.length ?? 0;
      for (let j = 0; j < numCols; j++) {
        const aCol = c.A.map((row) => row[j] ?? 0);
        expect(Math.abs(dot(aCol, residual))).toBeLessThan(1e-9);
      }
    }
  });

  test("output type is Vector<m> for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const result = computeProject({ A: mmatrix(c.A), v: mvector(c.v) });
      expect(result.type.kind).toBe("Vector");
      if (result.type.kind === "Vector") {
        expect(result.type.n).toBe(m);
      }
    }
  });
});
