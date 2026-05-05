import { describe, expect, it } from "vitest";
import type { MathValue } from "~/math/types";
import { RootFindingVizBlock } from "./root-finding";

const ctx = { signal: new AbortController().signal };

function makeScalar(v: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: v,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeFn(expression: string): MathValue {
  return {
    type: {
      kind: "Function",
      arity: 1,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: { expression, variables: ["x"] },
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("viz.root-finding", () => {
  it("throws when fn is missing", () => {
    expect(() => RootFindingVizBlock.compute({}, {}, ctx)).toThrow("fn input is required");
  });

  it("returns root passthrough when root is connected", () => {
    const fn = makeFn("x^2 - 4");
    const root = makeScalar(2);
    const out = RootFindingVizBlock.compute({ fn, root }, {}, ctx) as MathValue;
    expect(out.payload).toBe(2);
  });

  it("returns NaN placeholder when root is not connected", () => {
    const fn = makeFn("x^2 - 4");
    const out = RootFindingVizBlock.compute({ fn }, {}, ctx) as MathValue;
    expect(Number.isNaN(out.payload as number)).toBe(true);
  });

  it("has correct block metadata", () => {
    expect(RootFindingVizBlock.id).toBe("viz.root-finding");
    expect(RootFindingVizBlock.category).toBe("visualizer");
    expect(RootFindingVizBlock.domain).toBe("optimization");
  });

  it("root, x_min, x_max inputs are optional", () => {
    for (const id of ["root", "x_min", "x_max"]) {
      const port = RootFindingVizBlock.inputs.find((p) => p.id === id);
      expect(port?.required, `${id} should be optional`).toBe(false);
    }
  });
});
