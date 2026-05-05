import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, PolygonPayload } from "~/math/types";
import { pointInBox } from "../../../../tests/arbitraries";
import { RegularPolygonBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function computeRegularPolygon(cx: number, cy: number, n: number, r: number): PolygonPayload {
  const out = RegularPolygonBlock.compute(
    { center: makePoint([cx, cy]) },
    { n: n.toString(), radius: r.toString() },
    ctx,
  ) as MathValue;
  return out.payload as PolygonPayload;
}

// ── Cross-engine: known regular-polygon vertex positions ──────────────────────
//
// SymPy's RegularPolygon(center, radius, n).vertices places the i-th vertex at
// angle 2πi/n from the positive x-axis (same convention as our implementation).
// We verify exact positions for small n with unit radius at origin.

describe("geom.regular-polygon — cross-engine vertex positions", () => {
  test("square (n=4, r=1, center=(0,0)): vertices at (±1,0),(0,±1)", () => {
    const poly = computeRegularPolygon(0, 0, 4, 1);
    expect(poly.length).toBe(4);
    // angle 0: (1,0); π/2: (0,1); π: (-1,0); 3π/2: (0,-1)
    expect(poly[0]?.[0]).toBeCloseTo(1, 8);
    expect(poly[0]?.[1]).toBeCloseTo(0, 8);
    expect(poly[1]?.[0]).toBeCloseTo(0, 8);
    expect(poly[1]?.[1]).toBeCloseTo(1, 8);
    expect(poly[2]?.[0]).toBeCloseTo(-1, 8);
    expect(poly[2]?.[1]).toBeCloseTo(0, 8);
    expect(poly[3]?.[0]).toBeCloseTo(0, 8);
    expect(poly[3]?.[1]).toBeCloseTo(-1, 8);
  });

  test("equilateral triangle (n=3, r=2, center=(0,0)): first vertex at (2,0)", () => {
    const poly = computeRegularPolygon(0, 0, 3, 2);
    expect(poly.length).toBe(3);
    expect(poly[0]?.[0]).toBeCloseTo(2, 8);
    expect(poly[0]?.[1]).toBeCloseTo(0, 8);
    // Second vertex at angle 2π/3
    expect(poly[1]?.[0]).toBeCloseTo(2 * Math.cos((2 * Math.PI) / 3), 8);
    expect(poly[1]?.[1]).toBeCloseTo(2 * Math.sin((2 * Math.PI) / 3), 8);
  });

  test("hexagon (n=6, r=1, center=(0,0)): vertex 0 at (1,0), vertex 1 at (0.5, √3/2)", () => {
    const poly = computeRegularPolygon(0, 0, 6, 1);
    expect(poly.length).toBe(6);
    expect(poly[0]?.[0]).toBeCloseTo(1, 8);
    expect(poly[0]?.[1]).toBeCloseTo(0, 8);
    expect(poly[1]?.[0]).toBeCloseTo(0.5, 8);
    expect(poly[1]?.[1]).toBeCloseTo(Math.sqrt(3) / 2, 8);
  });

  test("translated polygon: vertices shifted by center offset", () => {
    const cx = 3,
      cy = -2,
      r = 5,
      n = 6;
    const poly = computeRegularPolygon(cx, cy, n, r);
    // Each vertex should be at (cx + r*cos(2πi/n), cy + r*sin(2πi/n))
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n;
      expect(poly[i]?.[0]).toBeCloseTo(cx + r * Math.cos(angle), 8);
      expect(poly[i]?.[1]).toBeCloseTo(cy + r * Math.sin(angle), 8);
    }
  });
});

// ── Property: equal interior angles (n-2)·π/n ────────────────────────────────
//
// The interior angle at each vertex of a regular n-gon = (n-2)·π/n.
// We measure the angle between consecutive edge vectors at each vertex.

describe("geom.regular-polygon — equal interior angles", () => {
  test("interior angle at every vertex = (n-2)·π/n for n ∈ [3,12]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 12 }), (n) => {
        const poly = computeRegularPolygon(0, 0, n, 1);
        const expectedAngle = ((n - 2) * Math.PI) / n;

        for (let i = 0; i < n; i++) {
          const prev = poly[(i - 1 + n) % n] ?? [0, 0];
          const curr = poly[i] ?? [0, 0];
          const next = poly[(i + 1) % n] ?? [0, 0];
          // Vectors: v1 = prev→curr, v2 = curr→next
          const v1x = (curr[0] ?? 0) - (prev[0] ?? 0);
          const v1y = (curr[1] ?? 0) - (prev[1] ?? 0);
          const v2x = (next[0] ?? 0) - (curr[0] ?? 0);
          const v2y = (next[1] ?? 0) - (curr[1] ?? 0);
          // Interior angle = π - exterior angle = π - angle between edge directions
          const cosExt =
            (v1x * v2x + v1y * v2y) /
            (Math.sqrt(v1x * v1x + v1y * v1y) * Math.sqrt(v2x * v2x + v2y * v2y));
          const extAngle = Math.acos(Math.max(-1, Math.min(1, cosExt)));
          const intAngle = Math.PI - extAngle;
          expect(Math.abs(intAngle - expectedAngle)).toBeLessThan(1e-8);
        }
      }),
    );
  });
});

// ── Property: equal side lengths ─────────────────────────────────────────────

describe("geom.regular-polygon — equal side lengths (property)", () => {
  test("all n sides have equal length for arbitrary n, r, center", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        fc.integer({ min: 1, max: 50 }),
        pointInBox(-30, 30),
        (n, r, [cx, cy]) => {
          const poly = computeRegularPolygon(cx, cy, n, r);
          const sideLengths = Array.from({ length: n }, (_, i) => {
            const v0 = poly[i] ?? [0, 0];
            const v1 = poly[(i + 1) % n] ?? [0, 0];
            const dx = (v1[0] ?? 0) - (v0[0] ?? 0);
            const dy = (v1[1] ?? 0) - (v0[1] ?? 0);
            return Math.sqrt(dx * dx + dy * dy);
          });
          const first = sideLengths[0] ?? 0;
          for (const s of sideLengths) {
            expect(Math.abs(s - first)).toBeLessThan(1e-8);
          }
        },
      ),
    );
  });
});

// ── Property: counter-clockwise orientation ───────────────────────────────────
//
// The signed shoelace area is positive iff vertices are CCW.

describe("geom.regular-polygon — counter-clockwise orientation", () => {
  test("vertices are ordered counter-clockwise (signed area > 0) for all n, r", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 10 }), fc.integer({ min: 1, max: 50 }), (n, r) => {
        const poly = computeRegularPolygon(0, 0, n, r);
        // Signed shoelace (positive = CCW)
        let sum = 0;
        for (let i = 0; i < poly.length; i++) {
          const v0 = poly[i] ?? [0, 0];
          const v1 = poly[(i + 1) % poly.length] ?? [0, 0];
          sum += (v0[0] ?? 0) * (v1[1] ?? 0) - (v1[0] ?? 0) * (v0[1] ?? 0);
        }
        expect(sum).toBeGreaterThan(0);
      }),
    );
  });
});

// ── Property: shoelace area = n * r² * sin(2π/n) / 2 ─────────────────────────
//
// The area of a regular n-gon with circumradius r equals n*r²*sin(2π/n)/2.

describe("geom.regular-polygon — area formula", () => {
  test("shoelace area matches (n·r²·sin(2π/n))/2 for n ∈ [3,8], r ∈ [1,20]", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 8 }), fc.integer({ min: 1, max: 20 }), (n, r) => {
        const poly = computeRegularPolygon(0, 0, n, r);
        let sum = 0;
        for (let i = 0; i < poly.length; i++) {
          const v0 = poly[i] ?? [0, 0];
          const v1 = poly[(i + 1) % poly.length] ?? [0, 0];
          sum += (v0[0] ?? 0) * (v1[1] ?? 0) - (v1[0] ?? 0) * (v0[1] ?? 0);
        }
        const shoelace = Math.abs(sum) / 2;
        const expected = (n * r * r * Math.sin((2 * Math.PI) / n)) / 2;
        expect(Math.abs(shoelace - expected)).toBeLessThan(1e-8);
      }),
    );
  });
});
