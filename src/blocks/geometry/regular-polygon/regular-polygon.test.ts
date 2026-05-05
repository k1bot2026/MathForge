import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, PolygonPayload } from "~/math/types";
import { RegularPolygonBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.regular-polygon", () => {
  test("id is geom.regular-polygon", () => {
    expect(RegularPolygonBlock.id).toBe("geom.regular-polygon");
  });

  test("equilateral triangle (n=3) has 3 vertices", () => {
    const out = RegularPolygonBlock.compute(
      { center: makePoint([0, 0]) },
      { n: "3", radius: "1" },
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Polygon");
    const poly = out.payload as PolygonPayload;
    expect(poly.length).toBe(3);
  });

  test("square (n=4, r=1): all vertices at distance 1 from origin", () => {
    const out = RegularPolygonBlock.compute(
      { center: makePoint([0, 0]) },
      { n: "4", radius: "1" },
      ctx,
    ) as MathValue;
    const poly = out.payload as PolygonPayload;
    for (const v of poly) {
      const x = v[0] ?? 0;
      const y = v[1] ?? 0;
      expect(Math.sqrt(x * x + y * y)).toBeCloseTo(1, 8);
    }
  });

  test("hexagon (n=6): vertices are equidistant from center", () => {
    const cx = 3,
      cy = -2;
    const r = 5;
    const out = RegularPolygonBlock.compute(
      { center: makePoint([cx, cy]) },
      { n: "6", radius: r.toString() },
      ctx,
    ) as MathValue;
    const poly = out.payload as PolygonPayload;
    expect(poly.length).toBe(6);
    for (const v of poly) {
      const dx = (v[0] ?? 0) - cx;
      const dy = (v[1] ?? 0) - cy;
      expect(Math.sqrt(dx * dx + dy * dy)).toBeCloseTo(r, 8);
    }
  });

  test("all side lengths are equal (regular polygon property)", () => {
    const out = RegularPolygonBlock.compute(
      { center: makePoint([0, 0]) },
      { n: "5", radius: "2" },
      ctx,
    ) as MathValue;
    const poly = out.payload as PolygonPayload;
    const n = poly.length;
    const sideLen0 = (() => {
      const v0 = poly[0] ?? [0, 0];
      const v1 = poly[1] ?? [0, 0];
      const dx = (v1[0] ?? 0) - (v0[0] ?? 0);
      const dy = (v1[1] ?? 0) - (v0[1] ?? 0);
      return Math.sqrt(dx * dx + dy * dy);
    })();
    for (let i = 1; i < n; i++) {
      const va = poly[i] ?? [0, 0];
      const vb = poly[(i + 1) % n] ?? [0, 0];
      const dx = (vb[0] ?? 0) - (va[0] ?? 0);
      const dy = (vb[1] ?? 0) - (va[1] ?? 0);
      expect(Math.sqrt(dx * dx + dy * dy)).toBeCloseTo(sideLen0, 8);
    }
  });

  test("throws for n < 3", () => {
    expect(() =>
      RegularPolygonBlock.compute({ center: makePoint([0, 0]) }, { n: "2", radius: "1" }, ctx),
    ).toThrow();
  });

  test("throws for non-positive radius", () => {
    expect(() =>
      RegularPolygonBlock.compute({ center: makePoint([0, 0]) }, { n: "4", radius: "0" }, ctx),
    ).toThrow();
  });

  test("throws for non-2D center", () => {
    expect(() =>
      RegularPolygonBlock.compute({ center: makePoint([0, 0, 0]) }, { n: "4", radius: "1" }, ctx),
    ).toThrow("2D");
  });

  test("all vertices equidistant from center (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 12 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: Math.fround(0.1), max: 100 }),
        fc.integer({ min: -50, max: 50 }),
        fc.integer({ min: -50, max: 50 }),
        (n, r, ocx, ocy) => {
          const out = RegularPolygonBlock.compute(
            { center: makePoint([ocx, ocy]) },
            { n: n.toString(), radius: r.toString() },
            ctx,
          ) as MathValue;
          const poly = out.payload as PolygonPayload;
          expect(poly.length).toBe(n);
          for (const v of poly) {
            const dx = (v[0] ?? 0) - ocx;
            const dy = (v[1] ?? 0) - ocy;
            expect(Math.abs(Math.sqrt(dx * dx + dy * dy) - r)).toBeLessThan(1e-8);
          }
        },
      ),
    );
  });
});
