import type { BlockDefinition } from "~/blocks/types";
import { isPrime, makeBooleanScalar, NumberTheoryError } from "../number-theory";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};
const BOOLEAN_TYPE = {
  kind: "Scalar" as const,
  field: "boolean" as const,
  precision: "exact" as const,
};

export const IsPrimeBlock: BlockDefinition = {
  id: "discrete.is-prime",
  label: "Is Prime",
  symbol: "prime?",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "n", label: "n", type: INTEGER_TYPE }],
  outputs: [{ id: "result", label: "prime?", type: BOOLEAN_TYPE }],
  compute(inputs) {
    const nVal = inputs.n;
    if (nVal === undefined) {
      throw new NumberTheoryError("discrete.is-prime: n input is required");
    }
    return makeBooleanScalar(isPrime(nVal.payload as number));
  },
  explain: {
    what: "Tests whether n is a prime number using trial division.",
    why: "Primality check is fundamental to cryptography, number-theoretic filtering, and sieve algorithms.",
    effect: (_inputs, output) => ((output.payload as boolean) ? "n is prime." : "n is not prime."),
  },
};
