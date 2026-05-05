import { describe, expect, test } from "vitest";
import type { ConicPayload, MathValue } from "~/math/types";
import { ConicFromFivePointsBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function checkOnConic(conic: ConicPayload, x: number, y: number, tol = 1e-8): void {
  const { A, B, C, D, E, F } = conic;
  const val = A * x * x + B * x * y + C * y * y + D * x + E * y + F;
  expect(Math.abs(val)).toBeLessThan(tol);
}

describe("geom.conic-from-five-points", () => {
  test("id is geom.conic-from-five-points", () => {
    expect(ConicFromFivePointsBlock.id).toBe("geom.conic-from-five-points");
  });

  test("unit circle: all five input points satisfy the conic equation", () => {
    const pt1 = [1, 0];
    const pt2 = [0, 1];
    const pt3 = [-1, 0];
    const pt4 = [0, -1];
    const pt5 = [Math.SQRT1_2, Math.SQRT1_2];
    const out = ConicFromFivePointsBlock.compute(
      {
        p1: makePoint(pt1),
        p2: makePoint(pt2),
        p3: makePoint(pt3),
        p4: makePoint(pt4),
        p5: makePoint(pt5),
      },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Conic");
    const conic = out.payload as ConicPayload;
    for (const [x, y] of [pt1, pt2, pt3, pt4, pt5]) {
      checkOnConic(conic, x ?? 0, y ?? 0);
    }
  });

  test("axis-aligned ellipse 4x²+y²=4: five points satisfy conic", () => {
    const pt1: [number, number] = [1, 0];
    const pt2: [number, number] = [-1, 0];
    const pt3: [number, number] = [0, 2];
    const pt4: [number, number] = [0, -2];
    const pt5: [number, number] = [0.5, Math.sqrt(3)];
    const out = ConicFromFivePointsBlock.compute(
      {
        p1: makePoint(pt1),
        p2: makePoint(pt2),
        p3: makePoint(pt3),
        p4: makePoint(pt4),
        p5: makePoint(pt5),
      },
      {},
      ctx,
    ) as MathValue;
    const conic = out.payload as ConicPayload;
    for (const [x, y] of [pt1, pt2, pt3, pt4, pt5]) {
      checkOnConic(conic, x, y, 1e-7);
    }
  });

  test("parabola y=x²: five points satisfy conic", () => {
    const pPoints: [number, number][] = [-2, -1, 0, 1, 2].map((x) => [x, x * x]);
    const [pt1, pt2, pt3, pt4, pt5] = pPoints as [
      [number, number],
      [number, number],
      [number, number],
      [number, number],
      [number, number],
    ];
    const out = ConicFromFivePointsBlock.compute(
      {
        p1: makePoint(pt1),
        p2: makePoint(pt2),
        p3: makePoint(pt3),
        p4: makePoint(pt4),
        p5: makePoint(pt5),
      },
      {},
      ctx,
    ) as MathValue;
    const conic = out.payload as ConicPayload;
    for (const [x, y] of pPoints) {
      checkOnConic(conic, x, y, 1e-7);
    }
  });

  test("throws for missing point", () => {
    expect(() =>
      ConicFromFivePointsBlock.compute(
        {
          p1: makePoint([1, 0]),
          p2: makePoint([0, 1]),
          p3: makePoint([-1, 0]),
          p4: makePoint([0, -1]),
        },
        {},
        ctx,
      ),
    ).toThrow();
  });

  test("throws for degenerate five points (e.g. all same)", () => {
    const p = makePoint([1, 1]);
    expect(() =>
      ConicFromFivePointsBlock.compute({ p1: p, p2: p, p3: p, p4: p, p5: p }, {}, ctx),
    ).toThrow();
  });

  test("throws for non-2D points", () => {
    expect(() =>
      ConicFromFivePointsBlock.compute(
        {
          p1: makePoint([1, 0, 0]),
          p2: makePoint([0, 1, 0]),
          p3: makePoint([-1, 0, 0]),
          p4: makePoint([0, -1, 0]),
          p5: makePoint([0, 0, 1]),
        },
        {},
        ctx,
      ),
    ).toThrow("2D");
  });
});
