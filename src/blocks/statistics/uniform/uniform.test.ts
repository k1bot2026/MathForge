import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { DistributionPayload } from "../distribution-payload";
import { computeUniform } from "./compute";

function payload(a: number, b: number): DistributionPayload {
  return computeUniform({}, { a, b }).payload as unknown as DistributionPayload;
}

describe("stats.uniform compute", () => {
  test("type is Distribution(Uniform)", () => {
    expect(computeUniform({}, { a: 0, b: 1 }).type).toEqual({
      kind: "Distribution",
      family: "Uniform",
    });
  });

  test("E[X] = (a+b)/2", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(100), noNaN: true }),
        (a, width) => {
          const b = a + width;
          expect(payload(a, b).moments.mean).toBeCloseTo((a + b) / 2, 8);
        },
      ),
    );
  });

  test("Var[X] = (b-a)²/12", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(100), noNaN: true }),
        (a, width) => {
          const b = a + width;
          const expected = (b - a) ** 2 / 12;
          expect(payload(a, b).moments.variance).toBeCloseTo(expected, 6);
        },
      ),
    );
  });

  test("skewness = 0 (symmetric distribution)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(100), noNaN: true }),
        (a, width) => {
          const b = a + width;
          expect(payload(a, b).moments.skewness).toBeCloseTo(0, 12);
        },
      ),
    );
  });

  test("excess kurtosis = -6/5 = -1.2", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(100), noNaN: true }),
        (a, width) => {
          const b = a + width;
          expect(payload(a, b).moments.excessKurtosis).toBeCloseTo(-1.2, 10);
        },
      ),
    );
  });

  test("support is continuous [a, b]", () => {
    const pl = payload(-2, 3);
    expect(pl.support).toEqual({ kind: "continuous", lo: -2, hi: 3 });
  });

  test("standard uniform U(0,1): mean=0.5, var=1/12", () => {
    const pl = payload(0, 1);
    expect(pl.moments.mean).toBeCloseTo(0.5, 12);
    expect(pl.moments.variance).toBeCloseTo(1 / 12, 12);
  });

  test("throws when a >= b", () => {
    expect(() => computeUniform({}, { a: 1, b: 1 })).toThrow("a must be strictly less than b");
    expect(() => computeUniform({}, { a: 2, b: 1 })).toThrow("a must be strictly less than b");
  });
});

describe("stats.uniform definition explain", () => {
  test("effect shows E[X] from output", async () => {
    const { UniformBlock } = await import("./definition");
    const { computeUniform } = await import("./compute");
    const output = computeUniform({}, { a: 0, b: 1 });
    const msg = UniformBlock.explain.effect?.({}, output);
    expect(msg).toMatch(/Uniform/);
    expect(msg).toMatch(/0\.5000/);
  });

  test("impact is a non-empty static string", async () => {
    const { UniformBlock } = await import("./definition");
    const { computeUniform } = await import("./compute");
    const output = computeUniform({}, { a: 0, b: 1 });
    expect(UniformBlock.explain.impact?.({}, output)).toBeTruthy();
  });
});
