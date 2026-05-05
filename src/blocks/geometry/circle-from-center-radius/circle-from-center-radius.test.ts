import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { CirclePayload, MathValue, PointPayload } from "~/math/types";
import { CircleFromCenterRadiusBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.circle-from-center-radius", () => {
  test("id is geom.circle-from-center-radius", () => {
    expect(CircleFromCenterRadiusBlock.id).toBe("geom.circle-from-center-radius");
  });

  test("unit circle at origin", () => {
    const out = CircleFromCenterRadiusBlock.compute(
      { center: makePoint([0, 0]) },
      { radius: "1" },
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Circle");
    const circle = out.payload as CirclePayload;
    expect(circle.radius).toBeCloseTo(1, 10);
    expect(circle.center[0]).toBeCloseTo(0, 10);
    expect(circle.center[1]).toBeCloseTo(0, 10);
  });

  test("circle at (3, 4) with radius 5", () => {
    const out = CircleFromCenterRadiusBlock.compute(
      { center: makePoint([3, 4]) },
      { radius: "5" },
      ctx,
    ) as MathValue;
    const circle = out.payload as CirclePayload;
    expect(circle.radius).toBeCloseTo(5, 10);
    const center = circle.center as PointPayload;
    expect(center[0]).toBeCloseTo(3, 10);
    expect(center[1]).toBeCloseTo(4, 10);
  });

  test("throws for zero radius", () => {
    expect(() =>
      CircleFromCenterRadiusBlock.compute({ center: makePoint([0, 0]) }, { radius: "0" }, ctx),
    ).toThrow();
  });

  test("throws for negative radius", () => {
    expect(() =>
      CircleFromCenterRadiusBlock.compute({ center: makePoint([0, 0]) }, { radius: "-1" }, ctx),
    ).toThrow();
  });

  test("throws for non-numeric radius", () => {
    expect(() =>
      CircleFromCenterRadiusBlock.compute({ center: makePoint([0, 0]) }, { radius: "abc" }, ctx),
    ).toThrow();
  });

  test("throws when center is missing", () => {
    expect(() => CircleFromCenterRadiusBlock.compute({}, { radius: "1" }, ctx)).toThrow();
  });

  test("throws for non-2D center", () => {
    expect(() =>
      CircleFromCenterRadiusBlock.compute({ center: makePoint([0, 0, 0]) }, { radius: "1" }, ctx),
    ).toThrow("2D");
  });

  test("center is stored correctly (property)", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: Math.fround(1e-3), max: 1000 }),
        (cx, cy, r) => {
          const out = CircleFromCenterRadiusBlock.compute(
            { center: makePoint([cx, cy]) },
            { radius: r.toString() },
            ctx,
          ) as MathValue;
          const circle = out.payload as CirclePayload;
          expect(Math.abs(circle.radius - r)).toBeLessThan(1e-10);
          expect(Math.abs((circle.center[0] ?? 0) - cx)).toBeLessThan(1e-10);
          expect(Math.abs((circle.center[1] ?? 0) - cy)).toBeLessThan(1e-10);
        },
      ),
    );
  });
});
