// MathValue type system — Phase-1 expansion.
//
// Implements docs/TYPES.md for the Scalar / Vector / Matrix slice that
// Phase 1's PoC matrix-transformation pipeline needs. Function /
// Expression / RandomVariable / Distribution kinds carry through the
// discriminator (so canConnect can refuse mismatched kinds) but their
// payload type is `unknown` until later phases fill them in.

import type { BigNumber, Fraction } from "mathjs";

export type Field = "real" | "complex" | "rational" | "integer" | "boolean";

export type Precision = "exact" | "approximate";

export type Shape = number | "any" | { var: string };

export type DistributionFamily =
  | "Normal"
  | "Bernoulli"
  | "Binomial"
  | "Poisson"
  | "Uniform"
  | "Exponential"
  | "Beta"
  | "Gamma"
  | "Categorical"
  | "Multinomial"
  | "Empirical"
  | { custom: string };

export type MathType =
  | { kind: "Scalar"; field: Field; precision: Precision }
  | { kind: "Vector"; n: Shape; field: Field }
  | { kind: "Matrix"; m: Shape; n: Shape; field: Field }
  | { kind: "Function"; arity: number; domain: MathType; codomain: MathType }
  | { kind: "Expression"; freeVars: ReadonlyArray<string> }
  | { kind: "RandomVariable"; support: "discrete" | "continuous" | "mixed" }
  | { kind: "Distribution"; family: DistributionFamily }
  | { kind: "Set"; element: MathType }
  | { kind: "Tuple"; elements: ReadonlyArray<MathType> };

// ──────────────────────────────────────────────────────────────────────
// Payloads
//
// math.js's Fraction and BigNumber are runtime objects; plain number
// covers IEEE 754 approximate scalars and small exact integers. Boolean
// is a distinct branch because it lives at the bottom of the field
// subtyping lattice (per docs/TYPES.md: boolean ⊂ integer ⊂ rational ⊂
// real ⊂ complex). Complex payloads are deferred to Phase 2.
// ──────────────────────────────────────────────────────────────────────

export type ScalarPayload = number | Fraction | BigNumber | boolean;

export type VectorPayload = ReadonlyArray<ScalarPayload>;

export type MatrixPayload = ReadonlyArray<ReadonlyArray<ScalarPayload>>;

export type Payload<T extends MathType> = T extends { kind: "Scalar" }
  ? ScalarPayload
  : T extends { kind: "Vector" }
    ? VectorPayload
    : T extends { kind: "Matrix" }
      ? MatrixPayload
      : unknown;

export type Provenance = {
  blockId: string;
  inputs: ReadonlyArray<string>;
  computedAt: number;
  engine: "mathjs" | "sympy" | "native";
};

export type MathValue<T extends MathType = MathType> = {
  type: T;
  payload: Payload<T>;
  provenance: Provenance;
};

// ──────────────────────────────────────────────────────────────────────
// Field subtyping lattice — see docs/TYPES.md.
// ──────────────────────────────────────────────────────────────────────

export const FIELD_RANK: Readonly<Record<Field, number>> = Object.freeze({
  boolean: 0,
  integer: 1,
  rational: 2,
  real: 3,
  complex: 4,
});

/** True if `out` is a subtype of (or equal to) `into`. */
export function isFieldSubtype(out: Field, into: Field): boolean {
  return FIELD_RANK[out] <= FIELD_RANK[into];
}

// ──────────────────────────────────────────────────────────────────────
// Shape helpers
// ──────────────────────────────────────────────────────────────────────

/** Narrows a `Shape` to a shape variable `{ var: string }`. */
export function isShapeVar(s: Shape): s is { var: string } {
  return typeof s === "object" && s !== null && "var" in s;
}

/** Narrows a `Shape` to a concrete dimension number. */
export function isConcreteShape(s: Shape): s is number {
  return typeof s === "number";
}

/** Returns a human-readable string for a shape: `"3"`, `"any"`, or the variable name. */
export function shapeToString(s: Shape): string {
  if (s === "any") return "any";
  if (typeof s === "number") return String(s);
  return s.var;
}
