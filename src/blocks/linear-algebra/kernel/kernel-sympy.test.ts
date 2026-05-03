/**
 * Cross-engine tests for la.kernel — compares our RREF-based implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-kernel.json.
 *
 * Key invariants verified:
 *   1. nullity matches SymPy (n − rank).
 *   2. A · K ≈ 0 — each SymPy kernel column satisfies the null-space condition.
 *   3. A · our_K ≈ 0 — our kernel columns also satisfy the null-space condition.
 *   4. rank-nullity: rank + nullity = n for all fixture cases.
 *
 * Note: we do NOT compare K column-by-column against SymPy because different
 * RREF implementations may produce different (but equally valid) bases for the
 * same null space. We verify the null-space property instead.
 *
 * To regenerate fixtures:
 *   pnpm generate:fixtures
 *
 * @cross-engine
 */

import { describe, expect, test } from "vitest";
import { computeRank } from "~/blocks/linear-algebra/rank/compute";
import type { MathValue } from "~/math/types";
import { loadKernelFixture } from "../../../../tests/sympy-reference";
import { computeKernel } from "./compute";

const fixture = loadKernelFixture();

function mvalue(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: payload[0]?.length ?? 0, field: "real" },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, a, j) => s + a * (x[j] ?? 0), 0));
}

function isZeroVec(v: number[], tol = 1e-9): boolean {
  return v.every((x) => Math.abs(x) < tol);
}

describe("la.kernel cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });

  describe("nullity matches SymPy (n − rank) for all fixture cases", () => {
    for (const c of fixture.cases) {
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      test(`${m}×${n} (expected nullity=${c.nullity})`, () => {
        const result = computeKernel({ A: mvalue(c.A) });
        const nullity = result.type.kind === "Matrix" ? (result.type.n as number) : 0;
        expect(nullity).toBe(c.nullity);
      });
    }
  });

  describe("SymPy kernel columns satisfy A·k = 0 for all fixture cases", () => {
    for (const c of fixture.cases) {
      if (c.nullity === 0) continue;
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      test(`${m}×${n} (nullity=${c.nullity})`, () => {
        for (let j = 0; j < c.nullity; j++) {
          const kj = c.K.map((row) => row[j] ?? 0);
          const Akj = matVec(c.A, kj);
          expect(isZeroVec(Akj, 1e-9)).toBe(true);
        }
      });
    }
  });

  describe("our kernel columns satisfy A·k = 0 for all fixture cases", () => {
    for (const c of fixture.cases) {
      if (c.nullity === 0) continue;
      const m = c.A.length;
      const n = c.A[0]?.length ?? 0;
      test(`${m}×${n} (nullity=${c.nullity})`, () => {
        const result = computeKernel({ A: mvalue(c.A) });
        const K = result.payload as number[][];
        const nullity = c.nullity;
        for (let j = 0; j < nullity; j++) {
          const kj = K.map((row) => row[j] ?? 0);
          const Akj = matVec(c.A, kj);
          expect(isZeroVec(Akj, 1e-9)).toBe(true);
        }
      });
    }
  });

  test("rank + nullity = n for all fixture cases", () => {
    for (const c of fixture.cases) {
      const n = c.A[0]?.length ?? 0;
      const rank = computeRank({ A: mvalue(c.A) }).payload as number;
      expect(rank + c.nullity).toBe(n);
    }
  });

  test("trivial null space cases return n×0 matrix", () => {
    for (const c of fixture.cases) {
      if (c.nullity !== 0) continue;
      const n = c.A[0]?.length ?? 0;
      const result = computeKernel({ A: mvalue(c.A) });
      expect(result.type.kind).toBe("Matrix");
      if (result.type.kind === "Matrix") {
        expect(result.type.m).toBe(n);
        expect(result.type.n).toBe(0);
      }
    }
  });
});
