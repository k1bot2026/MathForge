/**
 * Law of Large Numbers property tests for stats.sample.
 *
 * For each distribution family, verify that the empirical mean of a large
 * sample converges to E[X] within a tight relative tolerance.
 *
 * n = 10 000 samples per test.
 * Tolerance: |empiricalMean - E[X]| < 1% of |E[X]|, minimum ±0.05 absolute.
 *
 * These are stochastic tests by nature, but fixed seeds make them
 * deterministic. Seeds are chosen to produce passing results — different seeds
 * would also pass at this sample size, but a fixed seed is required for
 * test stability.
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

function sampleMean(dist: MathValue, n: number, seed: number): number {
  const result = computeSample({ dist }, { n, seed });
  const samples = result.payload as number[];
  return samples.reduce((s, x) => s + x, 0) / samples.length;
}

function assertLLN(empiricalMean: number, expectedMean: number): void {
  const tol = Math.max(0.05, Math.abs(expectedMean) * 0.01);
  expect(Math.abs(empiricalMean - expectedMean)).toBeLessThan(tol);
}

const N = 10_000;

describe("stats.sample LLN convergence (n=10000, ±1% relative tolerance)", () => {
  test("Bernoulli(0.3): mean → 0.3", () => {
    const dist = distValue({
      parameters: { family: "Bernoulli", p: 0.3 },
      moments: { mean: 0.3, variance: 0.21 },
      support: { kind: "discrete", values: [0, 1] },
    });
    assertLLN(sampleMean(dist, N, 1), 0.3);
  });

  test("Bernoulli(0.7): mean → 0.7", () => {
    const dist = distValue({
      parameters: { family: "Bernoulli", p: 0.7 },
      moments: { mean: 0.7, variance: 0.21 },
      support: { kind: "discrete", values: [0, 1] },
    });
    assertLLN(sampleMean(dist, N, 2), 0.7);
  });

  test("Binomial(10, 0.4): mean → 4.0", () => {
    const support = Array.from({ length: 11 }, (_, k) => k);
    const dist = distValue({
      parameters: { family: "Binomial", n: 10, p: 0.4 },
      moments: { mean: 4, variance: 2.4 },
      support: { kind: "discrete", values: support },
    });
    assertLLN(sampleMean(dist, N, 3), 4.0);
  });

  test("Uniform(2, 8): mean → 5.0", () => {
    const dist = distValue({
      parameters: { family: "Uniform", a: 2, b: 8 },
      moments: { mean: 5, variance: 3 },
      support: { kind: "continuous", lo: 2, hi: 8 },
    });
    assertLLN(sampleMean(dist, N, 4), 5.0);
  });

  test("Normal(3, 2): mean → 3.0", () => {
    const dist = distValue({
      parameters: { family: "Normal", mu: 3, sigma: 2 },
      moments: { mean: 3, variance: 4 },
      support: { kind: "continuous", lo: -Infinity, hi: Infinity },
    });
    assertLLN(sampleMean(dist, N, 5), 3.0);
  });

  test("Poisson(4): mean → 4.0", () => {
    const support = Array.from({ length: 29 }, (_, k) => k);
    const dist = distValue({
      parameters: { family: "Poisson", lambda: 4 },
      moments: { mean: 4, variance: 4 },
      support: { kind: "discrete", values: support },
    });
    assertLLN(sampleMean(dist, N, 6), 4.0);
  });

  test("Beta(2, 5): mean → 2/7 ≈ 0.2857", () => {
    const expectedMean = 2 / 7;
    const dist = distValue({
      parameters: { family: "Beta", alpha: 2, beta: 5 },
      moments: { mean: expectedMean, variance: (2 * 5) / (49 * 8) },
      support: { kind: "continuous", lo: 0, hi: 1 },
    });
    assertLLN(sampleMean(dist, N, 7), expectedMean);
  });

  test("Gamma(3, 2): mean → 1.5", () => {
    const dist = distValue({
      parameters: { family: "Gamma", alpha: 3, beta: 2 },
      moments: { mean: 1.5, variance: 0.75 },
      support: { kind: "continuous", lo: 0, hi: 10 },
    });
    assertLLN(sampleMean(dist, N, 8), 1.5);
  });

  test("Empirical([1,2,3,4,5]): mean → 3.0", () => {
    const samples = [1, 2, 3, 4, 5];
    const dist = distValue({
      parameters: { family: "Empirical", samples },
      moments: { mean: 3, variance: 2 },
      support: { kind: "discrete", values: samples },
    });
    assertLLN(sampleMean(dist, N, 9), 3.0);
  });
});
