import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { AngleBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.angle", () => {
  test("id is geom.angle", () => {
    expect(AngleBlock.id).toBe("geom.angle");
  });

  test("three-point angle: right angle at origin between (1,0) and (0,1)", () => {
    // Angle at B where A=(1,0), B=(0,0), C=(0,1)
    const out = AngleBlock.compute(
      { a: makePoint([1, 0]), b: makePoint([0, 0]), c: makePoint([0, 1]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Scalar");
    expect(out.payload as number).toBeCloseTo(Math.PI / 2, 8);
  });

  test("three-point angle: 60° at (0,0) between (1,0) and (0.5,√3/2)", () => {
    const out = AngleBlock.compute(
      {
        a: makePoint([1, 0]),
        b: makePoint([0, 0]),
        c: makePoint([0.5, Math.sqrt(3) / 2]),
      },
      {},
      ctx,
    ) as MathValue;
    expect(out.payload as number).toBeCloseTo(Math.PI / 3, 8);
  });

  test("angle is non-negative (property)", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })),
        fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })),
        fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })),
        ([ax, ay], [bx, by], [cx, cy]) => {
          const d1 = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
          const d2 = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2);
          if (d1 < 1 || d2 < 1) return;
          const out = AngleBlock.compute(
            { a: makePoint([ax, ay]), b: makePoint([bx, by]), c: makePoint([cx, cy]) },
            {},
            ctx,
          ) as MathValue;
          const theta = out.payload as number;
          expect(theta).toBeGreaterThanOrEqual(0);
          expect(theta).toBeLessThanOrEqual(Math.PI + 1e-9);
        },
      ),
    );
  });

  test("angle is symmetric: angle(A,B,C) = angle(C,B,A)", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })),
        fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })),
        fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })),
        ([ax, ay], [bx, by], [cx, cy]) => {
          const d1 = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
          const d2 = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2);
          if (d1 < 1 || d2 < 1) return;
          const t1 = (
            AngleBlock.compute(
              { a: makePoint([ax, ay]), b: makePoint([bx, by]), c: makePoint([cx, cy]) },
              {},
              ctx,
            ) as MathValue
          ).payload as number;
          const t2 = (
            AngleBlock.compute(
              { a: makePoint([cx, cy]), b: makePoint([bx, by]), c: makePoint([ax, ay]) },
              {},
              ctx,
            ) as MathValue
          ).payload as number;
          expect(Math.abs(t1 - t2)).toBeLessThan(1e-9);
        },
      ),
    );
  });

  test("throws for missing vertex (b)", () => {
    expect(() =>
      AngleBlock.compute({ a: makePoint([1, 0]), c: makePoint([0, 1]) }, {}, ctx),
    ).toThrow();
  });

  test("throws when arm is zero-length", () => {
    expect(() =>
      AngleBlock.compute(
        { a: makePoint([0, 0]), b: makePoint([0, 0]), c: makePoint([1, 0]) },
        {},
        ctx,
      ),
    ).toThrow();
  });
});
