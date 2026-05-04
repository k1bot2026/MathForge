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

function bernoulliDist(p: number): MathValue {
  return distValue({
    parameters: { family: "Bernoulli", p },
    moments: { mean: p, variance: p * (1 - p) },
    support: { kind: "discrete", values: [0, 1] },
  });
}

function normalDist(mu: number, sigma: number): MathValue {
  return distValue({
    parameters: { family: "Normal", mu, sigma },
    moments: { mean: mu, variance: sigma ** 2 },
    support: { kind: "continuous", lo: -Infinity, hi: Infinity },
  });
}

function uniformDist(a: number, b: number): MathValue {
  return distValue({
    parameters: { family: "Uniform", a, b },
    moments: { mean: (a + b) / 2, variance: (b - a) ** 2 / 12 },
    support: { kind: "continuous", lo: a, hi: b },
  });
}

describe("stats.sample compute", () => {
  test("output type is Vector<n, real>", () => {
    const result = computeSample({ dist: bernoulliDist(0.5) }, { n: 10, seed: 1 });
    expect(result.type).toEqual({ kind: "Vector", n: 10, field: "real" });
  });

  test("output payload has correct length", () => {
    const result = computeSample({ dist: bernoulliDist(0.5) }, { n: 50, seed: 1 });
    expect((result.payload as number[]).length).toBe(50);
  });

  test("Bernoulli samples are all 0 or 1", () => {
    const result = computeSample({ dist: bernoulliDist(0.5) }, { n: 100, seed: 42 });
    const samples = result.payload as number[];
    expect(samples.every((x) => x === 0 || x === 1)).toBe(true);
  });

  test("Bernoulli(0) always produces 0", () => {
    const result = computeSample({ dist: bernoulliDist(0) }, { n: 50, seed: 7 });
    const samples = result.payload as number[];
    expect(samples.every((x) => x === 0)).toBe(true);
  });

  test("Bernoulli(1) always produces 1", () => {
    const result = computeSample({ dist: bernoulliDist(1) }, { n: 50, seed: 7 });
    const samples = result.payload as number[];
    expect(samples.every((x) => x === 1)).toBe(true);
  });

  test("Uniform(0,1) samples are in [0,1)", () => {
    const result = computeSample({ dist: uniformDist(0, 1) }, { n: 200, seed: 3 });
    const samples = result.payload as number[];
    expect(samples.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  test("Normal(0,1) sample mean converges to 0 (n=5000, |mean|<0.1)", () => {
    const result = computeSample({ dist: normalDist(0, 1) }, { n: 5000, seed: 99 });
    const samples = result.payload as number[];
    const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.1);
  });

  test("seeded samples are reproducible", () => {
    const r1 = computeSample({ dist: bernoulliDist(0.5) }, { n: 20, seed: 12345 });
    const r2 = computeSample({ dist: bernoulliDist(0.5) }, { n: 20, seed: 12345 });
    expect(r1.payload).toEqual(r2.payload);
  });

  test("different seeds produce different samples", () => {
    const r1 = computeSample({ dist: bernoulliDist(0.5) }, { n: 20, seed: 1 });
    const r2 = computeSample({ dist: bernoulliDist(0.5) }, { n: 20, seed: 2 });
    expect(r1.payload).not.toEqual(r2.payload);
  });

  test("throws when dist is missing", () => {
    expect(() => computeSample({}, { n: 10, seed: 1 })).toThrow("dist input is required");
  });

  test("throws for non-positive n", () => {
    expect(() => computeSample({ dist: bernoulliDist(0.5) }, { n: 0, seed: 1 })).toThrow(
      "n must be a positive integer",
    );
  });

  test("Empirical distribution samples are drawn from the provided values", () => {
    const values = [2, 5, 8, 13, 21];
    const dist = distValue({
      parameters: { family: "Empirical", samples: values },
      moments: { mean: 49 / 5, variance: 0 },
      support: { kind: "discrete", values },
    });
    const result = computeSample({ dist }, { n: 50, seed: 7 });
    const samples = result.payload as number[];
    expect(samples.every((x) => values.includes(x))).toBe(true);
  });

  test("Gamma(0.5, 1): samples are positive (alpha < 1 branch)", () => {
    const dist = distValue({
      parameters: { family: "Gamma", alpha: 0.5, beta: 1 },
      moments: { mean: 0.5, variance: 0.5 },
      support: { kind: "continuous", lo: 0, hi: 20 },
    });
    const result = computeSample({ dist }, { n: 100, seed: 11 });
    const samples = result.payload as number[];
    expect(samples.every((x) => x > 0)).toBe(true);
  });
});
