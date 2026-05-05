import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, PointPayload } from "~/math/types";
import { pointInBox } from "../../../../tests/arbitraries";
import { loadGeomDistanceFixture } from "../../../../tests/sympy-reference";
import { distance } from "../geometry";
import { PointBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function computePoint(coords: number[]): PointPayload {
  const raw = coords.join(", ");
  const out = PointBlock.compute({}, { coords: raw }, ctx) as MathValue;
  return out.payload as PointPayload;
}

// ── Cross-engine: SymPy distance fixtures ────────────────────────────────────

describe("geom.point — cross-engine distance (SymPy fixtures)", () => {
  const fixture = loadGeomDistanceFixture();

  for (const c of fixture.pointPointCases) {
    test(`distance²(${JSON.stringify(c.p1)}, ${JSON.stringify(c.p2)}) = ${c.distSq}`, () => {
      const p1 = computePoint(c.p1);
      const p2 = computePoint(c.p2);
      const d = distance(p1, p2);
      // Fixture stores distSq to avoid irrational sqrt serialisation
      expect(Math.round(d * d)).toBe(c.distSq);
    });
  }
});

// ── Property: distance(P, P) = 0 ─────────────────────────────────────────────

describe("geom.point — distance to self is zero", () => {
  test("distance(P, P) = 0 for any 2D point", () => {
    fc.assert(
      fc.property(pointInBox(-100, 100), ([x, y]) => {
        const p = computePoint([x, y]);
        expect(distance(p, p)).toBe(0);
      }),
    );
  });

  test("distance(P, P) = 0 for any 3D point", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: -100, max: 100 }),
          fc.integer({ min: -100, max: 100 }),
          fc.integer({ min: -100, max: 100 }),
        ),
        ([x, y, z]) => {
          const p = computePoint([x, y, z]);
          expect(distance(p, p)).toBe(0);
        },
      ),
    );
  });
});

// ── Property: translation symmetry — translate(P, v) - v = P ─────────────────

describe("geom.point — translation symmetry", () => {
  test("translating P by v then subtracting v recovers P (2D)", () => {
    fc.assert(
      fc.property(pointInBox(-50, 50), pointInBox(-50, 50), ([px, py], [vx, vy]) => {
        const p = computePoint([px, py]);
        // Manually apply translation (geom.translate not yet shipped; test
        // the coordinate invariant directly on the computed payload).
        const translated = [(p[0] ?? 0) + vx, (p[1] ?? 0) + vy];
        const recovered = [(translated[0] ?? 0) - vx, (translated[1] ?? 0) - vy];
        expect(recovered[0]).toBeCloseTo(p[0] ?? 0, 10);
        expect(recovered[1]).toBeCloseTo(p[1] ?? 0, 10);
      }),
    );
  });

  test("distance is invariant under translation: d(P, Q) = d(P+v, Q+v)", () => {
    fc.assert(
      fc.property(
        pointInBox(-50, 50),
        pointInBox(-50, 50),
        pointInBox(-50, 50),
        ([px, py], [qx, qy], [vx, vy]) => {
          const p = computePoint([px, py]);
          const q = computePoint([qx, qy]);
          const pShifted = computePoint([px + vx, py + vy]);
          const qShifted = computePoint([qx + vx, qy + vy]);
          const d1 = distance(p, q);
          const d2 = distance(pShifted, qShifted);
          expect(Math.abs(d1 - d2)).toBeLessThan(1e-9);
        },
      ),
    );
  });
});

// ── Property: distance symmetry d(P, Q) = d(Q, P) ────────────────────────────

describe("geom.point — distance symmetry", () => {
  test("d(P, Q) = d(Q, P) for all 2D integer-coordinate points", () => {
    fc.assert(
      fc.property(pointInBox(-100, 100), pointInBox(-100, 100), ([px, py], [qx, qy]) => {
        const p = computePoint([px, py]);
        const q = computePoint([qx, qy]);
        expect(distance(p, q)).toBeCloseTo(distance(q, p), 12);
      }),
    );
  });
});

// ── Property: triangle inequality ────────────────────────────────────────────

describe("geom.point — triangle inequality", () => {
  test("d(A, C) ≤ d(A, B) + d(B, C) for all 2D points", () => {
    fc.assert(
      fc.property(
        pointInBox(-50, 50),
        pointInBox(-50, 50),
        pointInBox(-50, 50),
        ([ax, ay], [bx, by], [cx, cy]) => {
          const a = computePoint([ax, ay]);
          const b = computePoint([bx, by]);
          const c = computePoint([cx, cy]);
          expect(distance(a, c)).toBeLessThanOrEqual(distance(a, b) + distance(b, c) + 1e-9);
        },
      ),
    );
  });
});
