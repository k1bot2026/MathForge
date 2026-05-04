import type { BlockDefinition } from "~/blocks/types";
import { divisors, makeSetOfIntegers, NumberTheoryError } from "../number-theory";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};
const SET_INTEGER_TYPE = {
  kind: "Set" as const,
  element: { kind: "Scalar" as const, field: "integer" as const, precision: "exact" as const },
};

export const DivisorsBlock: BlockDefinition = {
  id: "discrete.divisors",
  label: "Divisors",
  symbol: "div",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "n", label: "n", type: INTEGER_TYPE }],
  outputs: [{ id: "result", label: "divisors(n)", type: SET_INTEGER_TYPE }],
  compute(inputs) {
    const nVal = inputs.n;
    if (nVal === undefined) {
      throw new NumberTheoryError("discrete.divisors: n input is required");
    }
    return makeSetOfIntegers(divisors(nVal.payload as number));
  },
  explain: {
    what: "Returns the set of all positive divisors of n in ascending order.",
    why: "Used in divisibility arguments, perfect-number checks, and lattice diagrams of divisibility.",
    effect: (_inputs, output) => {
      const count = (output.payload as ReadonlyArray<unknown>).length;
      return `${String(count)} divisor${count === 1 ? "" : "s"}.`;
    },
  },
};
