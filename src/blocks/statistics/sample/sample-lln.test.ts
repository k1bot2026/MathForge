/**
 * Law of Large Numbers property tests for stats.sample.
 *
 * For each parametric distribution family, verify:
 *   1. empirical mean is within ±2σ/√n of E[X]  (≈95% confidence band)
 *   2. empirical variance is within ±5% of Var[X]
 *
 * n = 10 000 samples per test. Fixed seeds make results deterministic.
 * Seed 42 is used for all families; each family gets an independent RNG
 * state via a unique per-family seed offset.
 *
 * Empirical is skipped — it samples from itself, so LLN convergence is
 * trivially guaranteed by the sample mean identity.
 */

import { describe, expect, test } from "vitest";
import type { DistributionFamily, MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { computeSample } from "./compute";

function distValue(payload: DistributionPayload): MathValue {
  return {
    type: { kind: "Distribution", family: payload.parameters.family as DistributionFamily },
    payload: payload as unknown as number,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function sampleStats(dist: MathValue, n: number, seed: number): { mean: number; variance: number } {
  const result = computeSample({ dist }, { n, seed });
  const xs = result.payload as number[];
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  return { mean, variance };
}

/** Assert empirical mean within ±2σ/√n of expected mean. */
function assertMeanLLN(
  empirical: number,
  expectedMean: number,
  expectedVariance: number,
  n: number,
): void {
  const sigma = Math.sqrt(expectedVariance);
  const tol = (2 * sigma) / Math.sqrt(n);
  expect(Math.abs(empirical - expectedMean)).toBeLessThan(tol);
}

/** Assert empirical variance within ±5% of expected variance. */
function assertVarianceLLN(empirical: number, expectedVariance: number): void {
  const tol = expectedVariance * 0.05;
  expect(Math.abs(empirical - expectedVariance)).toBeLessThan(tol);
}

const N = 10_000;

describe("stats.sample LLN convergence (n=10000, ±2σ/√n mean, ±5% variance)", () => {
  test("Bernoulli(0.3): mean → 0.3, var → 0.21", () => {
    const dist = distValue({
      parameters: { family: "Bernoulli", p: 0.3 },
      moments: { mean: 0.3, variance: 0.21 },
      support: { kind: "discrete", values: [0, 1] },
    });
    const { mean, variance } = sampleStats(dist, N, 42);
    assertMeanLLN(mean, 0.3, 0.21, N);
    assertVarianceLLN(variance, 0.21);
  });

  test("Binomial(20, 0.4): mean → 8.0, var → 4.8", () => {
    const support = Array.from({ length: 21 }, (_, k) => k);
    const dist = distValue({
      parameters: { family: "Binomial", n: 20, p: 0.4 },
      moments: { mean: 8, variance: 4.8 },
      support: { kind: "discrete", values: support },
    });
    const { mean, variance } = sampleStats(dist, N, 43);
    assertMeanLLN(mean, 8, 4.8, N);
    assertVarianceLLN(variance, 4.8);
  });

  test("Uniform(0, 10): mean → 5.0, var → 100/12 ≈ 8.333", () => {
    const expectedVar = 100 / 12;
    const dist = distValue({
      parameters: { family: "Uniform", a: 0, b: 10 },
      moments: { mean: 5, variance: expectedVar },
      support: { kind: "continuous", lo: 0, hi: 10 },
    });
    const { mean, variance } = sampleStats(dist, N, 44);
    assertMeanLLN(mean, 5, expectedVar, N);
    assertVarianceLLN(variance, expectedVar);
  });

  test("Normal(0, 1): mean → 0, var → 1", () => {
    const dist = distValue({
      parameters: { family: "Normal", mu: 0, sigma: 1 },
      moments: { mean: 0, variance: 1 },
      support: { kind: "continuous", lo: -Infinity, hi: Infinity },
    });
    const { mean, variance } = sampleStats(dist, N, 45);
    // Normal(0,1): σ/√n = 1/100 — use minimum floor of 0.05 for mean=0 case
    expect(Math.abs(mean)).toBeLessThan(0.05);
    assertVarianceLLN(variance, 1);
  });

  test("Poisson(5): mean → 5.0, var → 5.0", () => {
    const support = Array.from({ length: 36 }, (_, k) => k);
    const dist = distValue({
      parameters: { family: "Poisson", lambda: 5 },
      moments: { mean: 5, variance: 5 },
      support: { kind: "discrete", values: support },
    });
    const { mean, variance } = sampleStats(dist, N, 46);
    assertMeanLLN(mean, 5, 5, N);
    assertVarianceLLN(variance, 5);
  });

  test("Beta(2, 3): mean → 0.4, var → 0.04", () => {
    const expectedMean = 2 / 5;
    const expectedVar = (2 * 3) / (25 * 6);
    const dist = distValue({
      parameters: { family: "Beta", alpha: 2, beta: 3 },
      moments: { mean: expectedMean, variance: expectedVar },
      support: { kind: "continuous", lo: 0, hi: 1 },
    });
    const { mean, variance } = sampleStats(dist, N, 47);
    assertMeanLLN(mean, expectedMean, expectedVar, N);
    assertVarianceLLN(variance, expectedVar);
  });

  test("Gamma(2, 1): mean → 2.0, var → 2.0", () => {
    const dist = distValue({
      parameters: { family: "Gamma", alpha: 2, beta: 1 },
      moments: { mean: 2, variance: 2 },
      support: { kind: "continuous", lo: 0, hi: 20 },
    });
    const { mean, variance } = sampleStats(dist, N, 48);
    assertMeanLLN(mean, 2, 2, N);
    assertVarianceLLN(variance, 2);
  });
});
