/**
 * Cross-engine tests for la.vector — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-vector.json.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 * TODO: These tests currently validate against math.js dot/norm. Once the
 *       SymPy Pyodide worker exposes real-time `sympy.dot(a, b)` calls,
 *       extend this suite to also run live SymPy assertions in
 *       `pnpm test:property` (nightly). For now, the fixtures ARE the
 *       SymPy reference.
 */

import { dot, norm } from "mathjs";
import { describe, expect, test } from "vitest";
import { loadVectorFixture, type VectorCase } from "../../../../tests/sympy-reference";

// Load once per test file — synchronous read, no async overhead.
const fixture = loadVectorFixture();

describe("la.vector cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("dot product matches SymPy exact values", () => {
    for (const c of fixture.cases) {
      const label = `dot([${c.a}], [${c.b}]) = ${c.dot}`;
      test(label, () => {
        // Normalise IEEE 754 -0 → +0; SymPy always returns exact 0.
        const raw = dot(c.a, c.b) as number;
        const result = raw === 0 ? 0 : raw;
        expect(result).toBe(c.dot);
      });
    }
  });

  describe("||a||² matches SymPy exact values (integer inputs → exact squares)", () => {
    const unique = new Map<string, VectorCase>();
    for (const c of fixture.cases) {
      unique.set(JSON.stringify(c.a), c);
    }
    for (const [, c] of unique) {
      const label = `‖[${c.a}]‖² = ${c.normASq}`;
      test(label, () => {
        const n = norm(c.a, 2) as number;
        // norm returns √(∑xᵢ²), so square it back to avoid irrational comparisons.
        const sq = Math.round(n * n);
        expect(sq).toBe(c.normASq);
      });
    }
  });

  describe("||b||² matches SymPy exact values", () => {
    const unique = new Map<string, VectorCase>();
    for (const c of fixture.cases) {
      unique.set(JSON.stringify(c.b), c);
    }
    for (const [, c] of unique) {
      const label = `‖[${c.b}]‖² = ${c.normBSq}`;
      test(label, () => {
        const n = norm(c.b, 2) as number;
        const sq = Math.round(n * n);
        expect(sq).toBe(c.normBSq);
      });
    }
  });

  test("dot product satisfies Cauchy-Schwarz: |a·b| ≤ ‖a‖·‖b‖ for all fixture cases", () => {
    for (const c of fixture.cases) {
      const dotVal = Math.abs(c.dot);
      const normProduct = Math.sqrt(c.normASq) * Math.sqrt(c.normBSq);
      expect(dotVal).toBeLessThanOrEqual(normProduct + 1e-9);
    }
  });

  test("perpendicular vector pairs have dot = 0 (fixture includes orthogonal cases)", () => {
    const zeroDot = fixture.cases.filter((c) => c.dot === 0);
    expect(zeroDot.length).toBeGreaterThan(0);
    for (const c of zeroDot) {
      const raw = dot(c.a, c.b) as number;
      // Normalise -0 → +0 (see "dot product matches SymPy" above).
      expect(raw === 0 ? 0 : raw).toBe(0);
    }
  });
});
