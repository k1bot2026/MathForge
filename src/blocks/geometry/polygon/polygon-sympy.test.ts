import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, PolygonPayload } from "~/math/types";
import { nonCollinearTriple, pointInBox } from "../../../../tests/arbitraries";
import { loadGeomAreaFixture } from "../../../../tests/sympy-reference";
import { PolygonBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function computePolygon(verts: Array<[number, number]>): PolygonPayload {
  const raw = verts.map(([x, y]) => `${x},${y}`).join(";");
  const out = PolygonBlock.compute({}, { vertices: raw }, ctx) as MathValue;
  return out.payload as PolygonPayload;
}

/** Shoelace formula for signed area (positive = CCW). */
function shoelaceArea(poly: PolygonPayload): number {
  const n = poly.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v0 = poly[i] ?? [0, 0];
    const v1 = poly[(i + 1) % n] ?? [0, 0];
    sum += (v0[0] ?? 0) * (v1[1] ?? 0) - (v1[0] ?? 0) * (v0[1] ?? 0);
  }
  return Math.abs(sum) / 2;
}

// ── Cross-engine: SymPy polygon area fixture ──────────────────────────────────
//
// The fixture has 4 polygon area cases and 6 triangle area cases.
// We verify our shoelace formula (applied to the stored PolygonPayload)
// matches the SymPy-computed exact rational areas.

describe("geom.polygon — cross-engine shoelace area (SymPy area fixtures)", () => {
  const fixture = loadGeomAreaFixture();

  for (const c of fixture.polygonAreaCases) {
    test(`polygon ${JSON.stringify(c.vertices)}: area = ${c.areaN}/${c.areaD}`, () => {
      const poly = computePolygon(c.vertices);
      const area = shoelaceArea(poly);
      const expected = c.areaN / c.areaD;
      expect(area).toBeCloseTo(expected, 9);
    });
  }

  for (const c of fixture.triangleAreaCases) {
    test(`triangle ${JSON.stringify(c.vertices)}: area = ${c.areaN}/${c.areaD}`, () => {
      const poly = computePolygon(c.vertices);
      const area = shoelaceArea(poly);
      const expected = c.areaN / c.areaD;
      expect(area).toBeCloseTo(expected, 9);
    });
  }
});

// ── Property: vertex order is preserved exactly ────────────────────────────────

describe("geom.polygon — vertex order preservation", () => {
  test("output vertices match input order exactly (integer coordinates)", () => {
    fc.assert(
      fc.property(fc.array(pointInBox(-30, 30), { minLength: 3, maxLength: 10 }), (pts) => {
        const poly = computePolygon(pts);
        expect(poly.length).toBe(pts.length);
        for (let i = 0; i < pts.length; i++) {
          expect((poly[i] ?? [])[0]).toBe(pts[i]?.[0]);
          expect((poly[i] ?? [])[1]).toBe(pts[i]?.[1]);
        }
      }),
    );
  });
});

// ── Property: shoelace area is positive for non-degenerate triangles ──────────

describe("geom.polygon — area invariants", () => {
  test("area > 0 for any non-collinear triangle", () => {
    fc.assert(
      fc.property(nonCollinearTriple, ([a, b, c]) => {
        const poly = computePolygon([a, b, c]);
        expect(shoelaceArea(poly)).toBeGreaterThan(0);
      }),
    );
  });

  test("area is translation-invariant (shift all vertices by constant vector)", () => {
    fc.assert(
      fc.property(nonCollinearTriple, pointInBox(-50, 50), ([a, b, c], [tx, ty]) => {
        const verts: Array<[number, number]> = [a, b, c];
        const original = computePolygon(verts);
        const shifted = computePolygon(verts.map(([x, y]) => [x + tx, y + ty] as [number, number]));
        const areaOrig = shoelaceArea(original);
        const areaShift = shoelaceArea(shifted);
        expect(Math.abs(areaOrig - areaShift)).toBeLessThan(1e-9);
      }),
    );
  });

  test("area doubles when all coordinates are scaled by 2", () => {
    fc.assert(
      fc.property(nonCollinearTriple, ([a, b, c]) => {
        const original = computePolygon([a, b, c]);
        const scaled = computePolygon([
          [a[0] * 2, a[1] * 2],
          [b[0] * 2, b[1] * 2],
          [c[0] * 2, c[1] * 2],
        ]);
        // Scaling by k scales area by k²; k=2 → area × 4
        const ratio = shoelaceArea(scaled) / shoelaceArea(original);
        expect(ratio).toBeCloseTo(4, 9);
      }),
    );
  });
});

// ── Property: polygon does not auto-close (first ≠ last unless specified) ─────

describe("geom.polygon — open polygon convention", () => {
  test("first vertex ≠ last vertex (polygon is open by default)", () => {
    fc.assert(
      fc.property(nonCollinearTriple, ([a, b, c]) => {
        const poly = computePolygon([a, b, c]);
        const first = poly[0];
        const last = poly[poly.length - 1];
        // Block stores open polygon — first and last should not be the same object
        // (they may be equal only if the user passed them explicitly as equal)
        // We verify the block doesn't silently append a closing vertex.
        expect(poly.length).toBe(3);
        // Additional: if a ≠ c then first ≠ last
        if (a[0] !== c[0] || a[1] !== c[1]) {
          expect([first?.[0], first?.[1]]).not.toEqual([last?.[0], last?.[1]]);
        }
      }),
    );
  });
});
