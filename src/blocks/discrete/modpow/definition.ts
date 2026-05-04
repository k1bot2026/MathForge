import type { BlockDefinition } from "~/blocks/types";
import { makeScalar } from "../combinatorics";
import { modpow, NumberTheoryError } from "../number-theory";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

export const ModpowBlock: BlockDefinition = {
  id: "discrete.modpow",
  label: "Modular Power",
  symbol: "aᵉ mod m",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "base", label: "base", type: INTEGER_TYPE },
    { id: "exp", label: "exp", type: INTEGER_TYPE },
    { id: "m", label: "m", type: INTEGER_TYPE },
  ],
  outputs: [{ id: "result", label: "baseᵉˣᵖ mod m", type: INTEGER_TYPE }],
  compute(inputs) {
    const { base: baseVal, exp: expVal, m: mVal } = inputs;
    if (baseVal === undefined || expVal === undefined || mVal === undefined) {
      throw new NumberTheoryError("discrete.modpow: base, exp, and m inputs are required");
    }
    return makeScalar(
      modpow(baseVal.payload as number, expVal.payload as number, mVal.payload as number),
    );
  },
  explain: {
    what: "Modular exponentiation: computes base^exp mod m efficiently using repeated squaring.",
    why: "Core primitive in RSA encryption, Diffie-Hellman key exchange, and primality testing.",
    effect: (_inputs, output) => `base^exp mod m = ${String(output.payload as number)}`,
  },
};
