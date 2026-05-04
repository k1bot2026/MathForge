import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { DistributionPayload } from "../distribution-payload";
import { computeBinomial } from "./compute";

function payload(n: number, p: number): DistributionPayload {
  return computeBinomial({}, { n, p }).payload as unknown as DistributionPayload;
}

describe("stats.binomial compute", () => {
  test("type is Distribution(Binomial)", () => {
    expect(computeBinomial({}, { n: 10, p: 0.5 }).type).toEqual({
      kind: "Distribution",
      family: "Binomial",
    });
  });

  test("parameters carry n and p", () => {
    const pl = payload(10, 0.4);
    expect(pl.parameters).toMatchObject({ family: "Binomial", n: 10, p: 0.4 });
  });

  test("E[X] = n·p", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        (n, p) => {
          expect(payload(n, p).moments.mean).toBeCloseTo(n * p, 10);
        },
      ),
    );
  });

  test("Var[X] = n·p·(1-p)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        (n, p) => {
          expect(payload(n, p).moments.variance).toBeCloseTo(n * p * (1 - p), 10);
        },
      ),
    );
  });

  test("Var[X] = 0 when n=0", () => {
    expect(payload(0, 0.5).moments.variance).toBeCloseTo(0, 12);
  });

  test("skewness = (1-2p)/sqrt(n·p·(1-p)) for non-degenerate", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }),
        (n, p) => {
          const v = n * p * (1 - p);
          const expected = (1 - 2 * p) / Math.sqrt(v);
          expect(payload(n, p).moments.skewness).toBeCloseTo(expected, 8);
        },
      ),
    );
  });

  test("excess kurtosis = (1-6p(1-p))/(n·p·(1-p)) for non-degenerate", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.99), noNaN: true }),
        (n, p) => {
          const v = n * p * (1 - p);
          const expected = (1 - 6 * p * (1 - p)) / v;
          expect(payload(n, p).moments.excessKurtosis).toBeCloseTo(expected, 8);
        },
      ),
    );
  });

  test("support is discrete 0..n", () => {
    const pl = payload(5, 0.3);
    expect(pl.support).toEqual({ kind: "discrete", values: [0, 1, 2, 3, 4, 5] });
  });

  test("Bernoulli(p) is Binomial(1, p) — moments agree", () => {
    fc.assert(
      fc.property(fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }), (p) => {
        const bl = payload(1, p);
        expect(bl.moments.mean).toBeCloseTo(p, 10);
        expect(bl.moments.variance).toBeCloseTo(p * (1 - p), 10);
      }),
    );
  });

  test("throws for n < 0", () => {
    expect(() => computeBinomial({}, { n: -1, p: 0.5 })).toThrow(
      "n must be a non-negative integer",
    );
  });

  test("throws for non-integer n", () => {
    expect(() => computeBinomial({}, { n: 2.5, p: 0.5 })).toThrow(
      "n must be a non-negative integer",
    );
  });

  test("throws for p outside [0,1]", () => {
    expect(() => computeBinomial({}, { n: 5, p: 1.5 })).toThrow("p must be in [0, 1]");
  });
});

describe("stats.binomial definition explain", () => {
  test("effect shows E[X] from output", async () => {
    const { BinomialBlock } = await import("./definition");
    const { computeBinomial } = await import("./compute");
    const output = computeBinomial({}, { n: 10, p: 0.5 });
    const msg = BinomialBlock.explain.effect?.({}, output);
    expect(msg).toMatch(/Binomial/);
    expect(msg).toMatch(/5\.000/);
  });

  test("impact is a non-empty static string", async () => {
    const { BinomialBlock } = await import("./definition");
    const { computeBinomial } = await import("./compute");
    const output = computeBinomial({}, { n: 10, p: 0.5 });
    expect(BinomialBlock.explain.impact?.({}, output)).toBeTruthy();
  });
});
