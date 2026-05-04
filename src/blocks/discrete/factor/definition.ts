import type { BlockDefinition } from "~/blocks/types";
import { factor, makeSetOfIntegers, NumberTheoryError } from "../number-theory";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};
const SET_INTEGER_TYPE = {
  kind: "Set" as const,
  element: { kind: "Scalar" as const, field: "integer" as const, precision: "exact" as const },
};

export const FactorBlock: BlockDefinition = {
  id: "discrete.factor",
  label: "Prime Factors",
  symbol: "factors",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "n", label: "n", type: INTEGER_TYPE }],
  outputs: [{ id: "result", label: "prime factors", type: SET_INTEGER_TYPE }],
  compute(inputs) {
    const nVal = inputs.n;
    if (nVal === undefined) {
      throw new NumberTheoryError("discrete.factor: n input is required");
    }
    return makeSetOfIntegers(factor(nVal.payload as number));
  },
  explain: {
    what: "Returns the set of distinct prime factors of n (e.g. 12 → {2, 3}).",
    why: "Used for GCD/LCM decomposition, totient computation, and algebraic factorization.",
    effect: (_inputs, output) => {
      const count = (output.payload as ReadonlyArray<unknown>).length;
      return `${String(count)} distinct prime factor${count === 1 ? "" : "s"}.`;
    },
  },
};
