import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, SetPayload, VectorPayload } from "~/math/types";
import { FeasibleRegionBlock, FeasibleRegionError } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeVector(values: number[]): MathValue {
  return {
    type: { kind: "Vector", n: values.length, field: "real" },
    payload: values as VectorPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeMatrix(rows: number[][]): MathValue {
  return {
    type: {
      kind: "Matrix",
      m: rows.length,
      n: rows[0]?.length ?? 0,
      field: "real",
    },
    payload: rows,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeLPTuple(c: number[], A: number[][], b: number[]): MathValue {
  return {
    type: {
      kind: "Tuple",
      elements: [
        { kind: "Vector", n: c.length, field: "real" },
        { kind: "Matrix", m: A.length, n: c.length, field: "real" },
        { kind: "Vector", n: b.length, field: "real" },
      ],
    },
    payload: [makeVector(c), makeMatrix(A), makeVector(b)],
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function getVertices(result: MathValue): number[][] {
  const set = result.payload as SetPayload;
  return set.map((v) => v.payload as number[]);
}

// LP:  x1 + x2 ≤ 4,  x1 - x2 ≤ 2,  x1,x2 ≥ 0
// Expected vertices (convex hull):
//   (0, 0), (2, 0), (3, 1), (0, 4)
const lp2 = makeLPTuple(
  [-1, -1],
  [
    [1, 1],
    [1, -1],
  ],
  [4, 2],
);

// LP:  x1 ≤ 3,  x2 ≤ 3,  x1,x2 ≥ 0
// Feasible region: unit rectangle [0,3]×[0,3]
// Vertices: (0,0), (3,0), (3,3), (0,3)
const lpRect = makeLPTuple(
  [0, 0],
  [
    [1, 0],
    [0, 1],
  ],
  [3, 3],
);

describe("opt.feasible-region", () => {
  test("id is opt.feasible-region", () => {
    expect(FeasibleRegionBlock.id).toBe("opt.feasible-region");
  });

  test("output type is Set", () => {
    const result = FeasibleRegionBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    expect(result.type.kind).toBe("Set");
  });

  test("output Set element type is Vector", () => {
    const result = FeasibleRegionBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    if (result.type.kind === "Set") {
      expect(result.type.element.kind).toBe("Vector");
    }
  });

  test("classic 2-var LP has 4 vertices", () => {
    const result = FeasibleRegionBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    const vertices = getVertices(result);
    expect(vertices).toHaveLength(4);
  });

  test("classic 2-var LP vertices include origin", () => {
    const result = FeasibleRegionBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    const vertices = getVertices(result);
    const hasOrigin = vertices.some(
      (v) => Math.abs(v[0] ?? 0) < 1e-8 && Math.abs(v[1] ?? 0) < 1e-8,
    );
    expect(hasOrigin).toBe(true);
  });

  test("classic 2-var LP vertices include (3, 1) — intersection of x1+x2=4 and x1-x2=2", () => {
    const result = FeasibleRegionBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    const vertices = getVertices(result);
    const hasVertex = vertices.some(
      (v) => Math.abs((v[0] ?? 0) - 3) < 1e-6 && Math.abs((v[1] ?? 0) - 1) < 1e-6,
    );
    expect(hasVertex).toBe(true);
  });

  test("classic 2-var LP vertices include (2, 0) — x1-x2=2 meets x2=0", () => {
    const result = FeasibleRegionBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    const vertices = getVertices(result);
    const hasVertex = vertices.some(
      (v) => Math.abs((v[0] ?? 0) - 2) < 1e-6 && Math.abs(v[1] ?? 0) < 1e-6,
    );
    expect(hasVertex).toBe(true);
  });

  test("classic 2-var LP vertices include (0, 4) — x1+x2=4 meets x1=0", () => {
    const result = FeasibleRegionBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    const vertices = getVertices(result);
    const hasVertex = vertices.some(
      (v) => Math.abs(v[0] ?? 0) < 1e-6 && Math.abs((v[1] ?? 0) - 4) < 1e-6,
    );
    expect(hasVertex).toBe(true);
  });

  test("rectangle LP has 4 vertices", () => {
    const result = FeasibleRegionBlock.compute({ lp: lpRect }, {}, ctx) as MathValue;
    const vertices = getVertices(result);
    expect(vertices).toHaveLength(4);
  });

  test("rectangle LP vertices are counterclockwise", () => {
    const result = FeasibleRegionBlock.compute({ lp: lpRect }, {}, ctx) as MathValue;
    const vertices = getVertices(result);
    // Signed area of polygon: positive → counterclockwise
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i] ?? [0, 0];
      const w = vertices[(i + 1) % vertices.length] ?? [0, 0];
      area += (v[0] ?? 0) * (w[1] ?? 0) - (w[0] ?? 0) * (v[1] ?? 0);
    }
    expect(area).toBeGreaterThan(0);
  });

  test("all vertices satisfy Ax ≤ b and x ≥ 0", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (m) => {
        // Build a simple bounded LP: xi ≤ 1 for each i, 2 variables
        const A = Array.from({ length: m }, (_, i) => [i === 0 ? 1 : 0, i === 1 ? 1 : 0]);
        const b = Array.from({ length: m }, () => 1);
        const lp = makeLPTuple([0, 0], A, b);
        const result = FeasibleRegionBlock.compute({ lp }, {}, ctx) as MathValue;
        const vertices = getVertices(result);
        for (const v of vertices) {
          // x ≥ 0
          expect(v[0] ?? 0).toBeGreaterThanOrEqual(-1e-8);
          expect(v[1] ?? 0).toBeGreaterThanOrEqual(-1e-8);
          // Ax ≤ b
          for (let i = 0; i < A.length; i++) {
            const lhs = (A[i]?.[0] ?? 0) * (v[0] ?? 0) + (A[i]?.[1] ?? 0) * (v[1] ?? 0);
            expect(lhs).toBeLessThanOrEqual((b[i] ?? 0) + 1e-8);
          }
        }
      }),
    );
  });

  test("throws FeasibleRegionError when lp missing", () => {
    expect(() => FeasibleRegionBlock.compute({}, {}, ctx)).toThrow(FeasibleRegionError);
  });

  test("throws FeasibleRegionError when n ≠ 2", () => {
    // 3-variable LP — not supported by this block
    const lp3 = makeLPTuple([0, 0, 0], [[1, 0, 0]], [1]);
    expect(() => FeasibleRegionBlock.compute({ lp: lp3 }, {}, ctx)).toThrow(FeasibleRegionError);
  });

  test("explain.effect prompts when lp missing", () => {
    const msg = FeasibleRegionBlock.explain.effect?.({}, {} as MathValue);
    expect(msg).toContain("Connect");
  });

  test("explain.effect describes 2D when connected", () => {
    const msg = FeasibleRegionBlock.explain.effect?.({ lp: lp2 }, {} as MathValue);
    expect(msg).toContain("2");
  });
});
