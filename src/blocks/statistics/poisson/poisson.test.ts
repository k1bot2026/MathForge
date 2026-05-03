import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { DistributionPayload } from "../distribution-payload";
import { computePoisson } from "./compute";

function payload(lambda: number): DistributionPayload {
  return computePoisson({}, { lambda }).payload as unknown as DistributionPayload;
}

describe("stats.poisson compute", () => {
  test("type is Distribution(Poisson)", () => {
    expect(computePoisson({}, { lambda: 3 }).type).toEqual({
      kind: "Distribution",
      family: "Poisson",
    });
  });

  test("E[X] = lambda", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.001), max: Math.fround(1000), noNaN: true }),
        (lambda) => {
          expect(payload(lambda).moments.mean).toBeCloseTo(lambda, 8);
        },
      ),
    );
  });

  test("Var[X] = lambda (equidispersion)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.001), max: Math.fround(1000), noNaN: true }),
        (lambda) => {
          expect(payload(lambda).moments.variance).toBeCloseTo(lambda, 8);
        },
      ),
    );
  });

  test("skewness = 1/sqrt(lambda)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.001), max: Math.fround(1000), noNaN: true }),
        (lambda) => {
          expect(payload(lambda).moments.skewness).toBeCloseTo(1 / Math.sqrt(lambda), 8);
        },
      ),
    );
  });

  test("excess kurtosis = 1/lambda", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.001), max: Math.fround(1000), noNaN: true }),
        (lambda) => {
          expect(payload(lambda).moments.excessKurtosis).toBeCloseTo(1 / lambda, 8);
        },
      ),
    );
  });

  test("support is discrete ℕ₀ (represented as 0..ceil(mu+6*sigma))", () => {
    const pl = payload(3);
    expect(pl.support.kind).toBe("discrete");
  });

  test("throws for lambda <= 0", () => {
    expect(() => computePoisson({}, { lambda: 0 })).toThrow("lambda must be > 0");
    expect(() => computePoisson({}, { lambda: -1 })).toThrow("lambda must be > 0");
  });
});
