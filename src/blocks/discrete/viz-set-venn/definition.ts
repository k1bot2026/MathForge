import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, SetPayload } from "~/math/types";
import { SetVennVisualization } from "./visualization";

export class VizSetVennError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VizSetVennError";
  }
}

const SET_TYPE = {
  kind: "Set" as const,
  element: { kind: "Scalar" as const, field: "integer" as const, precision: "exact" as const },
};

export const VizSetVennBlock: BlockDefinition = {
  id: "viz.set-venn",
  label: "Venn Diagram",
  symbol: "∩",
  category: "visualizer",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    { id: "A", label: "A", type: SET_TYPE },
    { id: "B", label: "B", type: SET_TYPE },
  ],
  outputs: [
    {
      id: "union",
      label: "A ∪ B",
      type: SET_TYPE,
    },
  ],
  compute(inputs): MathValue {
    const aVal = inputs.A;
    const bVal = inputs.B;
    if (aVal === undefined) throw new VizSetVennError("viz.set-venn: A input is required");
    if (bVal === undefined) throw new VizSetVennError("viz.set-venn: B input is required");

    const aItems = aVal.payload as SetPayload;
    const bItems = bVal.payload as SetPayload;
    const seen = new Set<number>();
    const union: MathValue[] = [];
    for (const item of [...aItems, ...bItems]) {
      const v = item.payload as number;
      if (!seen.has(v)) {
        seen.add(v);
        union.push(item);
      }
    }
    union.sort((x, y) => (x.payload as number) - (y.payload as number));
    return {
      type: SET_TYPE,
      payload: union,
      provenance: { blockId: "viz.set-venn", inputs: [], computedAt: Date.now(), engine: "native" },
    };
  },
  explain: {
    what: "Renders a Venn diagram for two integer sets A and B. Shows the exclusive parts of each set and their intersection.",
    why: "Venn diagrams make set relationships immediately visible — overlapping membership, unique elements, and set sizes at a glance.",
    effect: (inputs) => {
      const a = inputs.A;
      const b = inputs.B;
      if (a === undefined || b === undefined) return "Connect Sets to ports A and B.";
      return `Venn diagram: |A| = ${(a.payload as SetPayload).length}, |B| = ${(b.payload as SetPayload).length}.`;
    },
    impact: (_inputs, output) => {
      return `Outputs A ∪ B with ${(output.payload as SetPayload).length} elements.`;
    },
  },
  visualization: SetVennVisualization,
};
