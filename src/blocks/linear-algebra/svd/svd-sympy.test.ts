/**
 * Cross-engine tests for la.svd — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-svd.json.
 *
 * Singular values are sign-convention-free and unique (up to ordering), so
 * we compare sorted σ values between engines with a floating-point tolerance.
 * U and V are not compared because sign and column-order conventions differ
 * across implementations; the reconstruction test (U·Σ·Vᵀ ≈ A) lives in
 * svd.test.ts.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { loadSvdFixture } from "../../../../tests/sympy-reference";
import { computeSvd, type SvdPayload } from "./compute";

const fixture = loadSvdFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("la.svd cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("sorted singular values match SymPy reference (tol 1e-6)", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const label = `${m}×${n}`;
      test(label, () => {
        const { S } = computeSvd({ A: mvalue(c.A) }).payload as SvdPayload;
        const ourSorted = [...S].sort((a, b) => b - a);
        const fixtureSorted = [...c.singularValues].sort((a, b) => b - a);
        expect(ourSorted.length).toBe(fixtureSorted.length);
        for (let i = 0; i < ourSorted.length; i++) {
          expect(Math.abs((ourSorted[i] ?? 0) - (fixtureSorted[i] ?? 0))).toBeLessThan(1e-6);
        }
      });
    }
  });

  test("output type is Tuple for all fixture cases", () => {
    for (const c of fixture.cases) {
      const result = computeSvd({ A: mvalue(c.A) });
      expect(result.type.kind).toBe("Tuple");
    }
  });

  test("singular value count equals min(m,n) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      const k = Math.min(m, n);
      const { S } = computeSvd({ A: mvalue(c.A) }).payload as SvdPayload;
      expect(S).toHaveLength(k);
    }
  });

  test("all singular values are non-negative for all fixture cases", () => {
    for (const c of fixture.cases) {
      const { S } = computeSvd({ A: mvalue(c.A) }).payload as SvdPayload;
      for (const s of S) {
        expect(s).toBeGreaterThanOrEqual(-1e-10);
      }
    }
  });
});
