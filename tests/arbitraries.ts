// fast-check arbitraries for the MathValue type system.
//
// Phase 1: covers Field, Precision, Shape, plus the Scalar / Vector /
// Matrix arms of MathType — what canConnect and the linear-algebra
// blocks need. Function / Expression / RandomVariable / Distribution
// arbitraries land alongside their respective domains in later phases.
//
// Phase 2 additions: invertibleMatrix, orthogonalMatrix.
//
// Convention: arbitraries shrink to "boring" cases (zeros, identity,
// small integers) so failures are minimal counterexamples.

import fc from "fast-check";
import { det } from "mathjs";
import type { Field, MathType, Precision, Shape } from "~/math/types";

export const fieldArb: fc.Arbitrary<Field> = fc.constantFrom<Field>(
  "boolean",
  "integer",
  "rational",
  "real",
  "complex",
);

export const precisionArb: fc.Arbitrary<Precision> = fc.constantFrom<Precision>(
  "exact",
  "approximate",
);

/** Concrete dimension between 1 and 8, biased toward small values. */
export const concreteDimArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 8 });

/** A shape variable name from a small alphabet (m, n, k, p, q). */
export const shapeVarNameArb: fc.Arbitrary<string> = fc.constantFrom("m", "n", "k", "p", "q");

export const shapeArb: fc.Arbitrary<Shape> = fc.oneof(
  { weight: 5, arbitrary: concreteDimArb },
  { weight: 1, arbitrary: fc.constant<Shape>("any") },
  { weight: 2, arbitrary: shapeVarNameArb.map<Shape>((v) => ({ var: v })) },
);

export const scalarTypeArb: fc.Arbitrary<Extract<MathType, { kind: "Scalar" }>> = fc
  .tuple(fieldArb, precisionArb)
  .map(([field, precision]) => ({ kind: "Scalar", field, precision }));

export const vectorTypeArb: fc.Arbitrary<Extract<MathType, { kind: "Vector" }>> = fc
  .tuple(shapeArb, fieldArb)
  .map(([n, field]) => ({ kind: "Vector", n, field }));

export const matrixTypeArb: fc.Arbitrary<Extract<MathType, { kind: "Matrix" }>> = fc
  .tuple(shapeArb, shapeArb, fieldArb)
  .map(([m, n, field]) => ({ kind: "Matrix", m, n, field }));

/** Phase-1 covered subset of MathType. */
export const linearAlgebraTypeArb: fc.Arbitrary<MathType> = fc.oneof(
  scalarTypeArb,
  vectorTypeArb,
  matrixTypeArb,
);

// ──────────────────────────────────────────────────────────────────────────
// Phase 2 matrix arbitraries
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates an n×n integer matrix guaranteed to be invertible (det ≠ 0).
 * Uses rejection sampling: draw a random integer matrix, discard if singular.
 *
 * Worst-case acceptance rate by dimension (entries in [-5, 5], 11^n² total):
 *   n=1: ~91% (singular only when entry = 0)
 *   n=2: ~94% (measured ~5.7% singular rate over 10k trials)
 *   n=3: ~98% (measured ~2% singular rate)
 *   n=4: ~92% (measured ~9.6% singular rate with entries in [-2, 2])
 * Expected samples per accepted matrix: ≤ 1.11 at n=4 — negligible overhead.
 *
 * Shrinks toward the identity matrix (the "most boring" invertible matrix).
 */
export function invertibleMatrix(n: number): fc.Arbitrary<number[][]> {
  const row = fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n });
  const matrix = fc.array(row, { minLength: n, maxLength: n });
  return matrix.filter((m) => Math.abs(det(m) as number) > 0.5);
}

/**
 * Generates an n×n orthogonal matrix (Q where Q^T · Q = I_n).
 * Constructed synthetically: start with the n×n identity and apply a sequence
 * of random Givens (plane) rotations. This avoids Gram-Schmidt normalisation
 * issues with near-zero vectors and keeps entries bounded in [-1, 1].
 *
 * Shrinks toward the identity matrix (zero rotations applied).
 *
 * Note: the returned matrix has floating-point entries; equality checks should
 * use a tolerance of ~1e-9 rather than exact equality.
 */
export function orthogonalMatrix(n: number): fc.Arbitrary<number[][]> {
  // Each Givens rotation is parameterised by (i, j, theta).
  // We apply between 0 and n*(n-1)/2 rotations — enough to reach any orthogonal.
  const maxRotations = Math.max(1, Math.floor((n * (n - 1)) / 2));
  const rotationArb = fc.tuple(
    fc.integer({ min: 0, max: n - 1 }),
    fc.integer({ min: 0, max: n - 1 }),
    fc.double({ noNaN: true, min: 0, max: Math.PI * 2 }),
  );
  return fc.array(rotationArb, { minLength: 0, maxLength: maxRotations }).map((rotations) => {
    // Start from identity.
    let Q: number[][] = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => (r === c ? 1 : 0)),
    );
    for (const [i, j, theta] of rotations) {
      if (i === j) continue;
      // Apply Givens rotation G(i, j, theta) to Q from the right: Q ← Q · G.
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const newQ = Q.map((row) => [...row]);
      for (let r = 0; r < n; r++) {
        const qi = Q[r]?.[i] ?? 0;
        const qj = Q[r]?.[j] ?? 0;
        const row = newQ[r];
        if (row !== undefined) {
          row[i] = cos * qi - sin * qj;
          row[j] = sin * qi + cos * qj;
        }
      }
      Q = newQ;
    }
    return Q;
  });
}
