import { describe, expect, it } from "vitest";
import type { MathValue } from "~/math/types";
import { ConvergencePlotBlock } from "./convergence-plot";

const ctx = { signal: new AbortController().signal };

function makeVector(data: number[]): MathValue {
  return {
    type: { kind: "Vector", n: data.length, field: "real" },
    payload: data,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("viz.convergence-plot", () => {
  it("passes residuals through compute", () => {
    const data = [1e-1, 1e-3, 1e-6, 1e-9];
    const r = makeVector(data);
    const out = ConvergencePlotBlock.compute({ residuals: r }, {}, ctx) as MathValue;
    expect(out.payload).toEqual(data);
  });

  it("throws when residuals is missing", () => {
    expect(() => ConvergencePlotBlock.compute({}, {}, ctx)).toThrow("residuals vector is required");
  });

  it("has correct block metadata", () => {
    expect(ConvergencePlotBlock.id).toBe("viz.convergence-plot");
    expect(ConvergencePlotBlock.category).toBe("visualizer");
    expect(ConvergencePlotBlock.domain).toBe("optimization");
  });
});
