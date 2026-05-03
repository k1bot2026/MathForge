import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { TaylorVisualization } from "./visualization";

export const VizTaylorBlock: BlockDefinition = {
  id: "viz.taylor",
  label: "Taylor Convergence",
  symbol: "f≈Tₙ",
  category: "visualizer",
  domain: "calculus",
  determinism: "pure",
  stability: "beta",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "fn",
      label: "f(x) original",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "taylor",
      label: "Tₙ(x) approximation",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      required: false,
    },
  ],
  outputs: [
    {
      id: "fn",
      label: "f(x) passthrough",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],
  compute: (inputs): MathValue => {
    const fn = inputs.fn;
    if (fn === undefined) {
      throw new Error("viz.taylor requires f(x) on the fn port");
    }
    return fn;
  },
  explain: {
    what: "Plots f(x) (solid) and its Taylor polynomial Tₙ(x) (dashed) on the same axes. Connect calc.taylor output to the taylor port. Use a slider on calc.taylor's order input to animate convergence.",
    why: "Visual comparison of f vs Tₙ reveals how fast the series converges and where it diverges outside the radius of convergence — the centrepiece of the Phase 4 demo.",
    effect: (inputs) => {
      const fn = inputs.fn;
      const taylor = inputs.taylor;
      if (fn === undefined) return "Connect f(x) to see the visualization.";
      if (taylor === undefined) return "f(x) connected. Connect a Taylor polynomial to overlay.";
      return "Showing f(x) with Taylor approximation overlay.";
    },
  },
  visualization: TaylorVisualization,
};
