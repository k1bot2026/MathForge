// MathValue type-system skeleton — discriminator only.
// Full payloads, provenance helpers, and Zod boundary schemas land in
// Phase 1 alongside the first real blocks. See docs/TYPES.md.

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

export type Provenance = {
  blockId: string;
  inputs: ReadonlyArray<string>;
  computedAt: number;
  engine: "mathjs" | "sympy" | "native";
};
