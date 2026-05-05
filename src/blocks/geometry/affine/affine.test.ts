import { describe, expect, test } from "vitest";
import type { MathValue, MatrixPayload, PolygonPayload } from "~/math/types";
import { AffineBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeMatrix(data: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: data.length, n: (data[0] ?? []).length, field: "real" },
    payload: data as MatrixPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeVector(coords: number[]): MathValue {
  return {
    type: { kind: "Vector", n: coords.length, field: "real" },
    payload: coords,
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

// Identity matrix 2×2
const I2 = makeMatrix([
  [1, 0],
  [0, 1],
]);
// 90° rotation matrix
const R90 = makeMatrix([
  [0, -1],
  [1, 0],
]);
// 2× scale matrix
const S2 = makeMatrix([
  [2, 0],
  [0, 2],
]);

describe("geom.affine", () => {
  test("id is geom.affine", () => {
    expect(AffineBlock.id).toBe("geom.affine");
  });

  // --- Point ---
  test("identity matrix + no translation → same point", () => {
    const out = AffineBlock.compute({ shape: makePoint([3, 4]), matrix: I2 }, {}, ctx) as MathValue;
    expect(out.type.kind).toBe("Point");
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(3, 8);
    expect(p[1]).toBeCloseTo(4, 8);
  });

  test("90° rotation matrix applied to (1,0) → (0,1)", () => {
    const out = AffineBlock.compute(
      { shape: makePoint([1, 0]), matrix: R90 },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(0, 8);
    expect(p[1]).toBeCloseTo(1, 8);
  });

  test("scale matrix 2× applied to (1,2) → (2,4)", () => {
    const out = AffineBlock.compute({ shape: makePoint([1, 2]), matrix: S2 }, {}, ctx) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(2, 8);
    expect(p[1]).toBeCloseTo(4, 8);
  });

  test("identity + translation (3,4) → shifted point", () => {
    const out = AffineBlock.compute(
      { shape: makePoint([1, 1]), matrix: I2, translation: makeVector([3, 4]) },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(4, 8);
    expect(p[1]).toBeCloseTo(5, 8);
  });

  test("rotation + translation: rotate (1,0) 90° then translate (1,0) → (1,1)", () => {
    const out = AffineBlock.compute(
      { shape: makePoint([1, 0]), matrix: R90, translation: makeVector([1, 0]) },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(1, 8);
    expect(p[1]).toBeCloseTo(1, 8);
  });

  // --- Polygon ---
  test("scale polygon: all vertices scaled by 2×", () => {
    const poly = makePolygon([
      [1, 0],
      [0, 1],
      [-1, 0],
    ]);
    const out = AffineBlock.compute({ shape: poly, matrix: S2 }, {}, ctx) as MathValue;
    const verts = out.payload as number[][];
    expect(verts[0]?.[0]).toBeCloseTo(2, 8);
    expect(verts[1]?.[1]).toBeCloseTo(2, 8);
    expect(verts[2]?.[0]).toBeCloseTo(-2, 8);
  });

  // --- Errors ---
  test("throws when shape is missing", () => {
    expect(() => AffineBlock.compute({ matrix: I2 }, {}, ctx)).toThrow();
  });

  test("throws when matrix is missing", () => {
    expect(() => AffineBlock.compute({ shape: makePoint([1, 0]) }, {}, ctx)).toThrow();
  });
});
