import type { BlockDefinition } from "~/blocks/types";
import type { SetPayload } from "~/math/types";
import { SetOpError, setUnion } from "../set-ops";

const SET_INTEGER = {
  kind: "Set",
  element: { kind: "Scalar", field: "integer", precision: "exact" },
} as const;

export const UnionBlock: BlockDefinition = {
  id: "discrete.union",
  label: "Set Union",
  symbol: "∪",
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
  outputs: [{ id: "S", label: "A ∪ B", type: SET_INTEGER }],
  compute(inputs) {
    const { A, B } = inputs;
    if (A === undefined || B === undefined) {
      throw new SetOpError("discrete.union: A and B inputs are required");
    }
    return setUnion(A, B);
  },
  explain: {
    what: "Set union: all elements that appear in A, B, or both.",
    why: "Foundation for Venn-diagram reasoning and set-based filtering pipelines.",
    effect: (_inputs, output) => {
      const payload = output.payload as SetPayload;
      return `A ∪ B has ${String(payload.length)} element${payload.length === 1 ? "" : "s"}.`;
    },
  },
};
