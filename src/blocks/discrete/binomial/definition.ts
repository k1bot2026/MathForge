import type { BlockDefinition } from "~/blocks/types";
import { binomial, CombinatoricsError, makeScalar } from "../combinatorics";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

export const BinomialBlock: BlockDefinition = {
  id: "discrete.binomial",
  label: "Binomial Coefficient",
  symbol: "C(n,k)",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "n", label: "n", type: INTEGER_TYPE },
    { id: "k", label: "k", type: INTEGER_TYPE },
  ],
  outputs: [{ id: "result", label: "C(n,k)", type: INTEGER_TYPE }],
  compute(inputs) {
    const { n: nVal, k: kVal } = inputs;
    if (nVal === undefined || kVal === undefined) {
      throw new CombinatoricsError("discrete.binomial: n and k inputs are required");
    }
    const n = nVal.payload as number;
    const k = kVal.payload as number;
    return makeScalar(binomial(n, k));
  },
  explain: {
    what: "Binomial coefficient C(n,k) = n! / (k! × (n−k)!): the number of ways to choose k items from n without regard to order.",
    why: "Cornerstone of combinatorics — appears in probability, Pascal's triangle, polynomial expansion, and counting arguments.",
    effect: (_inputs, output) => `C(n,k) = ${String(output.payload as number)}`,
  },
};
