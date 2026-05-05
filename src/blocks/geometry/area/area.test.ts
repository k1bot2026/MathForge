import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { CirclePayload, MathValue, PolygonPayload } from "~/math/types";
import { AreaBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePolygon(vertices: number[][]): MathValue {
  return {
    type: { kind: "Polygon" },
    payload: vertices as PolygonPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeCircle(center: number[], radius: number): MathValue {
  return {
    type: { kind: "Circle" },
    payload: { center, radius } as CirclePayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.area", () => {
  test("id is geom.area", () => {
    expect(AreaBlock.id).toBe("geom.area");
  });

  // --- Polygon (shoelace) ---

  test("unit square: area = 1", () => {
    const out = AreaBlock.compute(
      {
        shape: makePolygon([
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ]),
      },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Scalar");
    expect(out.payload as number).toBeCloseTo(1, 10);
  });

  test("right triangle (0,0)-(1,0)-(0,1): area = 0.5", () => {
    const out = AreaBlock.compute(
      {
        shape: makePolygon([
          [0, 0],
          [1, 0],
          [0, 1],
        ]),
      },
      {},
      ctx,
    ) as MathValue;
    expect(out.payload as number).toBeCloseTo(0.5, 10);
  });

  test("3-4-5 right triangle: area = 6", () => {
    const out = AreaBlock.compute(
      {
        shape: makePolygon([
          [0, 0],
          [3, 0],
          [0, 4],
        ]),
      },
      {},
      ctx,
    ) as MathValue;
    expect(out.payload as number).toBeCloseTo(6, 10);
  });

  test("regular hexagon with unit circumradius: area ≈ 3√3/2", () => {
    const r = 1;
    const verts = Array.from({ length: 6 }, (_, i) => [
      r * Math.cos((2 * Math.PI * i) / 6),
      r * Math.sin((2 * Math.PI * i) / 6),
    ]);
    const out = AreaBlock.compute({ shape: makePolygon(verts) }, {}, ctx) as MathValue;
    expect(out.payload as number).toBeCloseTo((3 * Math.sqrt(3)) / 2, 8);
  });

  test("shoelace area is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })), {
          minLength: 3,
          maxLength: 8,
        }),
        (pts) => {
          const out = AreaBlock.compute({ shape: makePolygon(pts) }, {}, ctx) as MathValue;
          expect(out.payload as number).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  test("area is invariant to vertex rotation (CW vs CCW winding)", () => {
    const verts = [
      [0, 0],
      [2, 0],
      [2, 3],
      [0, 3],
    ];
    const reversed = [...verts].reverse();
    const a1 = (AreaBlock.compute({ shape: makePolygon(verts) }, {}, ctx) as MathValue)
      .payload as number;
    const a2 = (AreaBlock.compute({ shape: makePolygon(reversed) }, {}, ctx) as MathValue)
      .payload as number;
    expect(Math.abs(a1 - a2)).toBeLessThan(1e-10);
  });

  test("degenerate polygon (collinear points) has area 0", () => {
    const out = AreaBlock.compute(
      {
        shape: makePolygon([
          [0, 0],
          [1, 0],
          [2, 0],
        ]),
      },
      {},
      ctx,
    ) as MathValue;
    expect(Math.abs(out.payload as number)).toBeLessThan(1e-10);
  });

  // --- Circle ---

  test("unit circle: area = π", () => {
    const out = AreaBlock.compute({ shape: makeCircle([0, 0], 1) }, {}, ctx) as MathValue;
    expect(out.payload as number).toBeCloseTo(Math.PI, 10);
  });

  test("circle r=3: area = 9π", () => {
    const out = AreaBlock.compute({ shape: makeCircle([5, -2], 3) }, {}, ctx) as MathValue;
    expect(out.payload as number).toBeCloseTo(9 * Math.PI, 10);
  });

  test("circle area scales as r²", () => {
    fc.assert(
      fc.property(fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }), (r) => {
        const out = AreaBlock.compute({ shape: makeCircle([0, 0], r) }, {}, ctx) as MathValue;
        expect(out.payload as number).toBeCloseTo(Math.PI * r * r, 5);
      }),
    );
  });

  // --- Error cases ---

  test("throws when shape is missing", () => {
    expect(() => AreaBlock.compute({}, {}, ctx)).toThrow();
  });

  test("throws for wrong type (Line)", () => {
    const line: MathValue = {
      type: { kind: "Line", n: 2 },
      payload: { point: [0, 0], direction: [1, 0] },
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(() => AreaBlock.compute({ shape: line }, {}, ctx)).toThrow();
  });
});
