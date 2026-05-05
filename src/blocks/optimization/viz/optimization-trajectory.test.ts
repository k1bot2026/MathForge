import { describe, expect, it } from "vitest";
import type { MathValue } from "~/math/types";
import { OptimizationTrajectoryBlock } from "./optimization-trajectory";

const ctx = { signal: new AbortController().signal };

function makeFn2d(expression: string): MathValue {
  return {
    type: {
      kind: "Function",
      arity: 2,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: { expression, variables: ["x", "y"] },
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeVector2(x: number, y: number): MathValue {
  return {
    type: { kind: "Vector", n: 2, field: "real" },
    payload: [x, y],
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("viz.optimization-trajectory", () => {
  it("throws when fn is missing", () => {
    expect(() => OptimizationTrajectoryBlock.compute({}, {}, ctx)).toThrow("fn input is required");
  });

  it("passes fn through compute", () => {
    const fn = makeFn2d("x^2 + y^2");
    const out = OptimizationTrajectoryBlock.compute({ fn }, {}, ctx) as MathValue;
    expect(out.type.kind).toBe("Function");
  });

  it("accepts optional optimal and start vectors", () => {
    const fn = makeFn2d("x^2 + y^2");
    const optimal = makeVector2(0, 0);
    const start = makeVector2(2, 2);
    const out = OptimizationTrajectoryBlock.compute({ fn, optimal, start }, {}, ctx) as MathValue;
    expect(out.type.kind).toBe("Function");
  });

  it("has correct block metadata", () => {
    expect(OptimizationTrajectoryBlock.id).toBe("viz.optimization-trajectory");
    expect(OptimizationTrajectoryBlock.category).toBe("visualizer");
    expect(OptimizationTrajectoryBlock.domain).toBe("optimization");
  });

  it("optional inputs are marked optional", () => {
    for (const id of ["optimal", "start", "x_min", "x_max", "y_min", "y_max"]) {
      const port = OptimizationTrajectoryBlock.inputs.find((p) => p.id === id);
      expect(port?.required, `${id} should be optional`).toBe(false);
    }
  });
});
