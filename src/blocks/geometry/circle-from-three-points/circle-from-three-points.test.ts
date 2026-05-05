import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { CirclePayload, MathValue } from "~/math/types";
import { CircleFromThreePointsBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.circle-from-three-points", () => {
  test("id is geom.circle-from-three-points", () => {
    expect(CircleFromThreePointsBlock.id).toBe("geom.circle-from-three-points");
  });

  test("unit circle: (1,0), (0,1), (-1,0) → center≈(0,0), radius≈1", () => {
    const out = CircleFromThreePointsBlock.compute(
      { p1: makePoint([1, 0]), p2: makePoint([0, 1]), p3: makePoint([-1, 0]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Circle");
    const circle = out.payload as CirclePayload;
    expect(circle.radius).toBeCloseTo(1, 8);
    expect(circle.center[0] ?? 0).toBeCloseTo(0, 8);
    expect(circle.center[1] ?? 0).toBeCloseTo(0, 8);
  });

  test("known circumcircle: (0,0), (4,0), (0,3) → center (2, 1.5)", () => {
    const out = CircleFromThreePointsBlock.compute(
      { p1: makePoint([0, 0]), p2: makePoint([4, 0]), p3: makePoint([0, 3]) },
      {},
      ctx,
    ) as MathValue;
    const circle = out.payload as CirclePayload;
    expect(circle.center[0] ?? 0).toBeCloseTo(2, 8);
    expect(circle.center[1] ?? 0).toBeCloseTo(1.5, 8);
    expect(circle.radius).toBeCloseTo(Math.sqrt(4 + 2.25), 8);
  });

  test("all three points lie on the circumcircle", () => {
    const pt1 = [1, 3];
    const pt2 = [4, 1];
    const pt3 = [-2, 2];
    const pts = [pt1, pt2, pt3];
    const out = CircleFromThreePointsBlock.compute(
      { p1: makePoint(pt1), p2: makePoint(pt2), p3: makePoint(pt3) },
      {},
      ctx,
    ) as MathValue;
    const circle = out.payload as CirclePayload;
    const cx = circle.center[0] ?? 0;
    const cy = circle.center[1] ?? 0;
    for (const [px, py] of pts) {
      const dx = (px ?? 0) - cx;
      const dy = (py ?? 0) - cy;
      expect(Math.sqrt(dx * dx + dy * dy)).toBeCloseTo(circle.radius, 8);
    }
  });

  test("throws for collinear points", () => {
    expect(() =>
      CircleFromThreePointsBlock.compute(
        { p1: makePoint([0, 0]), p2: makePoint([1, 1]), p3: makePoint([2, 2]) },
        {},
        ctx,
      ),
    ).toThrow();
  });

  test("throws for missing input", () => {
    expect(() =>
      CircleFromThreePointsBlock.compute({ p1: makePoint([0, 0]), p2: makePoint([1, 0]) }, {}, ctx),
    ).toThrow();
  });

  test("throws for non-2D points", () => {
    expect(() =>
      CircleFromThreePointsBlock.compute(
        {
          p1: makePoint([0, 0, 0]),
          p2: makePoint([1, 0, 0]),
          p3: makePoint([0, 1, 0]),
        },
        {},
        ctx,
      ),
    ).toThrow("2D");
  });

  test("all three input points lie on the circumcircle (property)", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: -30, max: 30 }), fc.integer({ min: -30, max: 30 })),
        fc.tuple(fc.integer({ min: -30, max: 30 }), fc.integer({ min: -30, max: 30 })),
        fc.tuple(fc.integer({ min: -30, max: 30 }), fc.integer({ min: -30, max: 30 })),
        ([ax, ay], [bx, by], [cx, cy]) => {
          // Skip collinear or duplicate points
          const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
          if (Math.abs(cross) < 1) return;
          const out = CircleFromThreePointsBlock.compute(
            { p1: makePoint([ax, ay]), p2: makePoint([bx, by]), p3: makePoint([cx, cy]) },
            {},
            ctx,
          ) as MathValue;
          const circle = out.payload as CirclePayload;
          const ccx = circle.center[0] ?? 0;
          const ccy = circle.center[1] ?? 0;
          for (const [px, py] of [
            [ax, ay],
            [bx, by],
            [cx, cy],
          ]) {
            const dx = (px ?? 0) - ccx;
            const dy = (py ?? 0) - ccy;
            expect(Math.abs(Math.sqrt(dx * dx + dy * dy) - circle.radius)).toBeLessThan(1e-8);
          }
        },
      ),
    );
  });
});
