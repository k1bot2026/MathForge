import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { DistributionPayload } from "../distribution-payload";
import { computeGamma } from "./compute";

function payload(alpha: number, beta: number): DistributionPayload {
  return computeGamma({}, { alpha, beta }).payload as unknown as DistributionPayload;
}

describe("stats.gamma compute", () => {
  test("type is Distribution(Gamma)", () => {
    expect(computeGamma({}, { alpha: 1, beta: 1 }).type).toEqual({
      kind: "Distribution",
      family: "Gamma",
    });
  });

  test("E[X] = α/β (shape/rate parameterisation)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        (alpha, beta) => {
          expect(payload(alpha, beta).moments.mean).toBeCloseTo(alpha / beta, 8);
        },
      ),
    );
  });

  test("Var[X] = α/β²", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        (alpha, beta) => {
          expect(payload(alpha, beta).moments.variance).toBeCloseTo(alpha / beta ** 2, 6);
        },
      ),
    );
  });

  test("skewness = 2/√α", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        (alpha, beta) => {
          expect(payload(alpha, beta).moments.skewness).toBeCloseTo(2 / Math.sqrt(alpha), 8);
        },
      ),
    );
  });

  test("excess kurtosis = 6/α", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        (alpha, beta) => {
          expect(payload(alpha, beta).moments.excessKurtosis).toBeCloseTo(6 / alpha, 8);
        },
      ),
    );
  });

  test("Gamma(1, β) is Exponential(β): mean=1/β, var=1/β²", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),
        (beta) => {
          const pl = payload(1, beta);
          expect(pl.moments.mean).toBeCloseTo(1 / beta, 8);
          expect(pl.moments.variance).toBeCloseTo(1 / beta ** 2, 8);
        },
      ),
    );
  });

  test("support is continuous [0, finite-upper-truncation)", () => {
    const pl = payload(2, 1);
    expect(pl.support.kind).toBe("continuous");
    expect((pl.support as { kind: "continuous"; lo: number; hi: number }).lo).toBe(0);
    // hi is mean+6σ — a finite display bound; exact value depends on params
    expect(Number.isFinite((pl.support as { kind: "continuous"; lo: number; hi: number }).hi)).toBe(
      true,
    );
  });

  test("throws for alpha <= 0", () => {
    expect(() => computeGamma({}, { alpha: 0, beta: 1 })).toThrow("alpha must be > 0");
  });

  test("throws for beta <= 0", () => {
    expect(() => computeGamma({}, { alpha: 1, beta: 0 })).toThrow("beta must be > 0");
  });
});

describe("stats.gamma definition explain", () => {
  test("effect shows E[X] from output", async () => {
    const { GammaBlock } = await import("./definition");
    const { computeGamma } = await import("./compute");
    const output = computeGamma({}, { alpha: 2, beta: 1 });
    const msg = GammaBlock.explain.effect?.({}, output);
    expect(msg).toMatch(/Gamma/);
    expect(msg).toMatch(/2\.000/);
  });

  test("impact is a non-empty static string", async () => {
    const { GammaBlock } = await import("./definition");
    const { computeGamma } = await import("./compute");
    const output = computeGamma({}, { alpha: 2, beta: 1 });
    expect(GammaBlock.explain.impact?.({}, output)).toBeTruthy();
  });
});
