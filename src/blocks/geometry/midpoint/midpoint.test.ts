import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, PointPayload } from "~/math/types";
import { MidpointBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.midpoint", () => {
  test("id is geom.midpoint", () => {
    expect(MidpointBlock.id).toBe("geom.midpoint");
  });

  test("midpoint of (0,0) and (2,0) is (1,0)", () => {
    const out = MidpointBlock.compute(
      { p1: makePoint([0, 0]), p2: makePoint([2, 0]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Point");
    const p = out.payload as PointPayload;
    expect(p[0]).toBeCloseTo(1, 10);
    expect(p[1]).toBeCloseTo(0, 10);
  });

  test("midpoint of (1,2) and (3,4) is (2,3)", () => {
    const out = MidpointBlock.compute(
      { p1: makePoint([1, 2]), p2: makePoint([3, 4]) },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as PointPayload;
    expect(p[0]).toBeCloseTo(2, 10);
    expect(p[1]).toBeCloseTo(3, 10);
  });

  test("midpoint of 3D points", () => {
    const out = MidpointBlock.compute(
      { p1: makePoint([0, 0, 0]), p2: makePoint([2, 4, 6]) },
      {},
      ctx,
    ) as MathValue;
    if (out.type.kind === "Point") expect(out.type.n).toBe(3);
    const p = out.payload as PointPayload;
    expect(p[0]).toBeCloseTo(1, 10);
    expect(p[1]).toBeCloseTo(2, 10);
    expect(p[2]).toBeCloseTo(3, 10);
  });

  test("throws for missing input", () => {
    expect(() => MidpointBlock.compute({ p1: makePoint([0, 0]) }, {}, ctx)).toThrow();
  });

  test("throws for dimension mismatch", () => {
    expect(() =>
      MidpointBlock.compute({ p1: makePoint([0, 0]), p2: makePoint([1, 2, 3]) }, {}, ctx),
    ).toThrow("dimension");
  });

  test("midpoint is equidistant from both endpoints (property)", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: -50, max: 50 }), fc.integer({ min: -50, max: 50 })),
        fc.tuple(fc.integer({ min: -50, max: 50 }), fc.integer({ min: -50, max: 50 })),
        ([ax, ay], [bx, by]) => {
          const out = MidpointBlock.compute(
            { p1: makePoint([ax, ay]), p2: makePoint([bx, by]) },
            {},
            ctx,
          ) as MathValue;
          const m = out.payload as PointPayload;
          const mx = m[0] ?? 0;
          const my = m[1] ?? 0;
          const d1 = Math.sqrt((mx - ax) ** 2 + (my - ay) ** 2);
          const d2 = Math.sqrt((mx - bx) ** 2 + (my - by) ** 2);
          expect(Math.abs(d1 - d2)).toBeLessThan(1e-9);
        },
      ),
    );
  });
});
