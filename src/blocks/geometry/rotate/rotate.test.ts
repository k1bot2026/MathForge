import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { CirclePayload, LinePayload, MathValue, PolygonPayload } from "~/math/types";
import { RotateBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeLine(payload: LinePayload): MathValue {
  return {
    type: { kind: "Line", n: 2 },
    payload,
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

describe("geom.rotate", () => {
  test("id is geom.rotate", () => {
    expect(RotateBlock.id).toBe("geom.rotate");
  });

  // --- Point ---
  test("rotate (1,0) by 90° about origin → (0,1)", () => {
    const out = RotateBlock.compute(
      { shape: makePoint([1, 0]), center: makePoint([0, 0]) },
      { angle: Math.PI / 2 },
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Point");
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(0, 8);
    expect(p[1]).toBeCloseTo(1, 8);
  });

  test("rotate (1,0) by 180° about origin → (-1,0)", () => {
    const out = RotateBlock.compute(
      { shape: makePoint([1, 0]), center: makePoint([0, 0]) },
      { angle: Math.PI },
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(-1, 8);
    expect(p[1]).toBeCloseTo(0, 8);
  });

  test("rotate by 0 → same point", () => {
    const out = RotateBlock.compute(
      { shape: makePoint([3, 4]), center: makePoint([1, 1]) },
      { angle: 0 },
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(3, 8);
    expect(p[1]).toBeCloseTo(4, 8);
  });

  test("rotate (1,0) by 90° about (1,0) → (1,0) (self rotation)", () => {
    const out = RotateBlock.compute(
      { shape: makePoint([1, 0]), center: makePoint([1, 0]) },
      { angle: Math.PI / 2 },
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(1, 8);
    expect(p[1]).toBeCloseTo(0, 8);
  });

  // --- Line ---
  test("rotate x-axis by 90° about origin → y-axis direction", () => {
    const l = makeLine({ point: [1, 0], direction: [1, 0] });
    const out = RotateBlock.compute(
      { shape: l, center: makePoint([0, 0]) },
      { angle: Math.PI / 2 },
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Line");
    const res = out.payload as LinePayload;
    expect(res.direction[0]).toBeCloseTo(0, 8);
    expect(res.direction[1]).toBeCloseTo(1, 8);
  });

  // --- Circle ---
  test("rotate circle: center rotates, radius unchanged", () => {
    const c = makeCircle([2, 0], 3);
    const out = RotateBlock.compute(
      { shape: c, center: makePoint([0, 0]) },
      { angle: Math.PI / 2 },
      ctx,
    ) as MathValue;
    const res = out.payload as CirclePayload;
    expect(res.center[0]).toBeCloseTo(0, 8);
    expect(res.center[1]).toBeCloseTo(2, 8);
    expect(res.radius).toBeCloseTo(3, 10);
  });

  // --- Polygon ---
  test("rotate unit square 90° about origin", () => {
    const poly = makePolygon([
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);
    const out = RotateBlock.compute(
      { shape: poly, center: makePoint([0, 0]) },
      { angle: Math.PI / 2 },
      ctx,
    ) as MathValue;
    const verts = out.payload as number[][];
    // (1,0) → (0,1)
    expect(verts[0]?.[0]).toBeCloseTo(0, 8);
    expect(verts[0]?.[1]).toBeCloseTo(1, 8);
    // (0,0) → (0,0)
    expect(verts[3]?.[0]).toBeCloseTo(0, 8);
    expect(verts[3]?.[1]).toBeCloseTo(0, 8);
  });

  // --- Property ---
  test("rotation preserves distance from center", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(0), max: Math.fround(2 * Math.PI), noNaN: true }),
        (px, py, theta) => {
          const cx = 0;
          const cy = 0;
          const dBefore = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
          const out = RotateBlock.compute(
            { shape: makePoint([px, py]), center: makePoint([cx, cy]) },
            { angle: theta },
            ctx,
          ) as MathValue;
          const p = out.payload as number[];
          const dAfter = Math.sqrt(((p[0] ?? 0) - cx) ** 2 + ((p[1] ?? 0) - cy) ** 2);
          expect(Math.abs(dBefore - dAfter)).toBeLessThan(1e-8);
        },
      ),
    );
  });

  test("rotate by 2π → same point", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        (px, py) => {
          const out = RotateBlock.compute(
            { shape: makePoint([px, py]), center: makePoint([0, 0]) },
            { angle: 2 * Math.PI },
            ctx,
          ) as MathValue;
          const p = out.payload as number[];
          expect(p[0]).toBeCloseTo(px, 8);
          expect(p[1]).toBeCloseTo(py, 8);
        },
      ),
    );
  });

  // --- Errors ---
  test("throws when shape is missing", () => {
    expect(() => RotateBlock.compute({ center: makePoint([0, 0]) }, { angle: 0 }, ctx)).toThrow();
  });

  test("throws when center is missing", () => {
    expect(() => RotateBlock.compute({ shape: makePoint([1, 0]) }, { angle: 0 }, ctx)).toThrow();
  });
});
