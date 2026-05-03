/**
 * Cross-engine tests for la.matmul — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-matrix.json.
 *
 * The la-matrix fixture stores A·B in the `AB` field for both square and
 * non-square cases.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { loadMatrixFixture } from "../../../../tests/sympy-reference";
import { computeMatMul } from "./compute";

const fixture = loadMatrixFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: {
      kind: "Matrix",
      m: payload.length,
      n: payload[0]?.length ?? 0,
      field: "real",
    },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("la.matmul cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.squareCases.length).toBeGreaterThan(0);
    expect(fixture.nonSquareCases.length).toBeGreaterThan(0);
  });

  describe("A·B matches SymPy reference — square cases", () => {
    for (const c of fixture.squareCases) {
      const n = c.A.length;
      test(`${n}×${n}`, () => {
        const result = computeMatMul({ A: mvalue(c.A), B: mvalue(c.B) });
        expect(result.payload).toEqual(c.AB);
      });
    }
  });

  describe("A·B matches SymPy reference — non-square cases", () => {
    for (const c of fixture.nonSquareCases) {
      const m = c.A.length;
      const k = c.A[0]?.length ?? 0;
      const n = c.B[0]?.length ?? 0;
      test(`${m}×${k} · ${k}×${n}`, () => {
        const result = computeMatMul({ A: mvalue(c.A), B: mvalue(c.B) });
        expect(result.payload).toEqual(c.AB);
      });
    }
  });

  test("output type has correct dimensions for all square cases", () => {
    for (const c of fixture.squareCases) {
      const n = c.A.length;
      const result = computeMatMul({ A: mvalue(c.A), B: mvalue(c.B) });
      const t = result.type as { m: number; n: number };
      expect(t.m).toBe(n);
      expect(t.n).toBe(n);
    }
  });

  test("output type has correct dimensions for all non-square cases", () => {
    for (const c of fixture.nonSquareCases) {
      const m = c.A.length;
      const n = c.B[0]?.length ?? 0;
      const result = computeMatMul({ A: mvalue(c.A), B: mvalue(c.B) });
      const t = result.type as { m: number; n: number };
      expect(t.m).toBe(m);
      expect(t.n).toBe(n);
    }
  });
});
