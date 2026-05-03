/**
 * Cross-engine tests for stats.uniform — verifies parametric moment
 * formulas against pre-computed sympy.stats reference values from
 * tests/fixtures/sympy/stats-uniform.json.
 *
 * Key invariants verified:
 *   1. mean = (a+b)/2 matches SymPy E[X].
 *   2. variance = (b-a)²/12 matches SymPy Var[X].
 *   3. CDF(a) = 0, CDF((a+b)/2) = 0.5, CDF(b) = 1 (boundary/midpoint invariants).
 *   4. PDF at midpoint = 1/(b-a) (constant density).
 *   5. Skewness = 0, excess kurtosis = -1.2 for all cases.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import { loadUniformDistFixture } from "../../../../tests/sympy-reference";
import type { DistributionPayload } from "../distribution-payload";
import { computeUniform } from "./compute";

const fixture = loadUniformDistFixture();

const TOL = 1e-9;

function getPayload(a: number, b: number): DistributionPayload {
  return computeUniform({}, { a, b }).payload as unknown as DistributionPayload;
}

describe("stats.uniform cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("mean = (a+b)/2 matches SymPy E[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`a=${c.parameters.a}, b=${c.parameters.b}`, () => {
        const pl = getPayload(c.parameters.a, c.parameters.b);
        expect(Math.abs(pl.moments.mean - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("variance = (b-a)²/12 matches SymPy Var[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`a=${c.parameters.a}, b=${c.parameters.b}`, () => {
        const pl = getPayload(c.parameters.a, c.parameters.b);
        expect(Math.abs(pl.moments.variance - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  test("CDF(a)=0, CDF(mid)=0.5, CDF(b)=1 from SymPy for all cases", () => {
    for (const c of fixture.cases) {
      const { a, b } = c.parameters;
      const mid = (a + b) / 2;
      const getCdf = (x: number) => c.cdf.find((s) => Math.abs(s.x - x) < 1e-12)?.value ?? -1;
      expect(getCdf(a)).toBeLessThan(TOL);
      expect(Math.abs(getCdf(mid) - 0.5)).toBeLessThan(TOL);
      expect(Math.abs(getCdf(b) - 1)).toBeLessThan(TOL);
    }
  });

  test("PDF at midpoint = 1/(b-a) from SymPy for all cases", () => {
    for (const c of fixture.cases) {
      const { a, b } = c.parameters;
      const mid = (a + b) / 2;
      const pdfMid = c.pdf.find((s) => Math.abs(s.x - mid) < 1e-12)?.value ?? -1;
      const expected = 1 / (b - a);
      expect(Math.abs(pdfMid - expected)).toBeLessThan(TOL);
    }
  });

  test("skewness = 0 and excess kurtosis = -1.2 for all cases", () => {
    for (const c of fixture.cases) {
      const pl = getPayload(c.parameters.a, c.parameters.b);
      expect(pl.moments.skewness).toBe(0);
      expect(pl.moments.excessKurtosis).toBeCloseTo(-1.2, 12);
    }
  });
});
