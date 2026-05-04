import type { BlockDefinition } from "~/blocks/types";
import { makeScalar } from "../combinatorics";
import { modularInverse, NumberTheoryError } from "../number-theory";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

export const ModularInverseBlock: BlockDefinition = {
  id: "discrete.modular-inverse",
  label: "Modular Inverse",
  symbol: "a⁻¹ mod m",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "a", label: "a", type: INTEGER_TYPE },
    { id: "m", label: "m", type: INTEGER_TYPE },
  ],
  outputs: [{ id: "result", label: "a⁻¹ mod m", type: INTEGER_TYPE }],
  compute(inputs) {
    const { a: aVal, m: mVal } = inputs;
    if (aVal === undefined || mVal === undefined) {
      throw new NumberTheoryError("discrete.modular-inverse: a and m inputs are required");
    }
    return makeScalar(modularInverse(aVal.payload as number, mVal.payload as number));
  },
  explain: {
    what: "Modular multiplicative inverse: finds x such that a·x ≡ 1 (mod m). Requires gcd(a,m)=1.",
    why: "Essential for modular division in cryptography (RSA decryption), number theory, and competitive programming.",
    effect: (_inputs, output) => `a⁻¹ mod m = ${String(output.payload as number)}`,
  },
};
