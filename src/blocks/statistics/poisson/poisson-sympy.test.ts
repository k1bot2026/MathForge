/**
 * Cross-engine tests for stats.poisson — verifies parametric moment
 * formulas against pre-computed sympy.stats reference values from
 * tests/fixtures/sympy/stats-poisson.json.
 *
 * Key invariants verified:
 *   1. mean = lambda matches SymPy E[X].
 *   2. variance = lambda matches SymPy Var[X] (equidispersion).
 *   3. pmf(0) = e^(-lambda) (Poisson at k=0).
 *   4. skewness = 1/sqrt(lambda), excessKurtosis = 1/lambda.
 *   5. CDF(0) = e^(-lambda) (same as pmf(0) for discrete CDF).
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import { loadPoissonFixture } from "../../../../tests/sympy-reference";
import type { DistributionPayload } from "../distribution-payload";
import { computePoisson } from "./compute";

const fixture = loadPoissonFixture();

const TOL = 1e-9;

function getPayload(lambda: number): DistributionPayload {
  return computePoisson({}, { lambda }).payload as unknown as DistributionPayload;
}

describe("stats.poisson cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("mean = lambda matches SymPy E[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`lambda=${c.parameters.lambda}`, () => {
        const pl = getPayload(c.parameters.lambda);
        expect(Math.abs(pl.moments.mean - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("variance = lambda matches SymPy Var[X] for all cases (equidispersion)", () => {
    for (const c of fixture.cases) {
      test(`lambda=${c.parameters.lambda}`, () => {
        const pl = getPayload(c.parameters.lambda);
        expect(Math.abs(pl.moments.variance - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  test("pmf(0) = e^(-lambda) from SymPy for all cases", () => {
    for (const c of fixture.cases) {
      const { lambda } = c.parameters;
      const pmf0 = c.pmf.find((s) => s.x === 0)?.value ?? -1;
      const expected = Math.exp(-lambda);
      expect(Math.abs(pmf0 - expected)).toBeLessThan(TOL);
    }
  });

  test("CDF(0) = e^(-lambda) from SymPy for all cases", () => {
    for (const c of fixture.cases) {
      const { lambda } = c.parameters;
      const cdf0 = c.cdf.find((s) => s.x === 0)?.value ?? -1;
      const expected = Math.exp(-lambda);
      expect(Math.abs(cdf0 - expected)).toBeLessThan(TOL);
    }
  });

  test("skewness = 1/sqrt(lambda) for all cases", () => {
    for (const c of fixture.cases) {
      const { lambda } = c.parameters;
      const pl = getPayload(lambda);
      const expected = 1 / Math.sqrt(lambda);
      expect(Math.abs((pl.moments.skewness ?? 0) - expected)).toBeLessThan(TOL);
    }
  });

  test("excess kurtosis = 1/lambda for all cases", () => {
    for (const c of fixture.cases) {
      const { lambda } = c.parameters;
      const pl = getPayload(lambda);
      const expected = 1 / lambda;
      expect(Math.abs((pl.moments.excessKurtosis ?? 0) - expected)).toBeLessThan(TOL);
    }
  });
});
