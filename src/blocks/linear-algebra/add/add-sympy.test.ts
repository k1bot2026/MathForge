/**
 * Cross-engine tests for la.add — compares our native implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-add-sub-trace.json.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { loadAddSubTraceFixture } from "../../../../tests/sympy-reference";
import { computeAdd } from "./compute";

const fixture = loadAddSubTraceFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("la.add cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("computeAdd output matches SymPy A+B", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const label = `${m}×${n}`;
      test(label, () => {
        const result = computeAdd({ A: mvalue(c.A), B: mvalue(c.B) });
        expect(result.payload).toEqual(c.ApB);
      });
    }
  });

  test("output type is Matrix with same dimensions as inputs", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const result = computeAdd({ A: mvalue(c.A), B: mvalue(c.B) });
      const t = result.type as { m: number; n: number };
      expect(t.m).toBe(m);
      expect(t.n).toBe(n);
    }
  });

  test("commutativity: A+B === B+A for all fixture cases", () => {
    for (const c of fixture.cases) {
      const ab = computeAdd({ A: mvalue(c.A), B: mvalue(c.B) }).payload;
      const ba = computeAdd({ A: mvalue(c.B), B: mvalue(c.A) }).payload;
      expect(ab).toEqual(ba);
    }
  });

  test("A + (-A) produces all-zero matrix for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const negA = c.A.map((row) => row.map((x) => -x));
      const result = computeAdd({ A: mvalue(c.A), B: mvalue(negA) }).payload as number[][];
      const zeros = Array.from({ length: m }, () => Array.from({ length: n }, () => 0));
      expect(result).toEqual(zeros);
    }
  });
});
