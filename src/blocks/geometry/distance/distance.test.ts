import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue } from "~/math/types";
import { DistanceBlock } from "./definition";

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

describe("geom.distance", () => {
  test("id is geom.distance", () => {
    expect(DistanceBlock.id).toBe("geom.distance");
  });

  test("point-point: d((0,0), (3,4)) = 5", () => {
    const out = DistanceBlock.compute(
      { a: makePoint([0, 0]), b: makePoint([3, 4]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Scalar");
    expect(out.payload as number).toBeCloseTo(5, 10);
  });

  test("point-point: d(P, P) = 0", () => {
    const out = DistanceBlock.compute(
      { a: makePoint([5, 7]), b: makePoint([5, 7]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.payload as number).toBeCloseTo(0, 10);
  });

  test("point-point: symmetric d(A,B) = d(B,A)", () => {
    const a = makePoint([1, 2]);
    const b = makePoint([4, 6]);
    const d1 = (DistanceBlock.compute({ a, b }, {}, ctx) as MathValue).payload as number;
    const d2 = (DistanceBlock.compute({ a: b, b: a }, {}, ctx) as MathValue).payload as number;
    expect(d1).toBeCloseTo(d2, 10);
  });

  test("point-line: distance from (0,0) to line x=1 (1,0,0;a=1,b=0,c=-1) = 1", () => {
    // Line: x - 1 = 0, i.e. a=1,b=0,c=-1 normalised
    const line = makeLine({
      point: [1, 0],
      direction: [0, 1],
      implicit: { a: 1, b: 0, c: -1 },
    });
    const out = DistanceBlock.compute({ a: makePoint([0, 0]), b: line }, {}, ctx) as MathValue;
    expect(out.payload as number).toBeCloseTo(1, 10);
  });

  test("point-line: point on line has distance 0", () => {
    // Line y=0: a=0,b=1,c=0; any point (x,0) is on it
    const line = makeLine({
      point: [0, 0],
      direction: [1, 0],
      implicit: { a: 0, b: 1, c: 0 },
    });
    const out = DistanceBlock.compute({ a: makePoint([5, 0]), b: line }, {}, ctx) as MathValue;
    expect(Math.abs(out.payload as number)).toBeLessThan(1e-10);
  });

  test("3D point-point: d((0,0,0), (1,1,1)) = √3", () => {
    const out = DistanceBlock.compute(
      { a: makePoint([0, 0, 0]), b: makePoint([1, 1, 1]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.payload as number).toBeCloseTo(Math.sqrt(3), 10);
  });

  test("throws for missing input", () => {
    expect(() => DistanceBlock.compute({ a: makePoint([0, 0]) }, {}, ctx)).toThrow();
  });

  test("throws for type mismatch (Line-Line not yet supported)", () => {
    const line = makeLine({ point: [0, 0], direction: [1, 0] });
    expect(() => DistanceBlock.compute({ a: line, b: line }, {}, ctx)).toThrow();
  });

  test("point-point distance is non-negative and symmetric (property)", () => {
    fc.assert(
      fc.property(
        fc.tuple(fc.integer({ min: -100, max: 100 }), fc.integer({ min: -100, max: 100 })),
        fc.tuple(fc.integer({ min: -100, max: 100 }), fc.integer({ min: -100, max: 100 })),
        ([ax, ay], [bx, by]) => {
          const a = makePoint([ax, ay]);
          const b = makePoint([bx, by]);
          const d1 = (DistanceBlock.compute({ a, b }, {}, ctx) as MathValue).payload as number;
          const d2 = (DistanceBlock.compute({ a: b, b: a }, {}, ctx) as MathValue)
            .payload as number;
          expect(d1).toBeGreaterThanOrEqual(0);
          expect(Math.abs(d1 - d2)).toBeLessThan(1e-10);
        },
      ),
    );
  });
});
