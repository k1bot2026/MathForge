import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue, PointPayload } from "~/math/types";
import { pointInBox } from "../../../../tests/arbitraries";
import { loadGeomDistanceFixture } from "../../../../tests/sympy-reference";
import { LineFromPointsBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function computeLine(c1: number[], c2: number[]): LinePayload {
  const out = LineFromPointsBlock.compute(
    { p1: makePoint(c1), p2: makePoint(c2) },
    {},
    ctx,
  ) as MathValue;
  return out.payload as LinePayload;
}

// ── Cross-engine: SymPy point-line distance fixtures ─────────────────────────
//
// The distance fixture stores point-line cases with exact rational distances.
// We verify that our computed implicit form ax+by+c=0 gives the same distance
// as SymPy: dist = |ax₀ + by₀ + c| / sqrt(a² + b²).

describe("geom.line-from-points — cross-engine implicit form (SymPy fixtures)", () => {
  const fixture = loadGeomDistanceFixture();

  for (const c of fixture.pointLineCases) {
    const label = `dist(${JSON.stringify(c.point)}, line through ${JSON.stringify(c.line.p1)}-${JSON.stringify(c.line.p2)}) = ${c.distN}/${c.distD}`;
    test(label, () => {
      const line = computeLine(c.line.p1, c.line.p2);
      expect(line.implicit).toBeDefined();
      const imp = line.implicit;
      if (imp === undefined) return;
      const { a, b, c: ci } = imp;
      const [x0, y0] = c.point;
      const num = Math.abs(a * (x0 ?? 0) + b * (y0 ?? 0) + ci);
      const denom = Math.sqrt(a * a + b * b);
      const dist = num / denom;
      const expected = c.distN / c.distD;
      expect(dist).toBeCloseTo(expected, 9);
    });
  }
});

// ── Property: both input points satisfy the implicit equation ─────────────────

describe("geom.line-from-points — both input points on the line (property)", () => {
  test("p1 and p2 satisfy ax+by+c=0 for all 2D distinct pairs", () => {
    fc.assert(
      fc.property(pointInBox(-50, 50), pointInBox(-50, 50), ([p1x, p1y], [p2x, p2y]) => {
        const dx = p2x - p1x;
        const dy = p2y - p1y;
        // Skip near-coincident points
        if (Math.sqrt(dx * dx + dy * dy) < 1) return;
        const line = computeLine([p1x, p1y], [p2x, p2y]);
        if (line.implicit === undefined) return;
        const { a, b, c } = line.implicit;
        const v1 = a * p1x + b * p1y + c;
        const v2 = a * p2x + b * p2y + c;
        expect(Math.abs(v1)).toBeLessThan(1e-9);
        expect(Math.abs(v2)).toBeLessThan(1e-9);
      }),
    );
  });
});

// ── Property: swapping points gives same implicit line ────────────────────────

describe("geom.line-from-points — swap-points invariant", () => {
  test("Line(p1, p2) and Line(p2, p1) define the same implicit line (up to sign)", () => {
    fc.assert(
      fc.property(pointInBox(-50, 50), pointInBox(-50, 50), ([p1x, p1y], [p2x, p2y]) => {
        const dx = p2x - p1x;
        const dy = p2y - p1y;
        if (Math.sqrt(dx * dx + dy * dy) < 1) return;
        const line1 = computeLine([p1x, p1y], [p2x, p2y]);
        const line2 = computeLine([p2x, p2y], [p1x, p1y]);
        if (line1.implicit === undefined || line2.implicit === undefined) return;
        // Implicit forms may differ by an overall sign; normalise by dividing
        // each by its own `a` coefficient (or `b` if a=0).
        function normalise(imp: { a: number; b: number; c: number }) {
          const scale = Math.abs(imp.a) > 1e-12 ? imp.a : imp.b;
          return { a: imp.a / scale, b: imp.b / scale, c: imp.c / scale };
        }
        const n1 = normalise(line1.implicit);
        const n2 = normalise(line2.implicit);
        expect(Math.abs(n1.a - n2.a)).toBeLessThan(1e-9);
        expect(Math.abs(n1.b - n2.b)).toBeLessThan(1e-9);
        expect(Math.abs(n1.c - n2.c)).toBeLessThan(1e-9);
      }),
    );
  });

  test("direction vectors of Line(p1,p2) and Line(p2,p1) are parallel (opposite or same)", () => {
    fc.assert(
      fc.property(pointInBox(-50, 50), pointInBox(-50, 50), ([p1x, p1y], [p2x, p2y]) => {
        const dx = p2x - p1x;
        const dy = p2y - p1y;
        if (Math.sqrt(dx * dx + dy * dy) < 1) return;
        const line1 = computeLine([p1x, p1y], [p2x, p2y]);
        const line2 = computeLine([p2x, p2y], [p1x, p1y]);
        // Cross product of two unit vectors = 0 iff parallel
        const cross =
          (line1.direction[0] ?? 0) * (line2.direction[1] ?? 0) -
          (line1.direction[1] ?? 0) * (line2.direction[0] ?? 0);
        expect(Math.abs(cross)).toBeLessThan(1e-9);
      }),
    );
  });
});

// ── Property: parametric point recovery ───────────────────────────────────────
//
// A point on the line at parameter t = 0 is p1 and at t = |p2 - p1| is p2.

describe("geom.line-from-points — parametric form recovers input points", () => {
  test("point + 0 * direction = p1 (anchor point is p1)", () => {
    fc.assert(
      fc.property(pointInBox(-50, 50), pointInBox(-50, 50), ([p1x, p1y], [p2x, p2y]) => {
        const dx = p2x - p1x;
        const dy = p2y - p1y;
        if (Math.sqrt(dx * dx + dy * dy) < 1) return;
        const line = computeLine([p1x, p1y], [p2x, p2y]);
        // Anchor point must equal p1
        expect((line.point as PointPayload)[0]).toBeCloseTo(p1x, 10);
        expect((line.point as PointPayload)[1]).toBeCloseTo(p1y, 10);
      }),
    );
  });

  test("anchor + t * direction reaches p2 at the correct t", () => {
    fc.assert(
      fc.property(pointInBox(-50, 50), pointInBox(-50, 50), ([p1x, p1y], [p2x, p2y]) => {
        const dx = p2x - p1x;
        const dy = p2y - p1y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;
        const line = computeLine([p1x, p1y], [p2x, p2y]);
        // At t = dist, anchor + t * direction = p2
        const anchor = line.point as PointPayload;
        const rx = (anchor[0] ?? 0) + dist * (line.direction[0] ?? 0);
        const ry = (anchor[1] ?? 0) + dist * (line.direction[1] ?? 0);
        expect(rx).toBeCloseTo(p2x, 9);
        expect(ry).toBeCloseTo(p2y, 9);
      }),
    );
  });
});

// ── Error paths ───────────────────────────────────────────────────────────────

describe("geom.line-from-points — error paths", () => {
  test("throws for coincident points (any 2D pair)", () => {
    fc.assert(
      fc.property(pointInBox(-50, 50), ([x, y]) => {
        expect(() => computeLine([x, y], [x, y])).toThrow();
      }),
    );
  });
});
