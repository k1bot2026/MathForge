import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { computeEmpirical } from "./compute";

function makeVector(samples: number[]): MathValue {
  return {
    type: { kind: "Vector", n: samples.length, field: "real" },
    payload: samples,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function payload(samples: number[]): DistributionPayload {
  return computeEmpirical({ samples: makeVector(samples) }, {})
    .payload as unknown as DistributionPayload;
}

describe("stats.empirical compute", () => {
  test("type is Distribution(Empirical)", () => {
    expect(computeEmpirical({ samples: makeVector([1, 2, 3]) }, {}).type).toEqual({
      kind: "Distribution",
      family: "Empirical",
    });
  });

  test("E[X] = sample mean", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), {
          minLength: 1,
          maxLength: 50,
        }),
        (samples) => {
          const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
          expect(payload(samples).moments.mean).toBeCloseTo(mean, 5);
        },
      ),
    );
  });

  test("Var[X] = sample variance (population, divided by n)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: Math.fround(-100), max: Math.fround(100), noNaN: true }), {
          minLength: 2,
          maxLength: 50,
        }),
        (samples) => {
          const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
          const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / samples.length;
          expect(payload(samples).moments.variance).toBeCloseTo(variance, 5);
        },
      ),
    );
  });

  test("support carries the original sample array", () => {
    const samples = [1, 2, 3, 4];
    const pl = payload(samples);
    expect(pl.support.kind).toBe("discrete");
    expect((pl.support as { kind: "discrete"; values: ReadonlyArray<number> }).values).toEqual(
      samples,
    );
  });

  test("parameters carry the sample array", () => {
    const samples = [0.5, 1.5];
    const pl = payload(samples);
    expect(pl.parameters).toMatchObject({ family: "Empirical" });
  });

  test("single-element sample: mean = x, variance = 0", () => {
    const pl = payload([7]);
    expect(pl.moments.mean).toBeCloseTo(7, 12);
    expect(pl.moments.variance).toBeCloseTo(0, 12);
  });

  test("throws when samples input is missing", () => {
    expect(() => computeEmpirical({}, {})).toThrow("samples input is required");
  });

  test("throws when samples is empty", () => {
    expect(() => computeEmpirical({ samples: makeVector([]) }, {})).toThrow(
      "samples must be non-empty",
    );
  });
});

describe("stats.empirical definition explain", () => {
  test("effect shows sample count and E[X] from output", async () => {
    const { EmpiricalBlock } = await import("./definition");
    const output = computeEmpirical({ samples: makeVector([1, 2, 3, 4, 5]) }, {});
    const msg = EmpiricalBlock.explain.effect?.({}, output);
    expect(msg).toMatch(/Empirical/);
    expect(msg).toMatch(/5 samples/);
    expect(msg).toMatch(/3\.000/);
  });

  test("impact is a non-empty static string", async () => {
    const { EmpiricalBlock } = await import("./definition");
    const output = computeEmpirical({ samples: makeVector([1]) }, {});
    expect(EmpiricalBlock.explain.impact?.({}, output)).toBeTruthy();
  });
});
