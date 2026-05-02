// fast-check arbitraries for the MathValue type system.
//
// Phase 1: covers Field, Precision, Shape, plus the Scalar / Vector /
// Matrix arms of MathType — what canConnect and the linear-algebra
// blocks need. Function / Expression / RandomVariable / Distribution
// arbitraries land alongside their respective domains in later phases.
//
// Convention: arbitraries shrink to "boring" cases (zeros, identity,
// small integers) so failures are minimal counterexamples.

import fc from "fast-check";
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
