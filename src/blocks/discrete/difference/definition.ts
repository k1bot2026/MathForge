import type { BlockDefinition } from "~/blocks/types";
import type { SetPayload } from "~/math/types";
import { SetOpError, setDifference } from "../set-ops";

const SET_INTEGER = {
  kind: "Set",
  element: { kind: "Scalar", field: "integer", precision: "exact" },
} as const;

export const DifferenceBlock: BlockDefinition = {
  id: "discrete.difference",
  label: "Set Difference",
  symbol: "∖",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "A", label: "A", type: SET_INTEGER },
    { id: "B", label: "B", type: SET_INTEGER },
  ],
  outputs: [{ id: "S", label: "A ∖ B", type: SET_INTEGER }],
  compute(inputs) {
    const { A, B } = inputs;
    if (A === undefined || B === undefined) {
      throw new SetOpError("discrete.difference: A and B inputs are required");
    }
    return setDifference(A, B);
  },
  explain: {
    what: "Set difference: elements in A that are not in B.",
    why: "Removes a set of elements from another — key for complement reasoning and filtering.",
    effect: (_inputs, output) => {
      const payload = output.payload as SetPayload;
      return `A ∖ B has ${String(payload.length)} element${payload.length === 1 ? "" : "s"}.`;
    },
  },
};
