import { describe, expect, test } from "vitest";
import type { CirclePayload, LinePayload, MathValue, PolygonPayload } from "~/math/types";
import { TranslateBlock } from "./definition";

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

function makeVector(coords: number[]): MathValue {
  return {
    type: { kind: "Vector", n: coords.length, field: "real" },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.translate", () => {
  test("id is geom.translate", () => {
    expect(TranslateBlock.id).toBe("geom.translate");
  });

  // --- Point ---
  test("translate point (1,2) by (3,4) → (4,6)", () => {
    const out = TranslateBlock.compute(
      { shape: makePoint([1, 2]), vector: makeVector([3, 4]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Point");
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(4, 10);
    expect(p[1]).toBeCloseTo(6, 10);
  });

  test("translate point by zero vector → same point", () => {
    const out = TranslateBlock.compute(
      { shape: makePoint([5, -3]), vector: makeVector([0, 0]) },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(5, 10);
    expect(p[1]).toBeCloseTo(-3, 10);
  });

  // --- Line ---
  test("translate line: anchor point shifts, direction unchanged", () => {
    const l = makeLine({ point: [0, 0], direction: [1, 0] });
    const out = TranslateBlock.compute(
      { shape: l, vector: makeVector([2, 3]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Line");
    const res = out.payload as LinePayload;
    expect(res.point[0]).toBeCloseTo(2, 10);
    expect(res.point[1]).toBeCloseTo(3, 10);
    expect(res.direction[0]).toBeCloseTo(1, 10);
    expect(res.direction[1]).toBeCloseTo(0, 10);
  });

  // --- Circle ---
  test("translate circle: center shifts, radius unchanged", () => {
    const c = makeCircle([1, 1], 5);
    const out = TranslateBlock.compute(
      { shape: c, vector: makeVector([-1, 2]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Circle");
    const res = out.payload as CirclePayload;
    expect(res.center[0]).toBeCloseTo(0, 10);
    expect(res.center[1]).toBeCloseTo(3, 10);
    expect(res.radius).toBeCloseTo(5, 10);
  });

  // --- Polygon ---
  test("translate polygon: all vertices shift by vector", () => {
    const poly = makePolygon([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    const out = TranslateBlock.compute(
      { shape: poly, vector: makeVector([2, 3]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Polygon");
    const verts = out.payload as number[][];
    expect(verts[0]?.[0]).toBeCloseTo(2, 10);
    expect(verts[0]?.[1]).toBeCloseTo(3, 10);
    expect(verts[2]?.[0]).toBeCloseTo(3, 10);
    expect(verts[2]?.[1]).toBeCloseTo(4, 10);
  });

  // --- Errors ---
  test("throws when shape is missing", () => {
    expect(() => TranslateBlock.compute({ vector: makeVector([1, 0]) }, {}, ctx)).toThrow();
  });

  test("throws when vector is missing", () => {
    expect(() => TranslateBlock.compute({ shape: makePoint([0, 0]) }, {}, ctx)).toThrow();
  });

  test("throws for unsupported shape type (Conic)", () => {
    const conic: MathValue = {
      type: { kind: "Conic" },
      payload: { A: 1, B: 0, C: 1, D: 0, E: 0, F: -1 },
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(() =>
      TranslateBlock.compute({ shape: conic, vector: makeVector([1, 0]) }, {}, ctx),
    ).toThrow();
  });
});
