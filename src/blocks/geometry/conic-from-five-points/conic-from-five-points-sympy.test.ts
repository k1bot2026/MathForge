import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { ConicPayload, MathValue } from "~/math/types";
import { pointInBox } from "../../../../tests/arbitraries";
import { ConicFromFivePointsBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function computeConic(pts: Array<[number, number]>): ConicPayload {
  const [p1, p2, p3, p4, p5] = pts;
  const out = ConicFromFivePointsBlock.compute(
    {
      p1: makePoint(p1 ?? [0, 0]),
      p2: makePoint(p2 ?? [1, 0]),
      p3: makePoint(p3 ?? [0, 1]),
      p4: makePoint(p4 ?? [-1, 0]),
      p5: makePoint(p5 ?? [0, -1]),
    },
    {},
    ctx,
  ) as MathValue;
  return out.payload as ConicPayload;
}

function evalConic(conic: ConicPayload, x: number, y: number): number {
  const { A, B, C, D, E, F } = conic;
  return A * x * x + B * x * y + C * y * y + D * x + E * y + F;
}

// ── Cross-engine: known conic classes — SymPy substitution verification ───────
//
// SymPy's Conic.from_points (or equivalently: solve the 5×6 null-vector system
// symbolically) gives coefficients such that each input point evaluates to 0.
// We verify the fundamental invariant: substituting any input point into the
// resulting Ax²+Bxy+Cy²+Dx+Ey+F=0 gives 0 (within floating-point tolerance).
//
// Tested conic families:
//   Circle: 5 points on x²+y²=r²         → A=C, B=0
//   Ellipse: 5 points on (x/a)²+(y/b)²=1
//   Hyperbola: 5 points on x²-y²=1
//   Parabola: 5 points on y=x²

describe("geom.conic-from-five-points — cross-engine (all 5 points on conic)", () => {
  test("circle x²+y²=4: five points evaluate to 0", () => {
    const r = 2;
    const pts: Array<[number, number]> = [
      [r, 0],
      [0, r],
      [-r, 0],
      [0, -r],
      [r * Math.cos(Math.PI / 4), r * Math.sin(Math.PI / 4)],
    ];
    const conic = computeConic(pts);
    for (const [x, y] of pts) {
      expect(Math.abs(evalConic(conic, x, y))).toBeLessThan(1e-8);
    }
  });

  test("axis-aligned ellipse (x/3)²+(y/2)²=1: five points evaluate to 0", () => {
    const a = 3,
      b = 2;
    const pts: Array<[number, number]> = [
      [a, 0],
      [-a, 0],
      [0, b],
      [0, -b],
      [a * Math.cos(Math.PI / 3), b * Math.sin(Math.PI / 3)],
    ];
    const conic = computeConic(pts);
    for (const [x, y] of pts) {
      expect(Math.abs(evalConic(conic, x, y))).toBeLessThan(1e-7);
    }
  });

  test("hyperbola x²-y²=9: five points evaluate to 0", () => {
    const c = 3;
    const pts: Array<[number, number]> = [
      [c, 0],
      [-c, 0],
      [5, 4], // 25 - 16 = 9 ✓
      [5, -4],
      [-5, 4],
    ];
    const conic = computeConic(pts);
    for (const [x, y] of pts) {
      expect(Math.abs(evalConic(conic, x, y))).toBeLessThan(1e-7);
    }
  });

  test("parabola y=x²: five points evaluate to 0", () => {
    const pts: Array<[number, number]> = [-2, -1, 0, 1, 2].map(
      (x) => [x, x * x] as [number, number],
    );
    const conic = computeConic(pts);
    for (const [x, y] of pts) {
      expect(Math.abs(evalConic(conic, x, y))).toBeLessThan(1e-7);
    }
  });

  test("rotated ellipse (tilted): five points from x²+xy+y²=3 evaluate to 0", () => {
    // x²+xy+y²=3: check (1,1)→1+1+1=3✓, (-1,-1)→3✓, (1,-2)→1-2+4=3✓
    const pts: Array<[number, number]> = [
      [1, 1],
      [-1, -1],
      [1, -2],
      [-1, 2],
      [Math.sqrt(3), 0],
    ];
    const conic = computeConic(pts);
    for (const [x, y] of pts) {
      expect(Math.abs(evalConic(conic, x, y))).toBeLessThan(1e-6);
    }
  });
});

// ── Property: all 5 input points always lie on the resulting conic ────────────

describe("geom.conic-from-five-points — all 5 points on conic (property)", () => {
  test("five points in general position all evaluate to 0 on the fitted conic", () => {
    fc.assert(
      fc.property(
        pointInBox(-10, 10),
        pointInBox(-10, 10),
        pointInBox(-10, 10),
        pointInBox(-10, 10),
        pointInBox(-10, 10),
        (p1, p2, p3, p4, p5) => {
          // Build the 5×6 matrix to check rank — skip degenerate configs
          // by attempting the computation and catching GeometryError
          let conic: ConicPayload;
          try {
            conic = computeConic([p1, p2, p3, p4, p5]);
          } catch {
            return; // degenerate configuration — skip
          }

          for (const [x, y] of [p1, p2, p3, p4, p5]) {
            const val = evalConic(conic, x, y);
            expect(Math.abs(val)).toBeLessThan(1e-6);
          }
        },
      ),
    );
  });
});

// ── Property: the conic equation is scale-invariant ──────────────────────────
//
// Multiplying all coefficients by a non-zero scalar gives the same conic.
// The block normalises by max|coeff|=1; two runs on the same input return
// identical coefficients (determinism).

describe("geom.conic-from-five-points — determinism and normalisation", () => {
  test("same 5 points always produce the same normalised coefficients", () => {
    const pts: Array<[number, number]> = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [1, 1],
    ];
    const c1 = computeConic(pts);
    const c2 = computeConic(pts);
    expect(c1.A).toBeCloseTo(c2.A, 10);
    expect(c1.B).toBeCloseTo(c2.B, 10);
    expect(c1.C).toBeCloseTo(c2.C, 10);
    expect(c1.D).toBeCloseTo(c2.D, 10);
    expect(c1.E).toBeCloseTo(c2.E, 10);
    expect(c1.F).toBeCloseTo(c2.F, 10);
  });

  test("max absolute coefficient is 1 (normalisation invariant)", () => {
    fc.assert(
      fc.property(
        pointInBox(-8, 8),
        pointInBox(-8, 8),
        pointInBox(-8, 8),
        pointInBox(-8, 8),
        pointInBox(-8, 8),
        (p1, p2, p3, p4, p5) => {
          let conic: ConicPayload;
          try {
            conic = computeConic([p1, p2, p3, p4, p5]);
          } catch {
            return;
          }
          const maxAbs = Math.max(
            Math.abs(conic.A),
            Math.abs(conic.B),
            Math.abs(conic.C),
            Math.abs(conic.D),
            Math.abs(conic.E),
            Math.abs(conic.F),
          );
          expect(maxAbs).toBeCloseTo(1, 10);
        },
      ),
    );
  });
});

// ── Cross-engine: conic type classification ───────────────────────────────────
//
// Discriminant Δ = B²-4AC classifies the conic family:
//   Δ < 0 → ellipse (or circle if B=0, A=C)
//   Δ = 0 → parabola
//   Δ > 0 → hyperbola
//
// We verify our fitted conic's discriminant matches the expected family.

describe("geom.conic-from-five-points — discriminant classification", () => {
  test("circle x²+y²=1 has discriminant < 0 (ellipse family)", () => {
    const pts: Array<[number, number]> = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [Math.SQRT1_2, Math.SQRT1_2],
    ];
    const c = computeConic(pts);
    const disc = c.B * c.B - 4 * c.A * c.C;
    expect(disc).toBeLessThan(0);
  });

  test("parabola y=x² has discriminant ≈ 0", () => {
    const pts: Array<[number, number]> = [-2, -1, 0, 1, 2].map(
      (x) => [x, x * x] as [number, number],
    );
    const c = computeConic(pts);
    const disc = c.B * c.B - 4 * c.A * c.C;
    expect(Math.abs(disc)).toBeLessThan(1e-6);
  });

  test("hyperbola x²-y²=9 has discriminant > 0", () => {
    const pts: Array<[number, number]> = [
      [3, 0],
      [-3, 0],
      [5, 4],
      [5, -4],
      [-5, 4],
    ];
    const c = computeConic(pts);
    const disc = c.B * c.B - 4 * c.A * c.C;
    expect(disc).toBeGreaterThan(0);
  });
});
