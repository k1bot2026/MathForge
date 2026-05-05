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
  | { kind: "Tuple"; elements: ReadonlyArray<MathType> }
  // ── Phase 6 — Discrete Mathematics ──────────────────────────────────
  | { kind: "Permutation"; n: Shape }
  | { kind: "Combination"; n: Shape; k: Shape }
  | { kind: "Graph"; directed: boolean; weighted: boolean }
  | { kind: "Modular"; modulus: Shape }
  // ── Phase 8 — Geometry ───────────────────────────────────────────────
  | { kind: "Point"; n: Shape }
  | { kind: "Line"; n: 2 | 3 }
  | { kind: "Circle" }
  | { kind: "Sphere" }
  | { kind: "Polygon" }
  | { kind: "Conic" }
  | { kind: "Transformation"; n: 2 | 3 };

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

export type ExpressionPayload = {
  /** Serialization format: "sympy" = SymPy str() printout, "latex" = display form */
  form: "sympy" | "latex";
  /** The serialized expression string, e.g. "(1 - p) + p*exp(t)" */
  serialized: string;
  /** Free variable names present in the expression, e.g. ["t"] */
  freeVars: ReadonlyArray<string>;
};

/**
 * Payload for a Function value (calc.function and downstream calc.* blocks).
 *
 * Design: the function is stored as its SymPy-validated string form
 * (canonical SymPy str() output after sympify + str round-trip).
 * Single-variable: variables = ["x"]. Multivariate: ["x", "y", ...].
 * `arity` mirrors MathType.Function.arity for runtime convenience.
 */
export type FunctionPayload = {
  /** SymPy str() of the expression body, e.g. "sin(x) + x**2" */
  expression: string;
  /** Variable names in definition order, e.g. ["x"] or ["x", "y"] */
  variables: ReadonlyArray<string>;
};

// ── Phase 6 payload types ────────────────────────────────────────────

/** Permutation stored in one-line notation: element at index i maps to value[i]. */
export type PermutationPayload = ReadonlyArray<number>;

/** Combination: the chosen elements plus the size parameter. */
export type CombinationPayload = {
  elements: ReadonlyArray<MathValue>;
  size: number;
};

export type GraphVertex = { id: string; label?: string };
export type GraphEdgeSpec = { from: string; to: string; weight?: number };
export type GraphPayload = {
  vertices: ReadonlyArray<GraphVertex>;
  edges: ReadonlyArray<GraphEdgeSpec>;
};

/** Element of Z/mZ: value is always in [0, modulus - 1]. */
export type ModularPayload = { value: number; modulus: number };

/** Set payload: deduplicated, ordered collection of MathValues. */
export type SetPayload = ReadonlyArray<MathValue>;

// ── Phase 8 payload types ────────────────────────────────────────────

/** n-D point: component array, index i = coordinate i. */
export type PointPayload = ReadonlyArray<number>;

/**
 * Line in parametric form (canonical representation).
 * `direction` is always unit-length (normalised at construction).
 * For 2D lines, `implicit` caches ax + by + c = 0 coefficients so
 * consumers that need implicit form pay zero recomputation cost.
 * Using a single parametric canonical form means canConnect never
 * needs to branch on Line representation — all Lines are compatible.
 */
export type LinePayload = {
  point: PointPayload;
  direction: PointPayload;
  implicit?: { a: number; b: number; c: number };
};

export type CirclePayload = { center: PointPayload; radius: number };

export type SpherePayload = { center: PointPayload; radius: number };

/**
 * Ordered polygon vertices, minimum 3.
 * Vertex count is a runtime property, not a type-level constraint
 * (a triangle and a hexagon are both Polygons — vertex count matters
 * to area/perimeter computations, not to canConnect).
 */
export type PolygonPayload = ReadonlyArray<PointPayload>;

/**
 * General conic section: Ax² + Bxy + Cy² + Dx + Ey + F = 0.
 * Uppercase fields match standard conic literature and avoid shadowing
 * lowercase loop variables in compute functions.
 */
export type ConicPayload = {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
};

/**
 * Affine transformation as a (n+1)×(n+1) homogeneous matrix.
 * 2D: 3×3. 3D: 4×4.
 * Homogeneous form means compose(T1, T2) = matmul — bridges la.matmul.
 */
export type TransformationPayload = { matrix: number[][]; n: 2 | 3 };

export type Payload<T extends MathType> = T extends { kind: "Scalar" }
  ? ScalarPayload
  : T extends { kind: "Vector" }
    ? VectorPayload
    : T extends { kind: "Matrix" }
      ? MatrixPayload
      : T extends { kind: "Expression" }
        ? ExpressionPayload
        : T extends { kind: "Function" }
          ? FunctionPayload
          : T extends { kind: "Set" }
            ? SetPayload
            : T extends { kind: "Permutation" }
              ? PermutationPayload
              : T extends { kind: "Combination" }
                ? CombinationPayload
                : T extends { kind: "Graph" }
                  ? GraphPayload
                  : T extends { kind: "Modular" }
                    ? ModularPayload
                    : T extends { kind: "Point" }
                      ? PointPayload
                      : T extends { kind: "Line" }
                        ? LinePayload
                        : T extends { kind: "Circle" }
                          ? CirclePayload
                          : T extends { kind: "Sphere" }
                            ? SpherePayload
                            : T extends { kind: "Polygon" }
                              ? PolygonPayload
                              : T extends { kind: "Conic" }
                                ? ConicPayload
                                : T extends { kind: "Transformation" }
                                  ? TransformationPayload
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
