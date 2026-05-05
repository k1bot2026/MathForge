import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue, PointPayload } from "~/math/types";
import { LineFromPointsBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.line-from-points", () => {
  test("id is geom.line-from-points", () => {
    expect(LineFromPointsBlock.id).toBe("geom.line-from-points");
  });

  test("2D line from (0,0) to (1,0): direction is (1,0)", () => {
    const out = LineFromPointsBlock.compute(
      { p1: makePoint([0, 0]), p2: makePoint([1, 0]) },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Line");
    if (out.type.kind === "Line") expect(out.type.n).toBe(2);
    const line = out.payload as LinePayload;
    expect(line.direction[0]).toBeCloseTo(1, 10);
    expect(line.direction[1]).toBeCloseTo(0, 10);
  });

  test("2D line has implicit form cached", () => {
    const out = LineFromPointsBlock.compute(
      { p1: makePoint([0, 0]), p2: makePoint([0, 1]) },
      {},
      ctx,
    ) as MathValue;
    const line = out.payload as LinePayload;
    expect(line.implicit).toBeDefined();
  });

  test("3D line from (0,0,0) to (1,1,1): direction normalised", () => {
    const out = LineFromPointsBlock.compute(
      { p1: makePoint([0, 0, 0]), p2: makePoint([1, 1, 1]) },
      {},
      ctx,
    ) as MathValue;
    const line = out.payload as LinePayload;
    const mag = Math.sqrt(line.direction.reduce((s, c) => s + c * c, 0));
    expect(mag).toBeCloseTo(1, 10);
    if (out.type.kind === "Line") expect(out.type.n).toBe(3);
  });

  test("throws for identical points", () => {
    expect(() =>
      LineFromPointsBlock.compute({ p1: makePoint([1, 2]), p2: makePoint([1, 2]) }, {}, ctx),
    ).toThrow();
  });

  test("throws for dimension mismatch", () => {
    expect(() =>
      LineFromPointsBlock.compute({ p1: makePoint([0, 0]), p2: makePoint([1, 0, 0]) }, {}, ctx),
    ).toThrow("dimension");
  });

  test("throws for 1D points", () => {
    expect(() =>
      LineFromPointsBlock.compute({ p1: makePoint([0]), p2: makePoint([1]) }, {}, ctx),
    ).toThrow();
  });

  test("direction is always unit length (property)", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }), {
            minLength: 2,
            maxLength: 2,
          }),
          fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }), {
            minLength: 2,
            maxLength: 2,
          }),
        ),
        ([c1, c2]) => {
          // Skip if points are too close
          const dx = (c2[0] ?? 0) - (c1[0] ?? 0);
          const dy = (c2[1] ?? 0) - (c1[1] ?? 0);
          if (Math.sqrt(dx * dx + dy * dy) < 1e-6) return;
          const out = LineFromPointsBlock.compute(
            { p1: makePoint(c1), p2: makePoint(c2) },
            {},
            ctx,
          ) as MathValue;
          const line = out.payload as LinePayload;
          const mag = Math.sqrt(line.direction.reduce((s, c) => s + c * c, 0));
          expect(Math.abs(mag - 1)).toBeLessThan(1e-10);
        },
      ),
    );
  });

  test("point on line satisfies implicit equation ax+by+c≈0 (2D)", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: -10, max: 10 }), {
            minLength: 2,
            maxLength: 2,
          }),
          fc.array(fc.float({ noNaN: true, noDefaultInfinity: true, min: -10, max: 10 }), {
            minLength: 2,
            maxLength: 2,
          }),
        ),
        ([c1, c2]) => {
          const dx = (c2[0] ?? 0) - (c1[0] ?? 0);
          const dy = (c2[1] ?? 0) - (c1[1] ?? 0);
          if (Math.sqrt(dx * dx + dy * dy) < 1e-4) return;
          const out = LineFromPointsBlock.compute(
            { p1: makePoint(c1), p2: makePoint(c2) },
            {},
            ctx,
          ) as MathValue;
          const line = out.payload as LinePayload;
          if (line.implicit === undefined) return;
          const { a, b, c } = line.implicit;
          // Both p1 and p2 should satisfy ax+by+c=0
          const v1 = a * (c1[0] ?? 0) + b * (c1[1] ?? 0) + c;
          const v2 = a * (c2[0] ?? 0) + b * (c2[1] ?? 0) + c;
          expect(Math.abs(v1)).toBeLessThan(1e-9);
          expect(Math.abs(v2)).toBeLessThan(1e-9);
        },
      ),
    );
  });
});
