import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, PolygonPayload } from "~/math/types";
import { CentroidBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePolygon(vertices: number[][]): MathValue {
  return {
    type: { kind: "Polygon" },
    payload: vertices as PolygonPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.centroid", () => {
  test("id is geom.centroid", () => {
    expect(CentroidBlock.id).toBe("geom.centroid");
  });

  test("unit square: centroid = (0.5, 0.5)", () => {
    const out = CentroidBlock.compute(
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
    expect(out.type.kind).toBe("Point");
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(0.5, 10);
    expect(p[1]).toBeCloseTo(0.5, 10);
  });

  test("right triangle (0,0)-(2,0)-(0,2): centroid = (2/3, 2/3)", () => {
    const out = CentroidBlock.compute(
      {
        shape: makePolygon([
          [0, 0],
          [2, 0],
          [0, 2],
        ]),
      },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(2 / 3, 8);
    expect(p[1]).toBeCloseTo(2 / 3, 8);
  });

  test("centroid is average of vertices", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })), {
          minLength: 3,
          maxLength: 8,
        }),
        (pts) => {
          const n = pts.length;
          const cx = pts.reduce((s, p) => s + (p[0] ?? 0), 0) / n;
          const cy = pts.reduce((s, p) => s + (p[1] ?? 0), 0) / n;
          const out = CentroidBlock.compute({ shape: makePolygon(pts) }, {}, ctx) as MathValue;
          const res = out.payload as number[];
          expect(res[0]).toBeCloseTo(cx, 8);
          expect(res[1]).toBeCloseTo(cy, 8);
        },
      ),
    );
  });

  test("centroid is invariant to cyclic rotation of vertices", () => {
    const verts = [
      [0, 0],
      [4, 0],
      [4, 3],
      [0, 3],
    ];
    const first = verts[0] ?? [0, 0];
    const rotated = [...verts.slice(1), first];
    const c1 = (CentroidBlock.compute({ shape: makePolygon(verts) }, {}, ctx) as MathValue)
      .payload as number[];
    const c2 = (CentroidBlock.compute({ shape: makePolygon(rotated) }, {}, ctx) as MathValue)
      .payload as number[];
    expect(Math.abs((c1[0] ?? 0) - (c2[0] ?? 0))).toBeLessThan(1e-9);
    expect(Math.abs((c1[1] ?? 0) - (c2[1] ?? 0))).toBeLessThan(1e-9);
  });

  test("3D polygon: centroid has correct z-coordinate", () => {
    const out = CentroidBlock.compute(
      {
        shape: makePolygon([
          [0, 0, 0],
          [2, 0, 0],
          [2, 2, 0],
          [0, 2, 0],
        ]),
      },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(1, 10);
    expect(p[1]).toBeCloseTo(1, 10);
    expect(p[2]).toBeCloseTo(0, 10);
  });

  test("throws when shape is missing", () => {
    expect(() => CentroidBlock.compute({}, {}, ctx)).toThrow();
  });

  test("throws for wrong type (Circle)", () => {
    const circle: MathValue = {
      type: { kind: "Circle" },
      payload: { center: [0, 0], radius: 1 },
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(() => CentroidBlock.compute({ shape: circle }, {}, ctx)).toThrow();
  });
});
