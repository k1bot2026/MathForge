import type { BlockDefinition } from "~/blocks/types";
import { CombinatoricsError, FACTORIAL_MAX_N, factorial, makeScalar } from "../combinatorics";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

export const FactorialBlock: BlockDefinition = {
  id: "discrete.factorial",
  label: "Factorial",
  symbol: "n!",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "n", label: "n", type: INTEGER_TYPE }],
  outputs: [{ id: "result", label: "n!", type: INTEGER_TYPE }],
  compute(inputs) {
    const nVal = inputs.n;
    if (nVal === undefined) {
      throw new CombinatoricsError("discrete.factorial: n input is required");
    }
    const n = nVal.payload as number;
    return makeScalar(factorial(n));
  },
  explain: {
    what: `Computes n! = 1 × 2 × … × n. Exact integers up to n=${String(FACTORIAL_MAX_N)}.`,
    why: "Building block for combinatorics — feeds binomial coefficients, multinomial coefficients, and permutation counts.",
    effect: (_inputs, output) => `n! = ${String(output.payload as number)}`,
  },
};
