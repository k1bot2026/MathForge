/**
 * CI guard: catches hand-edits to committed fixture JSON files.
 *
 * Strategy: for every case in the fixture files, recompute the same values
 * independently using math.js (integer arithmetic ⟹ exact results) and
 * assert the fixture matches. This catches numeric edits to the JSON without
 * requiring a Pyodide/SymPy round-trip in CI.
 *
 * Full regeneration check (fixture files ↔ generator script):
 *   pnpm check:fixtures
 * This runs the generator and then `git diff --exit-code tests/fixtures/sympy/`.
 * Run this locally before committing changes to the generator script.
 *
 * These Vitest tests run in `pnpm test` (fast, no Pyodide, no network).
 */

import { det, dot, multiply, trace, transpose } from "mathjs";
import { describe, expect, test } from "vitest";
import {
  loadDetMultiplicativityFixture,
  loadMatrixFixture,
  loadTransposeFixture,
  loadVectorFixture,
} from "./sympy-reference";

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Normalise IEEE 754 -0 to +0 (SymPy always returns exact 0). */
function n0(x: number): number {
  return x === 0 ? 0 : x;
}

function normMatrix(m: number[][]): number[][] {
  return m.map((row) => row.map(n0));
}

function normVector(v: number[]): number[] {
  return v.map(n0);
}

// ──────────────────────────────────────────────────────────────────────────
// la-vector.json guard
// ──────────────────────────────────────────────────────────────────────────

describe("la-vector.json fixture guard", () => {
  const f = loadVectorFixture();

  test("dot values match math.js recomputation", () => {
    for (const c of f.cases) {
      const recomputed = n0(dot(c.a, c.b) as number);
      expect(recomputed).toBe(c.dot);
    }
  });

  test("normASq values match math.js recomputation", () => {
    for (const c of f.cases) {
      const recomputed = Math.round(dot(c.a, c.a) as number);
      expect(recomputed).toBe(c.normASq);
    }
  });

  test("normBSq values match math.js recomputation", () => {
    for (const c of f.cases) {
      const recomputed = Math.round(dot(c.b, c.b) as number);
      expect(recomputed).toBe(c.normBSq);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// la-matrix.json guard
// ──────────────────────────────────────────────────────────────────────────

describe("la-matrix.json fixture guard", () => {
  const f = loadMatrixFixture();

  test("AB values match math.js recomputation (square cases)", () => {
    for (const c of f.squareCases) {
      const recomputed = normMatrix(multiply(c.A, c.B) as number[][]);
      expect(recomputed).toEqual(c.AB);
    }
  });

  test("Av values match math.js recomputation (square cases)", () => {
    for (const c of f.squareCases) {
      const recomputed = normVector(multiply(c.A, c.v) as number[]);
      expect(recomputed).toEqual(c.Av);
    }
  });

  test("At values match math.js recomputation (square cases)", () => {
    for (const c of f.squareCases) {
      const recomputed = normMatrix(transpose(c.A) as number[][]);
      expect(recomputed).toEqual(c.At);
    }
  });

  test("trA values match math.js recomputation (square cases)", () => {
    for (const c of f.squareCases) {
      const recomputed = n0(trace(c.A) as number);
      expect(recomputed).toBe(c.trA);
    }
  });

  test("detA values match math.js recomputation (square cases)", () => {
    for (const c of f.squareCases) {
      const recomputed = Math.round(det(c.A) as number);
      expect(recomputed).toBe(c.detA);
    }
  });

  test("AB values match math.js recomputation (non-square cases)", () => {
    for (const c of f.nonSquareCases) {
      const recomputed = normMatrix(multiply(c.A, c.B) as number[][]);
      expect(recomputed).toEqual(c.AB);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// la-det-multiplicativity.json guard
// ──────────────────────────────────────────────────────────────────────────

describe("la-det-multiplicativity.json fixture guard", () => {
  const f = loadDetMultiplicativityFixture();

  test("detA values match math.js recomputation", () => {
    for (const c of f.cases) {
      const recomputed = Math.round(det(c.A) as number);
      expect(recomputed).toBe(c.detA);
    }
  });

  test("detB values match math.js recomputation", () => {
    for (const c of f.cases) {
      const recomputed = Math.round(det(c.B) as number);
      expect(recomputed).toBe(c.detB);
    }
  });

  test("AB values match math.js recomputation", () => {
    for (const c of f.cases) {
      const recomputed = normMatrix(multiply(c.A, c.B) as number[][]);
      expect(recomputed).toEqual(c.AB);
    }
  });

  test("detAB values match math.js recomputation", () => {
    for (const c of f.cases) {
      const recomputed = Math.round(det(c.AB) as number);
      expect(recomputed).toBe(c.detAB);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// la-transpose.json guard
// ──────────────────────────────────────────────────────────────────────────

describe("la-transpose.json fixture guard", () => {
  const f = loadTransposeFixture();

  test("At values match math.js recomputation", () => {
    for (const c of f.cases) {
      const recomputed = normMatrix(transpose(c.A) as number[][]);
      expect(recomputed).toEqual(c.At);
    }
  });

  test("(Aᵀ)ᵀ = A for all fixture cases (involution via math.js)", () => {
    for (const c of f.cases) {
      const Att = normMatrix(transpose(transpose(c.A) as number[][]) as number[][]);
      expect(Att).toEqual(c.A);
    }
  });
});
