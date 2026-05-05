import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue } from "~/math/types";
import { AngleBisectorBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.angle-bisector", () => {
  test("id is geom.angle-bisector", () => {
    expect(AngleBisectorBlock.id).toBe("geom.angle-bisector");
  });

  test("angle bisector at origin for (1,0) and (0,1): direction is (1,1)/√2", () => {
    // Rays from origin toward (1,0) and (0,1)
    const out = AngleBisectorBlock.compute(
      { vertex: makePoint([0, 0]), p1: makePoint([1, 0]), p2: makePoint([0, 1]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Line");
    const line = out.payload as LinePayload;
    // Direction should be (1,1)/√2 or (-1,-1)/√2
    const dx = Math.abs(line.direction[0] ?? 0);
    const dy = Math.abs(line.direction[1] ?? 0);
    expect(dx).toBeCloseTo(Math.SQRT1_2, 8);
    expect(dy).toBeCloseTo(Math.SQRT1_2, 8);
  });

  test("angle bisector passes through the vertex", () => {
    const out = AngleBisectorBlock.compute(
      { vertex: makePoint([2, 3]), p1: makePoint([5, 3]), p2: makePoint([2, 7]) },
      {},
      ctx,
    ) as MathValue;
    const line = out.payload as LinePayload;
    // Vertex (2,3) must be on the line: check implicit equation
    if (line.implicit !== undefined) {
      const { a, b, c } = line.implicit;
      expect(Math.abs(a * 2 + b * 3 + c)).toBeLessThan(1e-9);
    } else {
      // Check that vertex = point + t * direction for some t (cross product = 0)
      const vx = 2 - (line.point[0] ?? 0);
      const vy = 3 - (line.point[1] ?? 0);
      const cross = vx * (line.direction[1] ?? 0) - vy * (line.direction[0] ?? 0);
      expect(Math.abs(cross)).toBeLessThan(1e-9);
    }
  });

  test("bisector direction is unit length", () => {
    const out = AngleBisectorBlock.compute(
      { vertex: makePoint([0, 0]), p1: makePoint([3, 0]), p2: makePoint([0, 4]) },
      {},
      ctx,
    ) as MathValue;
    const line = out.payload as LinePayload;
    const mag = Math.sqrt(line.direction.reduce((s, c) => s + c * c, 0));
    expect(mag).toBeCloseTo(1, 10);
  });

  test("bisector makes equal angles with both arms (property)", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })),
        fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })),
        fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })),
        ([vx, vy], [p1x, p1y], [p2x, p2y]) => {
          const d1 = Math.sqrt((p1x - vx) ** 2 + (p1y - vy) ** 2);
          const d2 = Math.sqrt((p2x - vx) ** 2 + (p2y - vy) ** 2);
          if (d1 < 1 || d2 < 1) return;
          const out = AngleBisectorBlock.compute(
            {
              vertex: makePoint([vx, vy]),
              p1: makePoint([p1x, p1y]),
              p2: makePoint([p2x, p2y]),
            },
            {},
            ctx,
          ) as MathValue;
          const line = out.payload as LinePayload;
          const bx = line.direction[0] ?? 0;
          const by = line.direction[1] ?? 0;
          // Unit vectors of both arms
          const u1x = (p1x - vx) / d1;
          const u1y = (p1y - vy) / d1;
          const u2x = (p2x - vx) / d2;
          const u2y = (p2y - vy) / d2;
          // Angle with bisector direction: |cos θ₁| should equal |cos θ₂|
          const cos1 = Math.abs(bx * u1x + by * u1y);
          const cos2 = Math.abs(bx * u2x + by * u2y);
          expect(Math.abs(cos1 - cos2)).toBeLessThan(1e-8);
        },
      ),
    );
  });

  test("throws for missing input", () => {
    expect(() =>
      AngleBisectorBlock.compute({ vertex: makePoint([0, 0]), p1: makePoint([1, 0]) }, {}, ctx),
    ).toThrow();
  });

  test("throws when arm is zero-length (vertex = p1)", () => {
    expect(() =>
      AngleBisectorBlock.compute(
        { vertex: makePoint([0, 0]), p1: makePoint([0, 0]), p2: makePoint([1, 0]) },
        {},
        ctx,
      ),
    ).toThrow();
  });
});
