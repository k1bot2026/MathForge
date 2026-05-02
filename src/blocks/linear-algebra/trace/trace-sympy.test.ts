/**
 * Cross-engine tests for la.trace — compares our native implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-add-sub-trace.json.
 *
 * Trace cases are the square-matrix subset of the add/sub/trace fixture
 * (cases where trA / trB / trApB fields are present).
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { loadAddSubTraceFixture } from "../../../../tests/sympy-reference";
import { computeTrace } from "./compute";

const fixture = loadAddSubTraceFixture();
const squareCases = fixture.cases.filter((c) => c.trA !== undefined);

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("la.trace cross-engine (SymPy fixtures)", () => {
  test("fixture has square cases with trace fields", () => {
    expect(squareCases.length).toBeGreaterThan(0);
    for (const c of squareCases) {
      expect(typeof c.trA).toBe("number");
    }
  });

  describe("computeTrace output matches SymPy tr(A)", () => {
    for (const c of squareCases) {
      const n = c.A.length;
      const label = `${n}×${n}`;
      test(label, () => {
        const result = computeTrace({ A: mvalue(c.A) });
        expect(result.payload).toBe(c.trA);
      });
    }
  });

  test("output type is Scalar exact for all square fixture cases", () => {
    for (const c of squareCases) {
      const result = computeTrace({ A: mvalue(c.A) });
      expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "exact" });
    }
  });

  test("tr(A+B) === tr(A) + tr(B) matches SymPy for all square fixture cases", () => {
    for (const c of squareCases) {
      const trApB = computeTrace({
        A: mvalue(c.ApB),
      }).payload as number;
      expect(trApB).toBe(c.trApB);
      expect(trApB).toBe((c.trA ?? 0) + (c.trB ?? 0));
    }
  });
});
