import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { IsCollinearBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.is-collinear?", () => {
  test("id is geom.is-collinear?", () => {
    expect(IsCollinearBlock.id).toBe("geom.is-collinear?");
  });

  test("three points on x-axis are collinear", () => {
    const out = IsCollinearBlock.compute(
      { a: makePoint([0, 0]), b: makePoint([1, 0]), c: makePoint([3, 0]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Scalar");
    expect(out.payload).toBe(true);
  });

  test("right-angle triangle vertices are not collinear", () => {
    const out = IsCollinearBlock.compute(
      { a: makePoint([0, 0]), b: makePoint([1, 0]), c: makePoint([0, 1]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.payload).toBe(false);
  });

  test("coincident points count as collinear", () => {
    const out = IsCollinearBlock.compute(
      { a: makePoint([2, 3]), b: makePoint([2, 3]), c: makePoint([2, 3]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.payload).toBe(true);
  });

  test("collinearity is symmetric: permuting ABC doesn't change result", () => {
    const a = makePoint([1, 2]);
    const b = makePoint([2, 4]);
    const c = makePoint([3, 6]);
    const r1 = (IsCollinearBlock.compute({ a, b, c }, {}, ctx) as MathValue).payload;
    const r2 = (IsCollinearBlock.compute({ a: c, b: a, c: b }, {}, ctx) as MathValue).payload;
    expect(r1).toBe(r2);
  });

  test("points on y=x are collinear", () => {
    const out = IsCollinearBlock.compute(
      { a: makePoint([-1, -1]), b: makePoint([0, 0]), c: makePoint([5, 5]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.payload).toBe(true);
  });

  test("property: any three points on a line through origin are collinear", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -20, max: 20 }),
        (t1, t2, t3) => {
          // Points t*(1,2) for t = t1, t2, t3 are collinear
          const a = makePoint([t1, 2 * t1]);
          const b = makePoint([t2, 2 * t2]);
          const c = makePoint([t3, 2 * t3]);
          const out = (IsCollinearBlock.compute({ a, b, c }, {}, ctx) as MathValue)
            .payload as boolean;
          expect(out).toBe(true);
        },
      ),
    );
  });

  test("throws when a point is missing", () => {
    expect(() =>
      IsCollinearBlock.compute({ a: makePoint([0, 0]), b: makePoint([1, 0]) }, {}, ctx),
    ).toThrow();
  });
});
