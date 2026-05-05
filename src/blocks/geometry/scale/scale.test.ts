import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { CirclePayload, MathValue, PolygonPayload } from "~/math/types";
import { ScaleBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
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

function makePolygon(vertices: number[][]): MathValue {
  return {
    type: { kind: "Polygon" },
    payload: vertices as PolygonPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.scale", () => {
  test("id is geom.scale", () => {
    expect(ScaleBlock.id).toBe("geom.scale");
  });

  // --- Point ---
  test("scale (2,4) by factor 3 about origin → (6,12)", () => {
    const out = ScaleBlock.compute(
      { shape: makePoint([2, 4]), center: makePoint([0, 0]) },
      { factor: 3 },
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Point");
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(6, 8);
    expect(p[1]).toBeCloseTo(12, 8);
  });

  test("scale by factor 1 → same point", () => {
    const out = ScaleBlock.compute(
      { shape: makePoint([5, -3]), center: makePoint([1, 2]) },
      { factor: 1 },
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(5, 8);
    expect(p[1]).toBeCloseTo(-3, 8);
  });

  test("scale center point → same point", () => {
    const out = ScaleBlock.compute(
      { shape: makePoint([3, 7]), center: makePoint([3, 7]) },
      { factor: 5 },
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(3, 8);
    expect(p[1]).toBeCloseTo(7, 8);
  });

  test("scale about non-origin center: (3,0) by factor 2 about (1,0) → (5,0)", () => {
    const out = ScaleBlock.compute(
      { shape: makePoint([3, 0]), center: makePoint([1, 0]) },
      { factor: 2 },
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(5, 8);
    expect(p[1]).toBeCloseTo(0, 8);
  });

  // --- Circle ---
  test("scale circle: center scales, radius scales", () => {
    const c = makeCircle([2, 0], 3);
    const out = ScaleBlock.compute(
      { shape: c, center: makePoint([0, 0]) },
      { factor: 2 },
      ctx,
    ) as MathValue;
    const res = out.payload as CirclePayload;
    expect(res.center[0]).toBeCloseTo(4, 8);
    expect(res.center[1]).toBeCloseTo(0, 8);
    expect(res.radius).toBeCloseTo(6, 8);
  });

  // --- Polygon ---
  test("scale unit square by 3 about origin → 3×3 square", () => {
    const poly = makePolygon([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    const out = ScaleBlock.compute(
      { shape: poly, center: makePoint([0, 0]) },
      { factor: 3 },
      ctx,
    ) as MathValue;
    const verts = out.payload as number[][];
    expect(verts[1]?.[0]).toBeCloseTo(3, 8);
    expect(verts[2]?.[0]).toBeCloseTo(3, 8);
    expect(verts[2]?.[1]).toBeCloseTo(3, 8);
  });

  // --- Properties ---
  test("scale by k then by 1/k → identity (property)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        (px, py, k) => {
          const s1 = ScaleBlock.compute(
            { shape: makePoint([px, py]), center: makePoint([0, 0]) },
            { factor: k },
            ctx,
          ) as MathValue;
          const s2 = (
            ScaleBlock.compute(
              { shape: s1, center: makePoint([0, 0]) },
              { factor: 1 / k },
              ctx,
            ) as MathValue
          ).payload as number[];
          expect(s2[0]).toBeCloseTo(px, 5);
          expect(s2[1]).toBeCloseTo(py, 5);
        },
      ),
    );
  });

  // --- Errors ---
  test("throws when shape is missing", () => {
    expect(() => ScaleBlock.compute({ center: makePoint([0, 0]) }, { factor: 2 }, ctx)).toThrow();
  });

  test("throws when center is missing", () => {
    expect(() => ScaleBlock.compute({ shape: makePoint([1, 0]) }, { factor: 2 }, ctx)).toThrow();
  });
});
