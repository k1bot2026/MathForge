/**
 * Cross-engine tests for stats.gamma — verifies parametric moment
 * formulas against pre-computed sympy.stats reference values from
 * tests/fixtures/sympy/stats-gamma.json.
 *
 * Uses shape/rate parameterisation: Gamma(alpha, beta) where
 *   mean = alpha/beta, variance = alpha/beta^2.
 *
 * Key invariants verified:
 *   1. mean = alpha/beta matches SymPy E[X].
 *   2. variance = alpha/beta^2 matches SymPy Var[X].
 *   3. skewness = 2/sqrt(alpha).
 *   4. excessKurtosis = 6/alpha.
 *   5. Support is continuous [0, Inf).
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import { loadGammaDistFixture } from "../../../../tests/sympy-reference";
import type { DistributionPayload } from "../distribution-payload";
import { computeGamma } from "./compute";

const fixture = loadGammaDistFixture();

const TOL = 1e-9;

function getPayload(alpha: number, beta: number): DistributionPayload {
  return computeGamma({}, { alpha, beta }).payload as unknown as DistributionPayload;
}

describe("stats.gamma cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("mean = alpha/beta matches SymPy E[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`alpha=${c.parameters.alpha}, beta=${c.parameters.beta}`, () => {
        const pl = getPayload(c.parameters.alpha, c.parameters.beta);
        expect(Math.abs(pl.moments.mean - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("variance = alpha/beta^2 matches SymPy Var[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`alpha=${c.parameters.alpha}, beta=${c.parameters.beta}`, () => {
        const pl = getPayload(c.parameters.alpha, c.parameters.beta);
        expect(Math.abs(pl.moments.variance - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  test("skewness = 2/sqrt(alpha) for all cases", () => {
    for (const c of fixture.cases) {
      const { alpha, beta } = c.parameters;
      const pl = getPayload(alpha, beta);
      const expected = 2 / Math.sqrt(alpha);
      expect(Math.abs((pl.moments.skewness ?? 0) - expected)).toBeLessThan(TOL);
    }
  });

  test("excess kurtosis = 6/alpha for all cases", () => {
    for (const c of fixture.cases) {
      const { alpha, beta } = c.parameters;
      const pl = getPayload(alpha, beta);
      const expected = 6 / alpha;
      expect(Math.abs((pl.moments.excessKurtosis ?? 0) - expected)).toBeLessThan(TOL);
    }
  });

  test("support is continuous with lo=0 and finite hi", () => {
    const pl = getPayload(3, 2);
    expect(pl.support.kind).toBe("continuous");
    if (pl.support.kind === "continuous") {
      expect(pl.support.lo).toBe(0);
      expect(Number.isFinite(pl.support.hi)).toBe(true);
    }
  });
});
