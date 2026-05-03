/**
 * Cross-engine tests for stats.binomial — verifies parametric moment
 * formulas against pre-computed sympy.stats reference values from
 * tests/fixtures/sympy/stats-binomial.json.
 *
 * Key invariants verified:
 *   1. mean = np matches SymPy E[X].
 *   2. variance = np(1-p) matches SymPy Var[X].
 *   3. CDF(-1) = 0, CDF(n) = 1 (boundary invariants).
 *   4. pmf(0) = (1-p)^n (degenerate k=0 formula).
 *   5. pmf(n) = p^n.
 *   6. Degenerate Binomial(n, 0): mean=0, var=0.
 *   7. Degenerate Binomial(n, 1): mean=n, var=0.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import { loadBinomialFixture } from "../../../../tests/sympy-reference";
import type { DistributionPayload } from "../distribution-payload";
import { computeBinomial } from "./compute";

const fixture = loadBinomialFixture();

const TOL = 1e-9;

function getPayload(n: number, p: number): DistributionPayload {
  return computeBinomial({}, { n, p }).payload as unknown as DistributionPayload;
}

describe("stats.binomial cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("mean = np matches SymPy E[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`n=${c.parameters.n}, p=${c.parameters.p}`, () => {
        const pl = getPayload(c.parameters.n, c.parameters.p);
        expect(Math.abs(pl.moments.mean - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("variance = np(1-p) matches SymPy Var[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`n=${c.parameters.n}, p=${c.parameters.p}`, () => {
        const pl = getPayload(c.parameters.n, c.parameters.p);
        expect(Math.abs(pl.moments.variance - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  test("CDF(-1) = 0 and CDF(n) = 1 for all cases", () => {
    for (const c of fixture.cases) {
      const { n } = c.parameters;
      const getCdf = (x: number) => c.cdf.find((s) => s.x === x)?.value ?? -1;
      expect(getCdf(-1)).toBeLessThan(TOL);
      expect(Math.abs(getCdf(n) - 1)).toBeLessThan(TOL);
    }
  });

  test("pmf(0) = (1-p)^n matches SymPy density for all non-degenerate cases", () => {
    for (const c of fixture.cases) {
      const { n, p } = c.parameters;
      if (p === 1) continue;
      const pmf0 = c.pmf.find((s) => s.x === 0)?.value ?? -1;
      const expected = (1 - p) ** n;
      expect(Math.abs(pmf0 - expected)).toBeLessThan(TOL);
    }
  });

  test("pmf(n) = p^n matches SymPy density for all non-degenerate cases", () => {
    for (const c of fixture.cases) {
      const { n, p } = c.parameters;
      if (p === 0) continue;
      const pmfN = c.pmf.find((s) => s.x === n)?.value ?? -1;
      const expected = p ** n;
      expect(Math.abs(pmfN - expected)).toBeLessThan(TOL);
    }
  });

  test("degenerate Binomial(n, 0): mean=0, var=0", () => {
    const c = fixture.cases.find((fc) => fc.parameters.p === 0);
    expect(c).toBeDefined();
    if (!c) return;
    const pl = getPayload(c.parameters.n, 0);
    expect(pl.moments.mean).toBeLessThan(TOL);
    expect(pl.moments.variance).toBeLessThan(TOL);
  });

  test("degenerate Binomial(n, 1): mean=n, var=0", () => {
    const c = fixture.cases.find((fc) => fc.parameters.p === 1);
    expect(c).toBeDefined();
    if (!c) return;
    const { n } = c.parameters;
    const pl = getPayload(n, 1);
    expect(Math.abs(pl.moments.mean - n)).toBeLessThan(TOL);
    expect(pl.moments.variance).toBeLessThan(TOL);
  });
});
