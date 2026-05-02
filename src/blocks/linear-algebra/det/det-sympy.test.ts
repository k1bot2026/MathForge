/**
 * Cross-engine tests for la.det — compares our native implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-det-multiplicativity.json and
 * the square-case detA field in la-matrix.json.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import {
  loadDetMultiplicativityFixture,
  loadMatrixFixture,
} from "../../../../tests/sympy-reference";
import { computeDet } from "./compute";

const detFixture = loadDetMultiplicativityFixture();
const matrixFixture = loadMatrixFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("la.det cross-engine (SymPy fixtures)", () => {
  test("fixtures are present and non-empty", () => {
    expect(detFixture.schemaVersion).toBe(1);
    expect(detFixture.cases.length).toBeGreaterThan(0);
    expect(matrixFixture.squareCases.length).toBeGreaterThan(0);
  });

  describe("computeDet matches SymPy detA (from la-matrix.json square cases)", () => {
    for (const c of matrixFixture.squareCases) {
      const n = c.A.length;
      const label = `${n}×${n} A`;
      test(label, () => {
        const d = computeDet({ A: mvalue(c.A) }).payload as number;
        expect(Math.round(d)).toBe(c.detA);
      });
    }
  });

  describe("computeDet matches SymPy detA (from la-det-multiplicativity.json)", () => {
    for (const c of detFixture.cases) {
      const n = c.A.length;
      const label = `${n}×${n}`;
      test(label, () => {
        const dA = computeDet({ A: mvalue(c.A) }).payload as number;
        const dB = computeDet({ A: mvalue(c.B) }).payload as number;
        expect(Math.round(dA)).toBe(c.detA);
        expect(Math.round(dB)).toBe(c.detB);
      });
    }
  });

  test("det(A·B) === det(A) · det(B) for all multiplicativity fixture cases", () => {
    for (const c of detFixture.cases) {
      const dAB = computeDet({ A: mvalue(c.AB) }).payload as number;
      // Both sides are integer-valued; round to absorb floating-point drift.
      expect(Math.round(dAB)).toBe(c.detAB);
      expect(c.detAB).toBe(c.detA * c.detB);
    }
  });

  test("output type is Scalar approximate for all fixture cases", () => {
    for (const c of detFixture.cases) {
      const result = computeDet({ A: mvalue(c.A) });
      expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "approximate" });
    }
  });
});
