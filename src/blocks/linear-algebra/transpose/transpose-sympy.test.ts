/**
 * Cross-engine tests for la.transpose — compares our native implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-transpose.json.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { transpose } from "mathjs";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { loadTransposeFixture } from "../../../../tests/sympy-reference";
import { computeTranspose } from "./compute";

const fixture = loadTransposeFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function normMatrix(m: number[][]): number[][] {
  return m.map((row) => row.map((x) => (x === 0 ? 0 : x)));
}

describe("la.transpose cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("computeTranspose output matches SymPy Aᵀ", () => {
    for (const c of fixture.cases) {
      const label = `${c.A.length}×${c.A[0]?.length ?? 0} → ${c.At.length}×${c.At[0]?.length ?? 0}`;
      test(label, () => {
        const result = computeTranspose({ A: mvalue(c.A) });
        expect(normMatrix(result.payload as number[][])).toEqual(c.At);
      });
    }
  });

  describe("math.js transpose matches SymPy Aᵀ", () => {
    for (const c of fixture.cases) {
      const label = `mathjs ${c.A.length}×${c.A[0]?.length ?? 0}`;
      test(label, () => {
        const result = normMatrix(transpose(c.A) as number[][]);
        expect(result).toEqual(c.At);
      });
    }
  });

  test("involution: (Aᵀ)ᵀ = A for all fixture cases", () => {
    for (const c of fixture.cases) {
      const At = computeTranspose({ A: mvalue(c.A) });
      const Att = computeTranspose({ A: At });
      expect(normMatrix(Att.payload as number[][])).toEqual(c.A);
    }
  });

  test("output type is n×m when input is m×n for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const result = computeTranspose({ A: mvalue(c.A) });
      const t = result.type as { m: number; n: number };
      expect(t.m).toBe(n);
      expect(t.n).toBe(m);
    }
  });

  test("fixture Aᵀ dimensions are n×m (matches expected reversal)", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      expect(c.At.length).toBe(n);
      expect(c.At[0]?.length ?? 0).toBe(m);
    }
  });
});
