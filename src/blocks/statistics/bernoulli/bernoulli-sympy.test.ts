/**
 * Cross-engine tests for stats.bernoulli — verifies our parametric moment
 * formulas against pre-computed sympy.stats reference values from
 * tests/fixtures/sympy/stats-bernoulli.json.
 *
 * Key invariants verified:
 *   1. mean = p matches SymPy E[X].
 *   2. variance = p(1-p) matches SymPy Var[X].
 *   3. All raw moments E[X^k] = p for k=1..4 (Bernoulli idempotence).
 *   4. pmf(0) = 1-p and pmf(1) = p (structural property, cross-checked
 *      against SymPy density samples).
 *   5. CDF step-function invariants: F(-1)=0, F(0)=1-p, F(0.5)=1-p, F(1)=1, F(2)=1.
 *
 * Note: stats.bernoulli carries pre-computed moments in its payload.
 * There is no separate pmf/cdf function on the block — the DistributionPayload
 * `support` field lists the discrete values; pmf values are cross-checked
 * analytically from p.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import { loadBernoulliFixture } from "../../../../tests/sympy-reference";
import type { DistributionPayload } from "../distribution-payload";
import { computeBernoulli } from "./compute";

const fixture = loadBernoulliFixture();

const TOL = 1e-9;

function getPayload(p: number): DistributionPayload {
  return computeBernoulli({}, { p }).payload as unknown as DistributionPayload;
}

describe("stats.bernoulli cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("mean = p matches SymPy E[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`p=${c.parameters.p}`, () => {
        const pl = getPayload(c.parameters.p);
        expect(Math.abs(pl.moments.mean - c.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("variance = p(1-p) matches SymPy Var[X] for all cases", () => {
    for (const c of fixture.cases) {
      test(`p=${c.parameters.p}`, () => {
        const pl = getPayload(c.parameters.p);
        expect(Math.abs(pl.moments.variance - c.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  test("all raw moments E[X^k] = p for all non-degenerate cases (Bernoulli idempotence)", () => {
    for (const c of fixture.cases) {
      // For Bernoulli(p), X∈{0,1}, so X^k = X for any k≥1 → E[X^k]=p.
      expect(Math.abs(c.moments.m1 - c.parameters.p)).toBeLessThan(TOL);
      expect(Math.abs(c.moments.m2 - c.parameters.p)).toBeLessThan(TOL);
      expect(Math.abs(c.moments.m3 - c.parameters.p)).toBeLessThan(TOL);
      expect(Math.abs(c.moments.m4 - c.parameters.p)).toBeLessThan(TOL);
    }
  });

  test("pmf(0) = 1-p matches SymPy density for all cases", () => {
    for (const c of fixture.cases) {
      const pmf0 = c.pmf.find((s) => s.x === 0)?.value ?? -1;
      expect(Math.abs(pmf0 - (1 - c.parameters.p))).toBeLessThan(TOL);
    }
  });

  test("pmf(1) = p matches SymPy density for all cases", () => {
    for (const c of fixture.cases) {
      const pmf1 = c.pmf.find((s) => s.x === 1)?.value ?? -1;
      expect(Math.abs(pmf1 - c.parameters.p)).toBeLessThan(TOL);
    }
  });

  test("CDF step-function invariants: F(-1)=0, F(0)=1-p, F(0.5)=1-p, F(1)=1, F(2)=1", () => {
    for (const c of fixture.cases) {
      const { p } = c.parameters;
      const get = (x: number) => c.cdf.find((s) => s.x === x)?.value ?? -1;
      expect(get(-1)).toBeLessThan(TOL);
      expect(Math.abs(get(0) - (1 - p))).toBeLessThan(TOL);
      expect(Math.abs(get(0.5) - (1 - p))).toBeLessThan(TOL);
      expect(Math.abs(get(1) - 1)).toBeLessThan(TOL);
      expect(Math.abs(get(2) - 1)).toBeLessThan(TOL);
    }
  });

  test("degenerate Bernoulli(0): mean=0, var=0, pmf(0)=1, pmf(1)=0", () => {
    const c = fixture.cases.find((fc) => fc.parameters.p === 0);
    expect(c).toBeDefined();
    if (!c) return;
    const pl = getPayload(0);
    expect(pl.moments.mean).toBeLessThan(TOL);
    expect(pl.moments.variance).toBeLessThan(TOL);
    expect(Math.abs((c.pmf.find((s) => s.x === 0)?.value ?? -1) - 1)).toBeLessThan(TOL);
    expect(c.pmf.find((s) => s.x === 1)?.value ?? -1).toBeLessThan(TOL);
  });

  test("degenerate Bernoulli(1): mean=1, var=0, pmf(0)=0, pmf(1)=1", () => {
    const c = fixture.cases.find((fc) => fc.parameters.p === 1);
    expect(c).toBeDefined();
    if (!c) return;
    const pl = getPayload(1);
    expect(Math.abs(pl.moments.mean - 1)).toBeLessThan(TOL);
    expect(pl.moments.variance).toBeLessThan(TOL);
    expect(c.pmf.find((s) => s.x === 0)?.value ?? -1).toBeLessThan(TOL);
    expect(Math.abs((c.pmf.find((s) => s.x === 1)?.value ?? -1) - 1)).toBeLessThan(TOL);
  });
});
