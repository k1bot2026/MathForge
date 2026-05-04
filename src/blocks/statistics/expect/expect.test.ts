import { describe, expect, test } from "vitest";
import type { DistributionFamily, MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { computeExpect } from "./compute";

function distValue(
  mean: number,
  variance: number,
  family: DistributionFamily = "Normal",
): MathValue {
  return {
    type: { kind: "Distribution", family },
    payload: {
      parameters: { family: "Normal", mu: mean, sigma: Math.sqrt(variance) },
      moments: { mean, variance },
      support: { kind: "continuous", lo: -Infinity, hi: Infinity },
    } as unknown as DistributionPayload as unknown as number,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("stats.expect compute", () => {
  test("returns the mean from Distribution moments", () => {
    const result = computeExpect({ dist: distValue(3.14, 1) }, {});
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "exact" });
    expect(result.payload).toBeCloseTo(3.14, 10);
  });

  test("E[X] for Bernoulli(p) = p", () => {
    const result = computeExpect({ dist: distValue(0.7, 0.21) }, {});
    expect(result.payload).toBeCloseTo(0.7, 10);
  });

  test("E[X] = 0 for zero-mean distribution", () => {
    const result = computeExpect({ dist: distValue(0, 2) }, {});
    expect(result.payload).toBeCloseTo(0, 10);
  });

  test("throws when dist is missing", () => {
    expect(() => computeExpect({}, {})).toThrow("dist input is required");
  });
});

describe("stats.expect definition explain", () => {
  test("effect shows E[X] value from output", async () => {
    const { ExpectBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 2.5,
      provenance: { blockId: "stats.expect", inputs: [], computedAt: 0, engine: "native" },
    };
    const msg = ExpectBlock.explain.effect?.({}, output);
    expect(msg).toMatch(/2\.50000/);
  });

  test("impact is a non-empty static string", async () => {
    const { ExpectBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0,
      provenance: { blockId: "stats.expect", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(ExpectBlock.explain.impact?.({}, output)).toBeTruthy();
  });
});
