import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { CirclePayload, MathValue, PolygonPayload } from "~/math/types";
import { PerimeterBlock } from "./definition";

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

describe("geom.perimeter", () => {
  test("id is geom.perimeter", () => {
    expect(PerimeterBlock.id).toBe("geom.perimeter");
  });

  // --- Polygon ---

  test("unit square: perimeter = 4", () => {
    const out = PerimeterBlock.compute(
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
    expect(out.payload as number).toBeCloseTo(4, 10);
  });

  test("3-4-5 right triangle: perimeter = 12", () => {
    const out = PerimeterBlock.compute(
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
    expect(out.payload as number).toBeCloseTo(12, 10);
  });

  test("equilateral triangle with side 2: perimeter = 6", () => {
    const h = Math.sqrt(3);
    const out = PerimeterBlock.compute(
      {
        shape: makePolygon([
          [0, 0],
          [2, 0],
          [1, h],
        ]),
      },
      {},
      ctx,
    ) as MathValue;
    expect(out.payload as number).toBeCloseTo(6, 8);
  });

  test("perimeter is non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })), {
          minLength: 3,
          maxLength: 8,
        }),
        (pts) => {
          const out = PerimeterBlock.compute({ shape: makePolygon(pts) }, {}, ctx) as MathValue;
          expect(out.payload as number).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  test("perimeter is invariant to cyclic rotation of vertices", () => {
    const verts = [
      [0, 0],
      [3, 0],
      [3, 4],
      [0, 4],
    ];
    const rotated = [...verts.slice(2), ...verts.slice(0, 2)];
    const p1 = (PerimeterBlock.compute({ shape: makePolygon(verts) }, {}, ctx) as MathValue)
      .payload as number;
    const p2 = (PerimeterBlock.compute({ shape: makePolygon(rotated) }, {}, ctx) as MathValue)
      .payload as number;
    expect(Math.abs(p1 - p2)).toBeLessThan(1e-9);
  });

  test("perimeter is symmetric to vertex reversal (winding)", () => {
    const verts = [
      [0, 0],
      [2, 0],
      [2, 3],
      [0, 3],
    ];
    const reversed = [...verts].reverse();
    const p1 = (PerimeterBlock.compute({ shape: makePolygon(verts) }, {}, ctx) as MathValue)
      .payload as number;
    const p2 = (PerimeterBlock.compute({ shape: makePolygon(reversed) }, {}, ctx) as MathValue)
      .payload as number;
    expect(Math.abs(p1 - p2)).toBeLessThan(1e-9);
  });

  // --- Circle ---

  test("unit circle: circumference = 2π", () => {
    const out = PerimeterBlock.compute({ shape: makeCircle([0, 0], 1) }, {}, ctx) as MathValue;
    expect(out.payload as number).toBeCloseTo(2 * Math.PI, 10);
  });

  test("circle r=5: circumference = 10π", () => {
    const out = PerimeterBlock.compute({ shape: makeCircle([1, 2], 5) }, {}, ctx) as MathValue;
    expect(out.payload as number).toBeCloseTo(10 * Math.PI, 10);
  });

  test("circumference scales linearly with r", () => {
    fc.assert(
      fc.property(fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }), (r) => {
        const out = PerimeterBlock.compute({ shape: makeCircle([0, 0], r) }, {}, ctx) as MathValue;
        expect(out.payload as number).toBeCloseTo(2 * Math.PI * r, 5);
      }),
    );
  });

  // --- Error cases ---

  test("throws when shape is missing", () => {
    expect(() => PerimeterBlock.compute({}, {}, ctx)).toThrow();
  });

  test("throws for wrong type (Line)", () => {
    const line: MathValue = {
      type: { kind: "Line", n: 2 },
      payload: { point: [0, 0], direction: [1, 0] },
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(() => PerimeterBlock.compute({ shape: line }, {}, ctx)).toThrow();
  });
});
