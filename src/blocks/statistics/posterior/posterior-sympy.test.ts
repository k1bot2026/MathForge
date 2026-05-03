/**
 * Cross-engine tests for stats.posterior — verifies all 4 conjugate-pair
 * updates produce posterior parameters and moments matching SymPy-computed
 * reference values from tests/fixtures/sympy/stats-posterior.json.
 *
 * Key invariants verified per conjugate pair:
 *   Beta-Bernoulli:  posterior = Beta(α+k, β+n-k)
 *   Beta-Binomial:   posterior = Beta(α+k, β+n-k)  (same rule as Bernoulli)
 *   Normal-Normal:   posterior = Normal(μ_post, σ_post) via precision update
 *   Gamma-Poisson:   posterior = Gamma(α+k, β+n)
 *
 * Each test: run computePosterior with the fixture's prior/evidence params,
 * then assert posterior moments match SymPy-computed values within TOL.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import type { DistributionFamily, MathValue } from "~/math/types";
import { loadPosteriorFixture } from "../../../../tests/sympy-reference";
import type { DistributionPayload } from "../distribution-payload";
import { computePosterior } from "./compute";

const fixture = loadPosteriorFixture();

const TOL = 1e-9;

function makeDistInput(family: string, params: Record<string, number>, blockId: string): MathValue {
  const payload: DistributionPayload = {
    parameters: { family, ...params } as DistributionPayload["parameters"],
    moments: { mean: 0, variance: 0 },
    support: { kind: "continuous", lo: 0, hi: 1 },
  };
  return {
    type: { kind: "Distribution", family: family as DistributionFamily },
    payload: payload as unknown as number,
    provenance: { blockId, inputs: [], computedAt: 0, engine: "native" },
  };
}

function getPostPayload(c: (typeof fixture.cases)[number]): DistributionPayload {
  const priorParams: Record<string, number> = {};
  if (c.prior.alpha !== undefined) priorParams.alpha = c.prior.alpha;
  if (c.prior.beta !== undefined) priorParams.beta = c.prior.beta;
  if (c.prior.mu !== undefined) priorParams.mu = c.prior.mu;
  if (c.prior.sigma !== undefined) priorParams.sigma = c.prior.sigma;

  const likFamily =
    c.conjugatePair === "Beta-Bernoulli"
      ? "Bernoulli"
      : c.conjugatePair === "Beta-Binomial"
        ? "Binomial"
        : c.conjugatePair === "Normal-Normal"
          ? "Normal"
          : "Poisson";

  const likParams: Record<string, number> =
    c.conjugatePair === "Normal-Normal" && c.likelihood?.sigma !== undefined
      ? { mu: 0, sigma: c.likelihood.sigma }
      : c.conjugatePair === "Beta-Bernoulli"
        ? { p: 0.5 }
        : c.conjugatePair === "Beta-Binomial"
          ? { n: c.evidence.n_obs, p: 0.5 }
          : { lambda: 2 };

  const computeParams: Record<string, unknown> = { n_obs: c.evidence.n_obs };
  if (c.evidence.k_hits !== undefined) computeParams.k_hits = c.evidence.k_hits;
  if (c.evidence.x_obs !== undefined) computeParams.x_obs = c.evidence.x_obs;

  const result = computePosterior(
    {
      prior: makeDistInput(c.prior.family, priorParams, "stats.prior"),
      likelihood: makeDistInput(likFamily, likParams, "stats.likelihood"),
    },
    computeParams,
  );
  return result.payload as unknown as DistributionPayload;
}

describe("stats.posterior cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("Beta-Bernoulli: posterior mean matches SymPy E[θ] for all cases", () => {
    for (const c of fixture.cases.filter((c) => c.conjugatePair === "Beta-Bernoulli")) {
      test(`Beta(${c.prior.alpha},${c.prior.beta}) + ${c.evidence.k_hits}/${c.evidence.n_obs}`, () => {
        const pl = getPostPayload(c);
        expect(Math.abs(pl.moments.mean - c.posterior.moments.mean)).toBeLessThan(TOL);
      });
    }
  });

  describe("Beta-Bernoulli: posterior variance matches SymPy Var[θ] for all cases", () => {
    for (const c of fixture.cases.filter((c) => c.conjugatePair === "Beta-Bernoulli")) {
      test(`Beta(${c.prior.alpha},${c.prior.beta}) + ${c.evidence.k_hits}/${c.evidence.n_obs}`, () => {
        const pl = getPostPayload(c);
        expect(Math.abs(pl.moments.variance - c.posterior.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  describe("Beta-Binomial: posterior moments match SymPy for all cases", () => {
    for (const c of fixture.cases.filter((c) => c.conjugatePair === "Beta-Binomial")) {
      test(`Beta(${c.prior.alpha},${c.prior.beta}) + ${c.evidence.k_hits}/${c.evidence.n_obs}`, () => {
        const pl = getPostPayload(c);
        expect(Math.abs(pl.moments.mean - c.posterior.moments.mean)).toBeLessThan(TOL);
        expect(Math.abs(pl.moments.variance - c.posterior.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  describe("Normal-Normal: posterior mean and variance match SymPy for all cases", () => {
    for (const c of fixture.cases.filter((c) => c.conjugatePair === "Normal-Normal")) {
      test(`Normal(${c.prior.mu},${c.prior.sigma}) + x̄=${c.evidence.x_obs}, n=${c.evidence.n_obs}`, () => {
        const pl = getPostPayload(c);
        expect(Math.abs(pl.moments.mean - c.posterior.moments.mean)).toBeLessThan(TOL);
        expect(Math.abs(pl.moments.variance - c.posterior.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  describe("Gamma-Poisson: posterior mean and variance match SymPy for all cases", () => {
    for (const c of fixture.cases.filter((c) => c.conjugatePair === "Gamma-Poisson")) {
      test(`Gamma(${c.prior.alpha},${c.prior.beta}) + k=${c.evidence.k_hits}, n=${c.evidence.n_obs}`, () => {
        const pl = getPostPayload(c);
        expect(Math.abs(pl.moments.mean - c.posterior.moments.mean)).toBeLessThan(TOL);
        expect(Math.abs(pl.moments.variance - c.posterior.moments.variance)).toBeLessThan(TOL);
      });
    }
  });

  test("Beta-Bernoulli: posterior alpha = prior_alpha + k_hits for all cases", () => {
    for (const c of fixture.cases.filter((c) => c.conjugatePair === "Beta-Bernoulli")) {
      const pl = getPostPayload(c);
      const params = pl.parameters as { family: "Beta"; alpha: number; beta: number };
      const expectedAlpha = c.posterior.alpha ?? 0;
      const expectedBeta = c.posterior.beta ?? 0;
      expect(Math.abs(params.alpha - expectedAlpha)).toBeLessThan(TOL);
      expect(Math.abs(params.beta - expectedBeta)).toBeLessThan(TOL);
    }
  });

  test("Gamma-Poisson: posterior alpha = prior_alpha + k_events for all cases", () => {
    for (const c of fixture.cases.filter((c) => c.conjugatePair === "Gamma-Poisson")) {
      const pl = getPostPayload(c);
      const params = pl.parameters as { family: "Gamma"; alpha: number; beta: number };
      const expectedAlpha = c.posterior.alpha ?? 0;
      const expectedBeta = c.posterior.beta ?? 0;
      expect(Math.abs(params.alpha - expectedAlpha)).toBeLessThan(TOL);
      expect(Math.abs(params.beta - expectedBeta)).toBeLessThan(TOL);
    }
  });
});
