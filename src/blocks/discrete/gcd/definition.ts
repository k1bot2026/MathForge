import type { BlockDefinition } from "~/blocks/types";
import { makeScalar } from "../combinatorics";
import { gcd, NumberTheoryError } from "../number-theory";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

export const GcdBlock: BlockDefinition = {
  id: "discrete.gcd",
  label: "GCD",
  symbol: "gcd",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "a", label: "a", type: INTEGER_TYPE },
    { id: "b", label: "b", type: INTEGER_TYPE },
  ],
  outputs: [{ id: "result", label: "gcd(a,b)", type: INTEGER_TYPE }],
  compute(inputs) {
    const { a: aVal, b: bVal } = inputs;
    if (aVal === undefined || bVal === undefined) {
      throw new NumberTheoryError("discrete.gcd: a and b inputs are required");
    }
    return makeScalar(gcd(aVal.payload as number, bVal.payload as number));
  },
  explain: {
    what: "Greatest common divisor: the largest integer that divides both a and b.",
    why: "Foundation for fraction reduction, modular arithmetic, and number-theoretic proofs.",
    effect: (_inputs, output) => `gcd = ${String(output.payload as number)}`,
  },
};
