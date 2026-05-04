import type { BlockDefinition } from "~/blocks/types";
import { makeScalar } from "../combinatorics";
import { lcm, NumberTheoryError } from "../number-theory";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

export const LcmBlock: BlockDefinition = {
  id: "discrete.lcm",
  label: "LCM",
  symbol: "lcm",
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
  outputs: [{ id: "result", label: "lcm(a,b)", type: INTEGER_TYPE }],
  compute(inputs) {
    const { a: aVal, b: bVal } = inputs;
    if (aVal === undefined || bVal === undefined) {
      throw new NumberTheoryError("discrete.lcm: a and b inputs are required");
    }
    return makeScalar(lcm(aVal.payload as number, bVal.payload as number));
  },
  explain: {
    what: "Least common multiple: the smallest positive integer divisible by both a and b.",
    why: "Used to find common denominators, synchronize periodic events, and in algebraic number theory.",
    effect: (_inputs, output) => `lcm = ${String(output.payload as number)}`,
  },
};
