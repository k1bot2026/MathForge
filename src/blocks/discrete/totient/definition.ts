import type { BlockDefinition } from "~/blocks/types";
import { makeScalar } from "../combinatorics";
import { NumberTheoryError, totient } from "../number-theory";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

export const TotientBlock: BlockDefinition = {
  id: "discrete.totient",
  label: "Euler's Totient",
  symbol: "φ(n)",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "n", label: "n", type: INTEGER_TYPE }],
  outputs: [{ id: "result", label: "φ(n)", type: INTEGER_TYPE }],
  compute(inputs) {
    const nVal = inputs.n;
    if (nVal === undefined) {
      throw new NumberTheoryError("discrete.totient: n input is required");
    }
    return makeScalar(totient(nVal.payload as number));
  },
  explain: {
    what: "Euler's totient φ(n): count of integers in [1,n] that are coprime to n.",
    why: "Appears in RSA key generation (φ(p·q)), group theory (order of (Z/nZ)*), and Euler's theorem.",
    effect: (_inputs, output) => `φ(n) = ${String(output.payload as number)}`,
  },
};
