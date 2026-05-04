import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { EpsilonDeltaVisualization } from "./visualization";

export const VizEpsilonDeltaBlock: BlockDefinition = {
  id: "viz.epsilon-delta",
  label: "ε-δ Limit",
  symbol: "ε-δ",
  category: "visualizer",
  domain: "calculus",
  determinism: "pure",
  stability: "beta",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "fn",
      label: "f(x)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "c",
      label: "c (limit point)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "L",
      label: "L (limit value)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
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
      throw new Error("viz.epsilon-delta requires f(x) on the fn port");
    }
    return fn;
  },
  explain: {
    what: "Visualises the ε-δ definition of a limit: given ε > 0 (output tolerance), find δ > 0 (input tolerance) such that |x - c| < δ implies |f(x) - L| < ε. The yellow horizontal strip is ε-wide, the blue vertical strip is δ-wide. The overlap turns green when δ works.",
    why: "The ε-δ definition is the formal foundation of continuity and limits. Seeing the strips update live bridges the formal definition and geometric intuition.",
    effect: (inputs) => {
      const fn = inputs.fn;
      if (fn === undefined) return "Connect f(x) to visualise the ε-δ definition of the limit.";
      const c = inputs.c;
      const L = inputs.L;
      if (c === undefined) return "f(x) connected — connect c to set the limit point.";
      return `Showing ε-δ for lim_{x→${(c.payload as number).toFixed(2)}} f(x) = ${L !== undefined ? (L.payload as number).toFixed(3) : "f(c)"}.`;
    },
  },
  visualization: EpsilonDeltaVisualization,
};
