import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { DistributionPayload } from "../distribution-payload";
import { computeBernoulli } from "./compute";

function payload(p: number): DistributionPayload {
  const result = computeBernoulli({}, { p });
  return result.payload as unknown as DistributionPayload;
}

describe("stats.bernoulli compute", () => {
  test("type is Distribution(Bernoulli)", () => {
    const result = computeBernoulli({}, { p: 0.3 });
    expect(result.type).toEqual({ kind: "Distribution", family: "Bernoulli" });
  });

  test("parameters carry the input p", () => {
    const pl = payload(0.7);
    expect(pl.parameters).toMatchObject({ family: "Bernoulli", p: 0.7 });
  });

  test("E[X] = p", () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (p) => {
        const pl = payload(p);
        expect(pl.moments.mean).toBeCloseTo(p, 12);
      }),
    );
  });

  test("Var[X] = p(1-p)", () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (p) => {
        const pl = payload(p);
        expect(pl.moments.variance).toBeCloseTo(p * (1 - p), 12);
      }),
    );
  });

  test("Var[X] is maximised at p=0.5 (0.25)", () => {
    expect(payload(0.5).moments.variance).toBeCloseTo(0.25, 12);
  });

  test("Var[X] = 0 at degenerate endpoints", () => {
    expect(payload(0).moments.variance).toBeCloseTo(0, 12);
    expect(payload(1).moments.variance).toBeCloseTo(0, 12);
  });

  test("skewness = (1-2p)/sqrt(p(1-p)) — positive when p<0.5", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }),
        (p) => {
          const pl = payload(p);
          const expected = (1 - 2 * p) / Math.sqrt(p * (1 - p));
          expect(pl.moments.skewness).toBeCloseTo(expected, 10);
        },
      ),
    );
  });

  test("excess kurtosis = (1-6p(1-p))/(p(1-p))", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }),
        (p) => {
          const pl = payload(p);
          const v = p * (1 - p);
          const expected = (1 - 6 * v) / v;
          expect(pl.moments.excessKurtosis).toBeCloseTo(expected, 10);
        },
      ),
    );
  });

  test("support is discrete {0, 1}", () => {
    const pl = payload(0.4);
    expect(pl.support).toEqual({ kind: "discrete", values: [0, 1] });
  });

  test("throws BernoulliError for p < 0", () => {
    expect(() => computeBernoulli({}, { p: -0.1 })).toThrow("p must be in [0, 1]");
  });

  test("throws BernoulliError for p > 1", () => {
    expect(() => computeBernoulli({}, { p: 1.1 })).toThrow("p must be in [0, 1]");
  });
});
