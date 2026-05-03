import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { computeCov } from "./compute";

let _uid = 0;
function distValue(mean: number, variance: number): MathValue {
  return {
    type: { kind: "Distribution", family: "Normal" },
    payload: {
      parameters: { family: "Normal", mu: mean, sigma: Math.sqrt(variance) },
      moments: { mean, variance },
      support: { kind: "continuous", lo: -Infinity, hi: Infinity },
    } as unknown as DistributionPayload as unknown as number,
    // Unique blockId per call so independent distributions have distinct provenance.
    provenance: { blockId: `test-${_uid++}`, inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("stats.cov compute", () => {
  test("independent distributions have Cov = 0", () => {
    const result = computeCov({ X: distValue(2, 3), Y: distValue(5, 1) }, {});
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "exact" });
    expect(result.payload).toBe(0);
  });

  test("Cov(X, X) = Var[X] when same distribution object is passed for both inputs", () => {
    const X = distValue(2, 4);
    const result = computeCov({ X, Y: X }, {});
    expect(result.payload).toBe(4);
  });

  test("throws when X is missing", () => {
    expect(() => computeCov({ Y: distValue(0, 1) }, {})).toThrow(
      "X and Y distribution inputs are required",
    );
  });

  test("throws when Y is missing", () => {
    expect(() => computeCov({ X: distValue(0, 1) }, {})).toThrow(
      "X and Y distribution inputs are required",
    );
  });
});
