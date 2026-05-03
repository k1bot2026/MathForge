import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { DistributionPayload } from "../distribution-payload";
import { computeNormal } from "./compute";

function payload(mu: number, sigma: number): DistributionPayload {
  return computeNormal({}, { mu, sigma }).payload as unknown as DistributionPayload;
}

describe("stats.normal compute", () => {
  test("type is Distribution(Normal)", () => {
    expect(computeNormal({}, { mu: 0, sigma: 1 }).type).toEqual({
      kind: "Distribution",
      family: "Normal",
    });
  });

  test("E[X] = mu", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(100), noNaN: true }),
        (mu, sigma) => {
          expect(payload(mu, sigma).moments.mean).toBeCloseTo(mu, 8);
        },
      ),
    );
  });

  test("Var[X] = sigma²", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(0), noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(100), noNaN: true }),
        (_mu, sigma) => {
          expect(payload(0, sigma).moments.variance).toBeCloseTo(sigma ** 2, 8);
        },
      ),
    );
  });

  test("skewness = 0 (symmetric)", () => {
    expect(payload(0, 1).moments.skewness).toBeCloseTo(0, 12);
    expect(payload(5, 3).moments.skewness).toBeCloseTo(0, 12);
  });

  test("excess kurtosis = 0 (mesokurtic)", () => {
    expect(payload(0, 1).moments.excessKurtosis).toBeCloseTo(0, 12);
    expect(payload(5, 3).moments.excessKurtosis).toBeCloseTo(0, 12);
  });

  test("support is continuous (−∞, +∞) — represented as lo=-Infinity, hi=+Infinity", () => {
    const pl = payload(0, 1);
    expect(pl.support).toEqual({ kind: "continuous", lo: -Infinity, hi: Infinity });
  });

  test("standard normal N(0,1): mean=0, var=1", () => {
    const pl = payload(0, 1);
    expect(pl.moments.mean).toBeCloseTo(0, 12);
    expect(pl.moments.variance).toBeCloseTo(1, 12);
  });

  test("throws for sigma <= 0", () => {
    expect(() => computeNormal({}, { mu: 0, sigma: 0 })).toThrow("sigma must be > 0");
    expect(() => computeNormal({}, { mu: 0, sigma: -1 })).toThrow("sigma must be > 0");
  });
});
