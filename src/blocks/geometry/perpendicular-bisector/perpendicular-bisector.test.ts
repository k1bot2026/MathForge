import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue } from "~/math/types";
import { PerpendicularBisectorBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.perpendicular-bisector", () => {
  test("id is geom.perpendicular-bisector", () => {
    expect(PerpendicularBisectorBlock.id).toBe("geom.perpendicular-bisector");
  });

  test("perp bisector of (0,0)-(2,0): passes through (1,0), direction (0,1)", () => {
    const out = PerpendicularBisectorBlock.compute(
      { p1: makePoint([0, 0]), p2: makePoint([2, 0]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Line");
    const line = out.payload as LinePayload;
    // Midpoint (1,0) must be on the line
    const px = line.point[0] ?? 0;
    const py = line.point[1] ?? 0;
    expect(px).toBeCloseTo(1, 10);
    expect(py).toBeCloseTo(0, 10);
    // Direction should be perpendicular to (1,0) → (0,±1)
    expect(Math.abs(line.direction[0] ?? 0)).toBeCloseTo(0, 10);
    expect(Math.abs(line.direction[1] ?? 0)).toBeCloseTo(1, 10);
  });

  test("perp bisector of (0,0)-(0,2): passes through (0,1), direction (1,0)", () => {
    const out = PerpendicularBisectorBlock.compute(
      { p1: makePoint([0, 0]), p2: makePoint([0, 2]) },
      {},
      ctx,
    ) as MathValue;
    const line = out.payload as LinePayload;
    expect(line.point[0] ?? 0).toBeCloseTo(0, 10);
    expect(line.point[1] ?? 0).toBeCloseTo(1, 10);
    expect(Math.abs(line.direction[0] ?? 0)).toBeCloseTo(1, 10);
    expect(Math.abs(line.direction[1] ?? 0)).toBeCloseTo(0, 10);
  });

  test("midpoint lies on the perpendicular bisector (property)", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: -50, max: 50 }), fc.integer({ min: -50, max: 50 })),
        fc.tuple(fc.integer({ min: -50, max: 50 }), fc.integer({ min: -50, max: 50 })),
        ([ax, ay], [bx, by]) => {
          const dx = bx - ax;
          const dy = by - ay;
          if (Math.sqrt(dx * dx + dy * dy) < 1) return;
          const out = PerpendicularBisectorBlock.compute(
            { p1: makePoint([ax, ay]), p2: makePoint([bx, by]) },
            {},
            ctx,
          ) as MathValue;
          const line = out.payload as LinePayload;
          // Midpoint must be on line
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          const px = line.point[0] ?? 0;
          const py = line.point[1] ?? 0;
          const dx2 = mx - px;
          const dy2 = my - py;
          // Point on line: (mx,my) = point + t*direction for some t
          // Equivalently: cross product = 0
          const dirx = line.direction[0] ?? 0;
          const diry = line.direction[1] ?? 0;
          const cross = dx2 * diry - dy2 * dirx;
          expect(Math.abs(cross)).toBeLessThan(1e-8);
        },
      ),
    );
  });

  test("direction is perpendicular to segment (property)", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: -50, max: 50 }), fc.integer({ min: -50, max: 50 })),
        fc.tuple(fc.integer({ min: -50, max: 50 }), fc.integer({ min: -50, max: 50 })),
        ([ax, ay], [bx, by]) => {
          const sdx = bx - ax;
          const sdy = by - ay;
          const segLen = Math.sqrt(sdx * sdx + sdy * sdy);
          if (segLen < 1) return;
          const out = PerpendicularBisectorBlock.compute(
            { p1: makePoint([ax, ay]), p2: makePoint([bx, by]) },
            {},
            ctx,
          ) as MathValue;
          const line = out.payload as LinePayload;
          // Dot product of direction with segment direction = 0
          const dirx = line.direction[0] ?? 0;
          const diry = line.direction[1] ?? 0;
          const dot = dirx * (sdx / segLen) + diry * (sdy / segLen);
          expect(Math.abs(dot)).toBeLessThan(1e-9);
        },
      ),
    );
  });

  test("throws for identical points", () => {
    expect(() =>
      PerpendicularBisectorBlock.compute({ p1: makePoint([1, 2]), p2: makePoint([1, 2]) }, {}, ctx),
    ).toThrow();
  });

  test("throws for dimension mismatch", () => {
    expect(() =>
      PerpendicularBisectorBlock.compute(
        { p1: makePoint([0, 0]), p2: makePoint([1, 2, 3]) },
        {},
        ctx,
      ),
    ).toThrow("dimension");
  });

  test("throws for 3D points (only 2D supported)", () => {
    expect(() =>
      PerpendicularBisectorBlock.compute(
        { p1: makePoint([0, 0, 0]), p2: makePoint([1, 0, 0]) },
        {},
        ctx,
      ),
    ).toThrow("2D");
  });
});
