// fast-check arbitraries for the MathValue type system.
//
// Phase 1: covers Field, Precision, Shape, plus the Scalar / Vector /
// Matrix arms of MathType — what canConnect and the linear-algebra
// blocks need. Function / Expression / RandomVariable / Distribution
// arbitraries land alongside their respective domains in later phases.
//
// Phase 2 additions: invertibleMatrix, orthogonalMatrix, singularMatrix.
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
/**
 * Generates an n×n integer matrix guaranteed to be singular (det = 0).
 * Construction: build a random (n-1)×n submatrix of integers, then set
 * the last row to be a random integer linear combination of the other rows.
 * This guarantees linear dependence (rank < n → det = 0) without
 * rejection sampling, so generation is O(1) attempts.
 *
 * Shrinks toward the all-zeros matrix (the "most boring" singular matrix).
 *
 * Used for: la.inverse error-path tests, la.det zero-result verification.
 */
export function singularMatrix(n: number): fc.Arbitrary<number[][]> {
  if (n === 1) {
    // Only singular 1×1 matrix is [[0]].
    return fc.constant([[0]]);
  }
  const intEntry = fc.integer({ min: -5, max: 5 });
  // Build (n-1) independent-looking rows, each of length n.
  const submatrix = fc.array(fc.array(intEntry, { minLength: n, maxLength: n }), {
    minLength: n - 1,
    maxLength: n - 1,
  });
  // Coefficients for the linear combination that produces the dependent row.
  const coefficients = fc.array(intEntry, { minLength: n - 1, maxLength: n - 1 });

  return fc.tuple(submatrix, coefficients).map(([rows, coeffs]) => {
    // dependent row = ∑ coeffs[i] * rows[i]
    const dependent = Array.from({ length: n }, (_, col) =>
      rows.reduce((acc, row, i) => acc + (coeffs[i] ?? 0) * (row[col] ?? 0), 0),
    );
    return [...rows, dependent];
  });
}

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

// ──────────────────────────────────────────────────────────────────────────
// Phase 6 discrete-domain arbitraries
// ──────────────────────────────────────────────────────────────────────────

const SMALL_PRIMES = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
] as const;

/**
 * Generates a prime number ≤ 97.
 * Used for: is-prime, factor, modular-inverse, and number-theory property tests.
 * Shrinks toward 2 (the smallest prime).
 */
export const smallPrime: fc.Arbitrary<number> = fc.constantFrom(...SMALL_PRIMES);

/**
 * Generates a pair of coprime positive integers (a, m) with m ≥ 2.
 * Coprimality is verified via gcd — rejection rate is low: ~39% of random
 * pairs in [1,100]×[2,100] are coprime, so expected draws ≈ 2.6.
 *
 * Used for: modular-inverse tests (inverse exists iff gcd(a, m) = 1).
 * Shrinks toward (1, 2) — the "most boring" coprime pair.
 */
function gcd(a: number, b: number): number {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

export const coprimePair: fc.Arbitrary<[number, number]> = fc
  .tuple(fc.integer({ min: 1, max: 100 }), fc.integer({ min: 2, max: 100 }))
  .filter(([a, m]) => gcd(a, m) === 1);

/**
 * Generates a random permutation of [0, 1, …, n-1] using a Fisher-Yates
 * shuffle over a fast-check integer array.
 *
 * Used for: permutation-group tests, cycle decomposition, sign/parity.
 * Shrinks toward the identity permutation [0, 1, …, n-1].
 */
export function permutationOf(n: number): fc.Arbitrary<number[]> {
  if (n <= 0) return fc.constant([]);
  // Generate n random swap positions then apply Fisher-Yates.
  return fc
    .array(fc.integer({ min: 0, max: n - 1 }), { minLength: n, maxLength: n })
    .map((swapTargets) => {
      const perm = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = (swapTargets[i] ?? 0) % (i + 1);
        const tmp = perm[i] as number;
        perm[i] = perm[j] as number;
        perm[j] = tmp;
      }
      return perm;
    });
}

// ──────────────────────────────────────────────────────────────────────────
// Phase 8 geometry arbitraries
// ──────────────────────────────────────────────────────────────────────────

/** A 2D point as [x, y]. */
export type Point2D = [number, number];

/**
 * Generates a random 2D integer point with both coordinates in [min, max].
 * Used for: geometry distance/intersection/transformation property tests.
 * Shrinks toward [min, min].
 */
export function pointInBox(min: number, max: number): fc.Arbitrary<Point2D> {
  return fc.tuple(fc.integer({ min, max }), fc.integer({ min, max }));
}

/**
 * Generates three non-collinear integer points in the box [-10, 10]².
 * Non-collinearity verified via the cross product of (B-A) and (C-A);
 * accepted only when the signed area is non-zero.
 *
 * Used for: triangle area, circumscribed circle, non-degenerate geometry tests.
 * Shrinks toward the smallest non-collinear triple.
 */
export const nonCollinearTriple: fc.Arbitrary<[Point2D, Point2D, Point2D]> = fc
  .tuple(pointInBox(-10, 10), pointInBox(-10, 10), pointInBox(-10, 10))
  .filter(([a, b, c]) => {
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    return cross !== 0;
  });

/**
 * Generates a random triangle (alias for nonCollinearTriple).
 * Area is always > 0. Used for: triangle area property tests.
 * Shrinks toward the smallest non-degenerate triangle.
 */
export const triangle: fc.Arbitrary<[Point2D, Point2D, Point2D]> = nonCollinearTriple;

/**
 * Generates a random convex polygon with exactly n integer vertices (n ≥ 3).
 * Construction: draw n (angle, radius) pairs, sort by angle, project to the
 * integer lattice. Filters out degenerate cases where fewer than 3 distinct
 * lattice points result.
 *
 * Used for: polygon area invariant tests (area > 0, invariant under translation).
 * Note: coordinates are integers; use exact arithmetic in assertions.
 * Shrinks toward a small triangle near the origin.
 */
export function convexPolygon(n: number): fc.Arbitrary<Point2D[]> {
  if (n < 3) throw new Error("convexPolygon requires n >= 3");
  return fc
    .array(
      fc.tuple(
        fc.float({ min: 0, max: Math.fround(Math.PI * 2), noNaN: true }),
        fc.integer({ min: 1, max: 5 }),
      ),
      { minLength: n, maxLength: n },
    )
    .map((pairs) => {
      const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
      return sorted.map(
        ([angle, r]): Point2D => [Math.round(r * Math.cos(angle)), Math.round(r * Math.sin(angle))],
      );
    })
    .filter((pts) => {
      const unique = new Set(pts.map(([x, y]) => `${x},${y}`));
      return unique.size >= 3;
    });
}

// ──────────────────────────────────────────────────────────────────────────
// Phase 6 graph arbitraries
// ──────────────────────────────────────────────────────────────────────────

/**
 * Represents a directed or undirected graph as vertex count + edge list.
 * Vertices are 0-indexed integers in [0, vertexCount).
 */
export type SimpleGraph = {
  vertexCount: number;
  edges: Array<[number, number]>;
};

/**
 * Generates a small random graph with 2–8 vertices and 0–12 edges.
 * Edges are ordered pairs (u, v) with u < v (undirected convention).
 * Self-loops are excluded. Duplicate edges are removed.
 *
 * Used for: graph-theory block scaffolding (connectivity, path-finding, etc.)
 * Shrinks toward a two-vertex graph with no edges.
 */
export const smallGraph: fc.Arbitrary<SimpleGraph> = fc
  .integer({ min: 2, max: 8 })
  .chain((vertexCount) => {
    const edgeArb = fc
      .tuple(
        fc.integer({ min: 0, max: vertexCount - 1 }),
        fc.integer({ min: 0, max: vertexCount - 1 }),
      )
      .filter(([u, v]) => u !== v)
      .map(([u, v]): [number, number] => (u < v ? [u, v] : [v, u]));
    return fc
      .array(edgeArb, {
        minLength: 0,
        maxLength: Math.min(12, (vertexCount * (vertexCount - 1)) / 2),
      })
      .map((rawEdges) => {
        // Deduplicate edges using string keys.
        const seen = new Set<string>();
        const edges: Array<[number, number]> = [];
        for (const [u, v] of rawEdges) {
          const key = `${String(u)}-${String(v)}`;
          if (!seen.has(key)) {
            seen.add(key);
            edges.push([u, v]);
          }
        }
        return { vertexCount, edges };
      });
  });
