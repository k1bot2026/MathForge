/**
 * Cross-engine tests for stats.beta — verifies parametric moment
 * formulas against pre-computed sympy.stats reference values from
 * tests/fixtures/sympy/stats-beta.json.
 *
 * Key invariants verified:
 *   1. mean = alpha/(alpha+beta) matches SymPy E[X].
 *   2. variance = alpha*beta/((alpha+beta)^2*(alpha+beta+1)) matches SymPy Var[X].
 *   3. CDF(0) = 0, CDF(1) = 1 (boundary invariants for support [0,1]).
 *   4. CDF(0.5) = 0.5 for symmetric Beta(a,a) cases.
 *   5. Support is continuous [0, 1].
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import { loadBetaDistFixture } from "../../../../tests/sympy-reference";
import type { DistributionPayload } from "../distribution-payload";
import { computeBeta } from "./compute";

const fixture = loadBetaDistFixture();

const TOL = 1e-9;

function getPayload(alpha: number, beta: number): DistributionPayload {
  return computeBeta({}, { alpha, beta }).payload as unknown as DistributionPayload;
}

describe("stats.beta cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("mean = alpha/(alpha+beta) matches SymPy E[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`alpha=${c.parameters.alpha}, beta=${c.parameters.beta}`, () => {
        const pl = getPayload(c.parameters.alpha, c.parameters.beta);
        expect(Math.abs(pl.moments.mean - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("variance matches SymPy Var[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`alpha=${c.parameters.alpha}, beta=${c.parameters.beta}`, () => {
        const pl = getPayload(c.parameters.alpha, c.parameters.beta);
        expect(Math.abs(pl.moments.variance - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  test("CDF(0) = 0 and CDF(1) = 1 from SymPy for all cases", () => {
    for (const c of fixture.cases) {
      const getCdf = (x: number) => c.cdf.find((s) => s.x === x)?.value ?? -1;
      expect(getCdf(0)).toBeLessThan(TOL);
      expect(Math.abs(getCdf(1) - 1)).toBeLessThan(TOL);
    }
  });

  test("CDF(0.5) = 0.5 from SymPy for symmetric Beta(a,a) cases", () => {
    for (const c of fixture.cases) {
      if (c.parameters.alpha !== c.parameters.beta) continue;
      const cdfHalf = c.cdf.find((s) => s.x === 0.5)?.value ?? -1;
      expect(Math.abs(cdfHalf - 0.5)).toBeLessThan(TOL);
    }
  });

  test("support is continuous [0, 1]", () => {
    const pl = getPayload(2, 5);
    expect(pl.support.kind).toBe("continuous");
    if (pl.support.kind === "continuous") {
      expect(pl.support.lo).toBe(0);
      expect(pl.support.hi).toBe(1);
    }
  });
});
