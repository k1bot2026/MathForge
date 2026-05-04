import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { DistributionPayload } from "../distribution-payload";
import { computeBeta } from "./compute";

function payload(alpha: number, beta: number): DistributionPayload {
  return computeBeta({}, { alpha, beta }).payload as unknown as DistributionPayload;
}

describe("stats.beta compute", () => {
  test("type is Distribution(Beta)", () => {
    expect(computeBeta({}, { alpha: 1, beta: 1 }).type).toEqual({
      kind: "Distribution",
      family: "Beta",
    });
  });

  test("E[X] = α/(α+β)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        (alpha, beta) => {
          const expected = alpha / (alpha + beta);
          expect(payload(alpha, beta).moments.mean).toBeCloseTo(expected, 8);
        },
      ),
    );
  });

  test("Var[X] = αβ/((α+β)²(α+β+1))", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        (alpha, beta) => {
          const s = alpha + beta;
          const expected = (alpha * beta) / (s * s * (s + 1));
          expect(payload(alpha, beta).moments.variance).toBeCloseTo(expected, 6);
        },
      ),
    );
  });

  test("Beta(1,1) is Uniform(0,1): mean=0.5, var=1/12", () => {
    const pl = payload(1, 1);
    expect(pl.moments.mean).toBeCloseTo(0.5, 10);
    expect(pl.moments.variance).toBeCloseTo(1 / 12, 10);
  });

  test("symmetric Beta(α,α) has zero skewness", () => {
    fc.assert(
      fc.property(fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }), (a) => {
        const pl = payload(a, a);
        expect(pl.moments.skewness).toBeCloseTo(0, 8);
      }),
    );
  });

  test("support is continuous [0, 1]", () => {
    expect(payload(2, 3).support).toEqual({ kind: "continuous", lo: 0, hi: 1 });
  });

  test("throws for alpha <= 0", () => {
    expect(() => computeBeta({}, { alpha: 0, beta: 1 })).toThrow("alpha must be > 0");
    expect(() => computeBeta({}, { alpha: -1, beta: 1 })).toThrow("alpha must be > 0");
  });

  test("throws for beta <= 0", () => {
    expect(() => computeBeta({}, { alpha: 1, beta: 0 })).toThrow("beta must be > 0");
  });
});

describe("stats.beta definition explain", () => {
  test("effect shows E[X] from output", async () => {
    const { BetaBlock } = await import("./definition");
    const output = computeBeta({}, { alpha: 2, beta: 5 });
    const msg = BetaBlock.explain.effect?.({}, output);
    expect(msg).toMatch(/Beta/);
    expect(msg).toMatch(/0\.2857/);
  });

  test("impact is a non-empty static string", async () => {
    const { BetaBlock } = await import("./definition");
    const output = computeBeta({}, { alpha: 1, beta: 1 });
    expect(BetaBlock.explain.impact?.({}, output)).toBeTruthy();
  });
});
