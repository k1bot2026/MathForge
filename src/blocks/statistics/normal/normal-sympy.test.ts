/**
 * Cross-engine tests for stats.normal — verifies parametric moment
 * formulas against pre-computed sympy.stats reference values from
 * tests/fixtures/sympy/stats-normal.json.
 *
 * Key invariants verified:
 *   1. mean = mu matches SymPy E[X].
 *   2. variance = sigma² matches SymPy Var[X].
 *   3. CDF(mu) = 0.5 (symmetry of Normal).
 *   4. PDF at mu = 1/(sigma*sqrt(2*pi)) (peak density).
 *   5. Skewness = 0, excess kurtosis = 0 for all cases.
 *   6. Support is continuous (-∞, ∞).
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import { loadNormalDistFixture } from "../../../../tests/sympy-reference";
import type { DistributionPayload } from "../distribution-payload";
import { computeNormal } from "./compute";

const fixture = loadNormalDistFixture();

const TOL = 1e-9;

function getPayload(mu: number, sigma: number): DistributionPayload {
  return computeNormal({}, { mu, sigma }).payload as unknown as DistributionPayload;
}

describe("stats.normal cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("mean = mu matches SymPy E[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`mu=${c.parameters.mu}, sigma=${c.parameters.sigma}`, () => {
        const pl = getPayload(c.parameters.mu, c.parameters.sigma);
        expect(Math.abs(pl.moments.mean - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("variance = sigma² matches SymPy Var[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`mu=${c.parameters.mu}, sigma=${c.parameters.sigma}`, () => {
        const pl = getPayload(c.parameters.mu, c.parameters.sigma);
        expect(Math.abs(pl.moments.variance - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  test("CDF(mu) = 0.5 from SymPy for all cases (symmetry of Normal)", () => {
    for (const c of fixture.cases) {
      const { mu } = c.parameters;
      const cdfMu = c.cdf.find((s) => Math.abs(s.x - mu) < 1e-12)?.value ?? -1;
      expect(Math.abs(cdfMu - 0.5)).toBeLessThan(TOL);
    }
  });

  test("PDF peak at mu = 1/(sigma*sqrt(2*pi)) from SymPy for all cases", () => {
    for (const c of fixture.cases) {
      const { mu, sigma } = c.parameters;
      const pdfMu = c.pdf.find((s) => Math.abs(s.x - mu) < 1e-12)?.value ?? -1;
      const expected = 1 / (sigma * Math.sqrt(2 * Math.PI));
      expect(Math.abs(pdfMu - expected)).toBeLessThan(1e-9);
    }
  });

  test("skewness = 0 and excess kurtosis = 0 for all cases", () => {
    for (const c of fixture.cases) {
      const pl = getPayload(c.parameters.mu, c.parameters.sigma);
      expect(pl.moments.skewness).toBe(0);
      expect(pl.moments.excessKurtosis).toBe(0);
    }
  });

  test("support is continuous with lo=-Infinity and hi=+Infinity", () => {
    const pl = getPayload(0, 1);
    expect(pl.support.kind).toBe("continuous");
    if (pl.support.kind === "continuous") {
      expect(pl.support.lo).toBe(-Infinity);
      expect(pl.support.hi).toBe(Infinity);
    }
  });
});
