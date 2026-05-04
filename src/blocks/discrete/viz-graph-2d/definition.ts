import type { BlockDefinition } from "~/blocks/types";
import type { GraphPayload, MathValue } from "~/math/types";
import { GraphVisualization } from "./visualization";

export class VizGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VizGraphError";
  }
}

export const VizGraph2dBlock: BlockDefinition = {
  id: "viz.graph-2d",
  label: "Graph 2D",
  symbol: "G",
  category: "visualizer",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "G",
      label: "G",
      type: { kind: "Graph", directed: false, weighted: false },
    },
  ],
  outputs: [
    {
      id: "G",
      label: "G (passthrough)",
      type: { kind: "Graph", directed: false, weighted: false },
    },
  ],
  compute(inputs): MathValue {
    const g = inputs.G;
    if (g === undefined) {
      throw new VizGraphError("viz.graph-2d: G input is required");
    }
    return g;
  },
  explain: {
    what: "Renders a Graph as a force-directed 2D layout. Vertices are circles; edges are lines (arrowheads for directed graphs; weight labels for weighted graphs).",
    why: "Force-directed layout reveals graph structure — clusters, hubs, and connectivity — in a visually intuitive 2D arrangement.",
    effect: (inputs) => {
      const g = inputs.G;
      if (g === undefined) return "Connect a Graph to port G.";
      const gp = g.payload as GraphPayload;
      return `Rendering ${gp.vertices.length} vertices and ${gp.edges.length} edges.`;
    },
    impact: (_inputs, output) => {
      const gp = output.payload as GraphPayload;
      return `Passes the same Graph(${gp.vertices.length}v, ${gp.edges.length}e) downstream.`;
    },
  },
  visualization: GraphVisualization,
};
