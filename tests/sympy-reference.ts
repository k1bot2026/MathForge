/**
 * Typed accessors for SymPy fixture files in tests/fixtures/sympy/.
 *
 * These fixtures are generated offline by `pnpm generate:fixtures` and
 * committed to the repository. Vitest loads them as static JSON — no
 * browser Worker, no network, no Pyodide boot time in CI.
 *
 * To regenerate:
 *   pnpm generate:fixtures
 *
 * To add a new fixture set:
 *   1. Add a generator function to scripts/generate-sympy-fixtures.mjs.
 *   2. Add a corresponding type + loader here.
 *   3. Commit both the updated script and the new JSON file.
 *
 * Usage in tests:
 *   import { vectorFixture, matrixFixture } from "../../tests/sympy-reference";
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FIXTURES = resolve(import.meta.dirname ?? __dirname, "fixtures/sympy");

/** @internal exported for testing the error-path only. */
export function loadFixtureJson<T>(name: string): T {
  return loadJson<T>(name);
}

function loadJson<T>(name: string): T {
  const path = resolve(FIXTURES, `${name}.json`);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `SymPy fixture "${name}" not found at ${path}. Run \`pnpm generate:fixtures\` to regenerate.`,
    );
  }
  return JSON.parse(raw) as T;
}

// ──────────────────────────────────────────────────────────────────────────
// la.vector fixture types
// ──────────────────────────────────────────────────────────────────────────

export type VectorCase = {
  a: number[];
  b: number[];
  dot: number;
  normASq: number;
  normBSq: number;
};

export type VectorFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: VectorCase[];
};

export function loadVectorFixture(): VectorFixture {
  return loadJson<VectorFixture>("la-vector");
}

// ──────────────────────────────────────────────────────────────────────────
// la.matrix fixture types
// ──────────────────────────────────────────────────────────────────────────

export type MatrixSquareCase = {
  A: number[][];
  B: number[][];
  v: number[];
  AB: number[][];
  Av: number[];
  At: number[][];
  trA: number;
  detA: number;
};

export type MatrixNonSquareCase = {
  A: number[][];
  B: number[][];
  AB: number[][];
};

export type MatrixFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  squareCases: MatrixSquareCase[];
  nonSquareCases: MatrixNonSquareCase[];
};

export function loadMatrixFixture(): MatrixFixture {
  return loadJson<MatrixFixture>("la-matrix");
}

// ──────────────────────────────────────────────────────────────────────────
// la.det multiplicativity fixture types
// ──────────────────────────────────────────────────────────────────────────

export type DetMultiplicativityCase = {
  A: number[][];
  B: number[][];
  detA: number;
  detB: number;
  AB: number[][];
  detAB: number;
};

export type DetMultiplicativityFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: DetMultiplicativityCase[];
};

export function loadDetMultiplicativityFixture(): DetMultiplicativityFixture {
  return loadJson<DetMultiplicativityFixture>("la-det-multiplicativity");
}

// ──────────────────────────────────────────────────────────────────────────
// la.transpose fixture types
// ──────────────────────────────────────────────────────────────────────────

export type TransposeCase = {
  A: number[][];
  At: number[][];
};

export type TransposeFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: TransposeCase[];
};

export function loadTransposeFixture(): TransposeFixture {
  return loadJson<TransposeFixture>("la-transpose");
}

// ──────────────────────────────────────────────────────────────────────────
// la.add / la.sub / la.trace fixture types
// ──────────────────────────────────────────────────────────────────────────

export type AddSubTraceCase = {
  A: number[][];
  B: number[][];
  ApB: number[][];
  AmB: number[][];
  /** Present only for square matrices. */
  trA?: number;
  /** Present only for square matrices. */
  trB?: number;
  /** Present only for square matrices. tr(A+B) = tr(A) + tr(B). */
  trApB?: number;
};

export type AddSubTraceFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: AddSubTraceCase[];
};

export function loadAddSubTraceFixture(): AddSubTraceFixture {
  return loadJson<AddSubTraceFixture>("la-add-sub-trace");
}
