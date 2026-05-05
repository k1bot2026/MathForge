import { describe, expect, it } from "vitest";
import type { MathValue } from "~/math/types";
import { FeasiblePolytopeBlock } from "./feasible-polytope";

const ctx = { signal: new AbortController().signal };

function makeVertex(x: number, y: number): MathValue {
  return {
    type: { kind: "Vector", n: 2, field: "real" },
    payload: [x, y],
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeVertexSet(pts: [number, number][]): MathValue {
  return {
    type: { kind: "Set", element: { kind: "Vector", n: 2, field: "real" } },
    payload: pts.map(([x, y]) => makeVertex(x, y)),
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("viz.feasible-polytope", () => {
  it("passes vertices through compute", () => {
    const vertices = makeVertexSet([
      [0, 0],
      [4, 0],
      [0, 3],
    ]);
    const out = FeasiblePolytopeBlock.compute({ vertices }, {}, ctx) as MathValue;
    expect(out.type.kind).toBe("Set");
    expect((out.payload as MathValue[]).length).toBe(3);
  });

  it("throws when vertices is missing", () => {
    expect(() => FeasiblePolytopeBlock.compute({}, {}, ctx)).toThrow("vertices input is required");
  });

  it("has correct block metadata", () => {
    expect(FeasiblePolytopeBlock.id).toBe("viz.feasible-polytope");
    expect(FeasiblePolytopeBlock.category).toBe("visualizer");
    expect(FeasiblePolytopeBlock.domain).toBe("optimization");
  });

  it("optimal input is optional", () => {
    const port = FeasiblePolytopeBlock.inputs.find((p) => p.id === "optimal");
    expect(port?.required).toBe(false);
  });
});
