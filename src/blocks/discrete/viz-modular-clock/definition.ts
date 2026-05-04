import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, ModularPayload } from "~/math/types";
import { ModularClockVisualization } from "./visualization";

export class VizModularError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VizModularError";
  }
}

export const VizModularClockBlock: BlockDefinition = {
  id: "viz.modular-clock",
  label: "Modular Clock",
  symbol: "Z/nZ",
  category: "visualizer",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "M",
      label: "M",
      type: { kind: "Modular", modulus: "any" },
    },
  ],
  outputs: [
    {
      id: "M",
      label: "M (passthrough)",
      type: { kind: "Modular", modulus: "any" },
    },
  ],
  compute(inputs): MathValue {
    const m = inputs.M;
    if (m === undefined) {
      throw new VizModularError("viz.modular-clock: M input is required");
    }
    return m;
  },
  explain: {
    what: "Renders a modular arithmetic clock face: residues 0, 1, …, n-1 arranged on a circle; a clock hand points to the active value.",
    why: "The clock metaphor makes modular arithmetic intuitive — addition wraps around the ring, and the cyclic group structure is immediately visible.",
    effect: (inputs) => {
      const m = inputs.M;
      if (m === undefined) return "Connect a Modular value to port M.";
      const { value, modulus } = m.payload as ModularPayload;
      return `Showing ${value} in Z/${modulus}Z.`;
    },
    impact: (_inputs, output) => {
      const { value, modulus } = output.payload as ModularPayload;
      return `Passes the same Modular(${value} mod ${modulus}) downstream.`;
    },
  },
  visualization: ModularClockVisualization,
};
