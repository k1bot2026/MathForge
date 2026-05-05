import { describe, expect, it } from "vitest";
import type { MathValue } from "~/math/types";
import { RegressionLineBlock } from "./regression-line";

const ctx = { signal: new AbortController().signal };

function makeVector(data: number[]): MathValue {
  return {
    type: { kind: "Vector", n: data.length, field: "real" },
    payload: data,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("viz.regression-line", () => {
  it("passes x vector through compute", () => {
    const xs = [1, 2, 3, 4];
    const x = makeVector(xs);
    const y = makeVector([2, 4, 6, 8]);
    const out = RegressionLineBlock.compute({ x, y }, {}, ctx) as MathValue;
    expect(out.payload).toEqual(xs);
  });

  it("throws when x is missing", () => {
    const y = makeVector([1, 2]);
    expect(() => RegressionLineBlock.compute({ y }, {}, ctx)).toThrow("x vector is required");
  });

  it("has correct block metadata", () => {
    expect(RegressionLineBlock.id).toBe("viz.regression-line");
    expect(RegressionLineBlock.category).toBe("visualizer");
    expect(RegressionLineBlock.domain).toBe("optimization");
  });

  it("fit input is optional", () => {
    const fitPort = RegressionLineBlock.inputs.find((p) => p.id === "fit");
    expect(fitPort?.required).toBe(false);
  });
});
