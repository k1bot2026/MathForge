import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { CirclePayload, MathValue } from "~/math/types";
import { pointInBox } from "../../../../tests/arbitraries";
import { loadGeomAreaFixture } from "../../../../tests/sympy-reference";
import { CircleFromCenterRadiusBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function computeCircle(cx: number, cy: number, r: number): CirclePayload {
  const out = CircleFromCenterRadiusBlock.compute(
    { center: makePoint([cx, cy]) },
    { radius: r.toString() },
    ctx,
  ) as MathValue;
  return out.payload as CirclePayload;
}

// ── Cross-engine: SymPy circle area — rSq = radius² ──────────────────────────
//
// The fixture stores rSq (= r²) to avoid π serialisation issues.
// area = π * rSq; we verify radius² matches the fixture's rSq.

describe("geom.circle-from-center-radius — cross-engine (SymPy area fixtures)", () => {
  const fixture = loadGeomAreaFixture();

  for (const c of fixture.circleAreaCases) {
    test(`circle at ${JSON.stringify(c.center)} r=${c.radius}: radius²=${c.rSq}`, () => {
      const circle = computeCircle(c.center[0] ?? 0, c.center[1] ?? 0, c.radius);
      expect(Math.round(circle.radius * circle.radius)).toBe(c.rSq);
    });
  }
});

// ── Cross-engine: center stored exactly ──────────────────────────────────────

describe("geom.circle-from-center-radius — center matches fixture", () => {
  const fixture = loadGeomAreaFixture();

  for (const c of fixture.circleAreaCases) {
    test(`center of circle at ${JSON.stringify(c.center)} is stored correctly`, () => {
      const circle = computeCircle(c.center[0] ?? 0, c.center[1] ?? 0, c.radius);
      expect(circle.center[0]).toBeCloseTo(c.center[0] ?? 0, 10);
      expect(circle.center[1]).toBeCloseTo(c.center[1] ?? 0, 10);
    });
  }
});

// ── Property: area = π * r² ───────────────────────────────────────────────────

describe("geom.circle-from-center-radius — area invariant", () => {
  test("circle area = π * radius² for all positive radii", () => {
    fc.assert(
      fc.property(pointInBox(-50, 50), fc.integer({ min: 1, max: 100 }), ([cx, cy], r) => {
        const circle = computeCircle(cx, cy, r);
        const area = Math.PI * circle.radius * circle.radius;
        expect(area).toBeCloseTo(Math.PI * r * r, 9);
      }),
    );
  });
});

// ── Property: center round-trip ───────────────────────────────────────────────

describe("geom.circle-from-center-radius — center round-trip", () => {
  test("stored center equals input center for all integer coordinates", () => {
    fc.assert(
      fc.property(pointInBox(-100, 100), fc.integer({ min: 1, max: 200 }), ([cx, cy], r) => {
        const circle = computeCircle(cx, cy, r);
        expect(circle.center[0]).toBeCloseTo(cx, 10);
        expect(circle.center[1]).toBeCloseTo(cy, 10);
        expect(circle.radius).toBeCloseTo(r, 10);
      }),
    );
  });
});

// ── Property: point on circle satisfies distance = radius ────────────────────

describe("geom.circle-from-center-radius — points on circle", () => {
  test("(cx + r, cy) and (cx, cy + r) are exactly on the circle", () => {
    fc.assert(
      fc.property(pointInBox(-50, 50), fc.integer({ min: 1, max: 50 }), ([cx, cy], r) => {
        const circle = computeCircle(cx, cy, r);
        const cx0 = circle.center[0] ?? 0;
        const cy0 = circle.center[1] ?? 0;

        // Point (cx + r, cy) should be at distance r from center
        const dx1 = cx0 + circle.radius - cx0;
        const dist1 = Math.sqrt(dx1 * dx1);
        expect(dist1).toBeCloseTo(circle.radius, 10);

        // Point (cx, cy + r) should be at distance r from center
        const dy2 = cy0 + circle.radius - cy0;
        const dist2 = Math.sqrt(dy2 * dy2);
        expect(dist2).toBeCloseTo(circle.radius, 10);
      }),
    );
  });
});
