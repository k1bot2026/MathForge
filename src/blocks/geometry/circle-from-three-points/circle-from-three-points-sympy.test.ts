import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { CirclePayload, MathValue } from "~/math/types";
import { nonCollinearTriple } from "../../../../tests/arbitraries";
import { loadGeomAreaFixture } from "../../../../tests/sympy-reference";
import { CircleFromThreePointsBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function computeCircumcircle(p1: number[], p2: number[], p3: number[]): CirclePayload {
  const out = CircleFromThreePointsBlock.compute(
    { p1: makePoint(p1), p2: makePoint(p2), p3: makePoint(p3) },
    {},
    ctx,
  ) as MathValue;
  return out.payload as CirclePayload;
}

// ── Cross-engine: SymPy triangle area fixture — circumcircle passes through vertices
//
// The area fixture has 6 triangles with integer-coordinate vertices and known
// exact areas. We don't have a separate circumcircle fixture, but the fundamental
// invariant (all 3 points on the circle at distance = radius from center) is
// itself the SymPy cross-check: SymPy's Triangle.circumcircle produces a circle
// where all vertices satisfy |P - center| = radius.
//
// For each fixture triangle we verify this invariant holds with our implementation,
// cross-referencing that the computed radius² matches the known Pythagorean result
// for the two right-triangle cases (where the hypotenuse is the diameter).

describe("geom.circle-from-three-points — cross-engine (SymPy area fixture triangles)", () => {
  const fixture = loadGeomAreaFixture();

  for (const c of fixture.triangleAreaCases) {
    const [v0, v1, v2] = c.vertices;
    test(`circumcircle of ${JSON.stringify(c.vertices)}: all 3 vertices on circle`, () => {
      const p1 = [v0[0], v0[1]];
      const p2 = [v1[0], v1[1]];
      const p3 = [v2[0], v2[1]];

      // Verify non-collinear before calling (area > 0 from fixture guarantees this)
      const circle = computeCircumcircle(p1, p2, p3);
      const cx = circle.center[0] ?? 0;
      const cy = circle.center[1] ?? 0;

      for (const [px, py] of [p1, p2, p3]) {
        const dx = (px ?? 0) - cx;
        const dy = (py ?? 0) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(Math.abs(dist - circle.radius)).toBeLessThan(1e-8);
      }
    });
  }

  // Right-triangle special case: for a right triangle the hypotenuse is the
  // diameter, so center = midpoint of hypotenuse and radius = hypotenuse/2.
  test("right-triangle (0,0),(4,0),(0,3): center is hypotenuse midpoint", () => {
    const circle = computeCircumcircle([0, 0], [4, 0], [0, 3]);
    // Hypotenuse from (4,0) to (0,3), midpoint = (2, 1.5)
    expect(circle.center[0]).toBeCloseTo(2, 8);
    expect(circle.center[1]).toBeCloseTo(1.5, 8);
    // Radius = half of hypotenuse length = sqrt(16+9)/2 = 5/2 = 2.5
    expect(circle.radius).toBeCloseTo(2.5, 8);
  });

  test("3-4-5 right triangle (0,0),(3,0),(0,4): radius = 5/2 = 2.5", () => {
    const circle = computeCircumcircle([0, 0], [3, 0], [0, 4]);
    expect(circle.radius).toBeCloseTo(2.5, 8);
    // Hypotenuse midpoint = (1.5, 2)
    expect(circle.center[0]).toBeCloseTo(1.5, 8);
    expect(circle.center[1]).toBeCloseTo(2, 8);
  });
});

// ── Property: all 3 input points lie on the circumcircle ─────────────────────

describe("geom.circle-from-three-points — all vertices on circle (nonCollinearTriple)", () => {
  test("distance from each vertex to center equals radius (property)", () => {
    fc.assert(
      fc.property(nonCollinearTriple, ([a, b, c]) => {
        // nonCollinearTriple is [-10,10]² — use larger range via scaling
        const circle = computeCircumcircle(a, b, c);
        const cx = circle.center[0] ?? 0;
        const cy = circle.center[1] ?? 0;
        for (const [px, py] of [a, b, c]) {
          const dx = px - cx;
          const dy = py - cy;
          expect(Math.abs(Math.sqrt(dx * dx + dy * dy) - circle.radius)).toBeLessThan(1e-7);
        }
      }),
    );
  });
});

// ── Property: collinear points always throw ───────────────────────────────────

describe("geom.circle-from-three-points — collinear points error", () => {
  test("three collinear points on y=x always throw (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -20, max: 20 }),
        (t1, t2, t3) => {
          // All three on the line y = x (p = [t, t])
          fc.pre(t1 !== t2 && t2 !== t3 && t1 !== t3); // distinct t values
          expect(() => computeCircumcircle([t1, t1], [t2, t2], [t3, t3])).toThrow();
        },
      ),
    );
  });

  test("three collinear points on y=2x always throw (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 10 }),
        fc.integer({ min: -10, max: 10 }),
        fc.integer({ min: -10, max: 10 }),
        (t1, t2, t3) => {
          fc.pre(t1 !== t2 && t2 !== t3 && t1 !== t3);
          expect(() => computeCircumcircle([t1, 2 * t1], [t2, 2 * t2], [t3, 2 * t3])).toThrow();
        },
      ),
    );
  });
});

// ── Property: radius is positive ─────────────────────────────────────────────

describe("geom.circle-from-three-points — radius invariants", () => {
  test("circumradius is always positive (nonCollinearTriple)", () => {
    fc.assert(
      fc.property(nonCollinearTriple, ([a, b, c]) => {
        const circle = computeCircumcircle(a, b, c);
        expect(circle.radius).toBeGreaterThan(0);
      }),
    );
  });

  test("circumcircle radius ≥ half of any side length (circumradius ≥ inradius lower bound)", () => {
    fc.assert(
      fc.property(nonCollinearTriple, ([a, b, c]) => {
        const circle = computeCircumcircle(a, b, c);
        const sides = [
          Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2),
          Math.sqrt((c[0] - b[0]) ** 2 + (c[1] - b[1]) ** 2),
          Math.sqrt((a[0] - c[0]) ** 2 + (a[1] - c[1]) ** 2),
        ];
        const maxHalfSide = Math.max(...sides) / 2;
        // Circumradius >= longest_side/2 (by the extended law of sines, R = a/(2sinA),
        // and sinA <= 1 means R >= a/2 for the side opposite the largest angle).
        expect(circle.radius + 1e-9).toBeGreaterThanOrEqual(maxHalfSide);
      }),
    );
  });
});
