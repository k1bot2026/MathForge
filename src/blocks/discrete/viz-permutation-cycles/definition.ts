import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PermutationPayload } from "~/math/types";
import { PermutationCyclesVisualization } from "./visualization";

export class VizPermutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VizPermutationError";
  }
}

export const VizPermutationCyclesBlock: BlockDefinition = {
  id: "viz.permutation-cycles",
  label: "Permutation Cycles",
  symbol: "σ",
  category: "visualizer",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "P",
      label: "P",
      type: { kind: "Permutation", n: "any" },
    },
  ],
  outputs: [
    {
      id: "P",
      label: "P (passthrough)",
      type: { kind: "Permutation", n: "any" },
    },
  ],
  compute(inputs): MathValue {
    const p = inputs.P;
    if (p === undefined) {
      throw new VizPermutationError("viz.permutation-cycles: P input is required");
    }
    return p;
  },
  explain: {
    what: "Visualizes a permutation's cycle decomposition: elements are arranged on a circle; arrows show where each element maps to. Fixed points have a small loop marker.",
    why: "Cycle decomposition is fundamental to permutation group theory — cycle type determines conjugacy class and order of the permutation.",
    effect: (inputs) => {
      const p = inputs.P;
      if (p === undefined) return "Connect a Permutation to port P.";
      const n = (p.payload as PermutationPayload).length;
      return `Cycle decomposition of a ${n}-element permutation.`;
    },
    impact: (_inputs, output) => {
      const n = (output.payload as PermutationPayload).length;
      return `Passes the same Permutation(n=${n}) downstream.`;
    },
  },
  visualization: PermutationCyclesVisualization,
};
