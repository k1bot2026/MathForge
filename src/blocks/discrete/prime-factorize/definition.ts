import type { BlockDefinition } from "~/blocks/types";
import { makeSetOfIntegers, NumberTheoryError, primeFactorize } from "../number-theory";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};
const SET_INTEGER_TYPE = {
  kind: "Set" as const,
  element: { kind: "Scalar" as const, field: "integer" as const, precision: "exact" as const },
};

export const PrimeFactorizeBlock: BlockDefinition = {
  id: "discrete.prime-factorize",
  label: "Prime Factorization",
  symbol: "p-fact",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "n", label: "n", type: INTEGER_TYPE }],
  outputs: [{ id: "result", label: "prime factors with multiplicity", type: SET_INTEGER_TYPE }],
  compute(inputs) {
    const nVal = inputs.n;
    if (nVal === undefined) {
      throw new NumberTheoryError("discrete.prime-factorize: n input is required");
    }
    return makeSetOfIntegers(primeFactorize(nVal.payload as number));
  },
  explain: {
    what: "Prime factorization with multiplicity: returns all prime factors including repeats (e.g. 12 → {2, 2, 3}).",
    why: "Enables exponent extraction, canonical factored form, and direct totient/divisor-count computation.",
    effect: (_inputs, output) => {
      const count = (output.payload as ReadonlyArray<unknown>).length;
      return `${String(count)} prime factor${count === 1 ? "" : "s"} (with multiplicity).`;
    },
  },
};
