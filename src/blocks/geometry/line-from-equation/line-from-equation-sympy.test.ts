import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue } from "~/math/types";
import {
  loadGeomDistanceFixture,
  loadGeomIntersectionFixture,
} from "../../../../tests/sympy-reference";
import { LineFromPointsBlock } from "../line-from-points/definition";
import { LineFromEquationBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function lineFromEquation(a: number, b: number, c: number): LinePayload {
  const out = LineFromEquationBlock.compute(
    {},
    { a: a.toString(), b: b.toString(), c: c.toString() },
    ctx,
  ) as MathValue;
  return out.payload as LinePayload;
}

function lineFromPoints(p1: number[], p2: number[]): LinePayload {
  const out = LineFromPointsBlock.compute(
    { p1: makePoint(p1), p2: makePoint(p2) },
    {},
    ctx,
  ) as MathValue;
  return out.payload as LinePayload;
}

// ── Cross-engine: SymPy point-line distance — implicit form consistency ────────
//
// Both geom.line-from-points and geom.line-from-equation should produce implicit
// forms that give the same point-line distances as SymPy.

describe("geom.line-from-equation — cross-engine implicit form (SymPy distance fixtures)", () => {
  const fixture = loadGeomDistanceFixture();

  for (const c of fixture.pointLineCases) {
    const label = `line-from-equation same distance as line-from-points: line ${JSON.stringify(c.line.p1)}-${JSON.stringify(c.line.p2)}`;
    test(label, () => {
      // Derive implicit form from the two fixture points via line-from-points
      const lineViaPoints = lineFromPoints(c.line.p1, c.line.p2);
      if (lineViaPoints.implicit === undefined) return;
      const { a, b, c: ci } = lineViaPoints.implicit;

      // Re-construct the same line via line-from-equation using those coefficients
      const lineViaEq = lineFromEquation(a, b, ci);
      if (lineViaEq.implicit === undefined) return;

      // Both should give the same point-line distance for the fixture point
      function dist(imp: { a: number; b: number; c: number }, px: number, py: number) {
        const num = Math.abs(imp.a * px + imp.b * py + imp.c);
        const denom = Math.sqrt(imp.a * imp.a + imp.b * imp.b);
        return num / denom;
      }

      const [x0, y0] = c.point;
      const d1 = dist(lineViaPoints.implicit, x0 ?? 0, y0 ?? 0);
      const d2 = dist(lineViaEq.implicit, x0 ?? 0, y0 ?? 0);
      const expected = c.distN / c.distD;

      expect(d1).toBeCloseTo(expected, 9);
      expect(d2).toBeCloseTo(expected, 9);
    });
  }
});

// ── Cross-engine: SymPy intersection cases — implicit form cross-check ─────────
//
// For each line-line intersection fixture, verify that both lines' implicit
// forms evaluate to 0 at the known intersection point.

describe("geom.line-from-equation — intersection point satisfies both implicit forms (SymPy fixtures)", () => {
  const fixture = loadGeomIntersectionFixture();

  for (const c of fixture.lineLineCases) {
    const ix = c.intersectionX.n / c.intersectionX.d;
    const iy = c.intersectionY.n / c.intersectionY.d;
    test(`intersection at (${c.intersectionX.n}/${c.intersectionX.d}, ${c.intersectionY.n}/${c.intersectionY.d}) satisfies both implicit forms`, () => {
      const l1 = lineFromPoints(c.l1.p1, c.l1.p2);
      const l2 = lineFromPoints(c.l2.p1, c.l2.p2);
      if (l1.implicit === undefined || l2.implicit === undefined) return;
      const v1 = l1.implicit.a * ix + l1.implicit.b * iy + l1.implicit.c;
      const v2 = l2.implicit.a * ix + l2.implicit.b * iy + l2.implicit.c;
      expect(Math.abs(v1)).toBeLessThan(1e-9);
      expect(Math.abs(v2)).toBeLessThan(1e-9);
    });
  }
});

// ── Property: line-from-equation and line-from-points agree on implicit form ───

describe("geom.line-from-equation — agrees with line-from-points on implicit form", () => {
  test("implicit coefficients give same point-line distances for arbitrary 2D lines", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        (p1x, p1y, p2x, p2y, qx, qy) => {
          const dx = p2x - p1x;
          const dy = p2y - p1y;
          if (Math.sqrt(dx * dx + dy * dy) < 1) return;

          // Build line via two points
          const lineViaPoints = lineFromPoints([p1x, p1y], [p2x, p2y]);
          if (lineViaPoints.implicit === undefined) return;

          // Re-build via equation using the implicit coefficients
          const { a, b, c } = lineViaPoints.implicit;
          const lineViaEq = lineFromEquation(a, b, c);
          if (lineViaEq.implicit === undefined) return;

          // Both should give the same distance to an arbitrary test point
          function dist(imp: { a: number; b: number; c: number }) {
            const num = Math.abs(imp.a * qx + imp.b * qy + imp.c);
            const denom = Math.sqrt(imp.a * imp.a + imp.b * imp.b);
            return num / denom;
          }
          expect(dist(lineViaPoints.implicit)).toBeCloseTo(dist(lineViaEq.implicit), 9);
        },
      ),
    );
  });

  test("anchor point of line-from-equation satisfies its own implicit form", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -50, max: 50 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -50, max: 50 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -50, max: 50 }),
        (a, b, c) => {
          if (Math.sqrt(a * a + b * b) < 1e-6) return;
          const line = lineFromEquation(a, b, c);
          if (line.implicit === undefined) return;
          const px = line.point[0] ?? 0;
          const py = line.point[1] ?? 0;
          const residual = line.implicit.a * px + line.implicit.b * py + line.implicit.c;
          expect(Math.abs(residual)).toBeLessThan(1e-9);
        },
      ),
    );
  });
});
