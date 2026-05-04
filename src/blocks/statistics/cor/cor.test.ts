import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { computeCor } from "./compute";

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

function covValue(cov: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: cov,
    provenance: { blockId: "stats.cov", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("stats.cor compute", () => {
  test("independent distributions have Cor = 0", () => {
    const result = computeCor({ cov: covValue(0), X: distValue(0, 4), Y: distValue(0, 9) }, {});
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "exact" });
    expect(result.payload).toBeCloseTo(0, 10);
  });

  test("Cor[X,X] = 1 when cov = var = 4", () => {
    const result = computeCor({ cov: covValue(4), X: distValue(0, 4), Y: distValue(0, 4) }, {});
    expect(result.payload).toBeCloseTo(1, 10);
  });

  test("Cor[-X, X] = -1 when cov = -var", () => {
    const result = computeCor({ cov: covValue(-4), X: distValue(0, 4), Y: distValue(0, 4) }, {});
    expect(result.payload).toBeCloseTo(-1, 10);
  });

  test("|Cor| <= 1 always", () => {
    const result = computeCor({ cov: covValue(2), X: distValue(0, 4), Y: distValue(0, 9) }, {});
    expect(Math.abs(result.payload as number)).toBeLessThanOrEqual(1 + 1e-10);
  });

  test("throws when cov is missing", () => {
    expect(() => computeCor({ X: distValue(0, 1), Y: distValue(0, 1) }, {})).toThrow(
      "cov, X, and Y inputs are required",
    );
  });

  test("returns 0 when both variances are zero", () => {
    const result = computeCor({ cov: covValue(0), X: distValue(1, 0), Y: distValue(2, 0) }, {});
    expect(result.payload).toBe(0);
  });
});

describe("stats.cor definition explain", () => {
  test("effect shows Cor[X,Y] value from output", async () => {
    const { CorBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0.75,
      provenance: { blockId: "stats.cor", inputs: [], computedAt: 0, engine: "native" },
    };
    const msg = CorBlock.explain.effect?.({}, output);
    expect(msg).toMatch(/0\.7500/);
  });

  test("impact is a non-empty static string", async () => {
    const { CorBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0,
      provenance: { blockId: "stats.cor", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(CorBlock.explain.impact?.({}, output)).toBeTruthy();
  });
});
