import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { computeVar } from "./compute";

function distValue(mean: number, variance: number): MathValue {
  return {
    type: { kind: "Distribution", family: "Normal" },
    payload: {
      parameters: { family: "Normal", mu: mean, sigma: Math.sqrt(variance) },
      moments: { mean, variance },
      support: { kind: "continuous", lo: -Infinity, hi: Infinity },
    } as unknown as DistributionPayload as unknown as number,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("stats.var compute", () => {
  test("returns the variance from Distribution moments", () => {
    const result = computeVar({ dist: distValue(0, 4) }, {});
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "exact" });
    expect(result.payload).toBeCloseTo(4, 10);
  });

  test("Var[X] = 0.25 for Bernoulli(0.5)", () => {
    const result = computeVar({ dist: distValue(0.5, 0.25) }, {});
    expect(result.payload).toBeCloseTo(0.25, 10);
  });

  test("throws when dist is missing", () => {
    expect(() => computeVar({}, {})).toThrow("dist input is required");
  });
});
