import type { BlockDefinition } from "~/blocks/types";
import type { SetPayload } from "~/math/types";
import { SetOpError, setIntersection } from "../set-ops";

const SET_INTEGER = {
  kind: "Set",
  element: { kind: "Scalar", field: "integer", precision: "exact" },
} as const;

export const IntersectionBlock: BlockDefinition = {
  id: "discrete.intersection",
  label: "Set Intersection",
  symbol: "∩",
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
  outputs: [{ id: "S", label: "A ∩ B", type: SET_INTEGER }],
  compute(inputs) {
    const { A, B } = inputs;
    if (A === undefined || B === undefined) {
      throw new SetOpError("discrete.intersection: A and B inputs are required");
    }
    return setIntersection(A, B);
  },
  explain: {
    what: "Set intersection: elements common to both A and B.",
    why: "Identifies shared elements across two sets — useful in filtering, overlap detection, and Venn-diagram reasoning.",
    effect: (_inputs, output) => {
      const payload = output.payload as SetPayload;
      return `A ∩ B has ${String(payload.length)} element${payload.length === 1 ? "" : "s"}.`;
    },
  },
};
