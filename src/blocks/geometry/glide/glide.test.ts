import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue, PolygonPayload } from "~/math/types";
import { GlideBlock } from "./definition";

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

function makePolygon(vertices: number[][]): MathValue {
  return {
    type: { kind: "Polygon" },
    payload: vertices as PolygonPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

// Glide reflection: translate along x-axis by (2,0), then reflect across x-axis
// Net effect on (px, py): first translate → (px+2, py), then reflect y → (px+2, -py)
const xAxis = makeLine({ point: [0, 0], direction: [1, 0] });

describe("geom.glide", () => {
  test("id is geom.glide", () => {
    expect(GlideBlock.id).toBe("geom.glide");
  });

  test("glide (0,1) along x-axis by 2 → (2,-1)", () => {
    const out = GlideBlock.compute(
      { shape: makePoint([0, 1]), line: xAxis },
      { dx: 2, dy: 0 },
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Point");
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(2, 8);
    expect(p[1]).toBeCloseTo(-1, 8);
  });

  test("glide with zero translation = simple reflection", () => {
    const out = GlideBlock.compute(
      { shape: makePoint([3, 4]), line: xAxis },
      { dx: 0, dy: 0 },
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(3, 8);
    expect(p[1]).toBeCloseTo(-4, 8);
  });

  test("glide polygon: all vertices transformed", () => {
    const poly = makePolygon([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);
    const out = GlideBlock.compute(
      { shape: poly, line: xAxis },
      { dx: 3, dy: 0 },
      ctx,
    ) as MathValue;
    const verts = out.payload as number[][];
    // (0,0) → translate(3,0) → (3,0) → reflect y=0 → (3,0)
    expect(verts[0]?.[0]).toBeCloseTo(3, 8);
    expect(verts[0]?.[1]).toBeCloseTo(0, 8);
    // (1,1) → (4,1) → (4,-1)
    expect(verts[2]?.[0]).toBeCloseTo(4, 8);
    expect(verts[2]?.[1]).toBeCloseTo(-1, 8);
  });

  test("throws when shape is missing", () => {
    expect(() => GlideBlock.compute({ line: xAxis }, { dx: 1, dy: 0 }, ctx)).toThrow();
  });

  test("throws when line is missing", () => {
    expect(() => GlideBlock.compute({ shape: makePoint([0, 0]) }, { dx: 1, dy: 0 }, ctx)).toThrow();
  });
});
