/**
 * Cross-engine tests for la.matvec — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-matrix.json.
 *
 * The la-matrix fixture stores A·v in the `Av` field for all square cases.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { loadMatrixFixture } from "../../../../tests/sympy-reference";
import { computeMatVec } from "./compute";

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

function vvalue(payload: number[]): MathValue {
  return {
    type: { kind: "Vector", n: payload.length, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("la.matvec cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.squareCases.length).toBeGreaterThan(0);
  });

  describe("A·v matches SymPy reference — square cases", () => {
    for (const c of fixture.squareCases) {
      const n = c.A.length;
      test(`${n}×${n} · ${n}-vector`, () => {
        const result = computeMatVec({ M: mvalue(c.A), v: vvalue(c.v) });
        expect(result.payload).toEqual(c.Av);
      });
    }
  });

  test("output type is Vector with n = number of rows in M", () => {
    for (const c of fixture.squareCases) {
      const m = c.A.length;
      const result = computeMatVec({ M: mvalue(c.A), v: vvalue(c.v) });
      expect(result.type.kind).toBe("Vector");
      if (result.type.kind === "Vector") {
        expect(result.type.n).toBe(m);
      }
    }
  });
});
