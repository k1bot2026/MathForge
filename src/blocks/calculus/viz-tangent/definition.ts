import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { TangentVisualization } from "./visualization";

export const VizTangentBlock: BlockDefinition = {
  id: "viz.tangent",
  label: "Tangent Line",
  symbol: "f'(a)",
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
      id: "derivative",
      label: "f'(x) (optional, for exact slope)",
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
      throw new Error("viz.tangent requires f(x) on the fn port");
    }
    return fn;
  },
  explain: {
    what: "Plots f(x) with an interactive movable tangent line. Click anywhere on the plot to move the contact point. Connect calc.derivative output to the derivative port for exact slopes; otherwise a numerical central-difference is used.",
    why: "Seeing the tangent line update live makes the derivative geometric meaning immediate. Combining with calc.derivative shows the difference between approximate and exact symbolic slopes.",
    effect: (inputs) => {
      const fn = inputs.fn;
      if (fn === undefined) return "Connect f(x) to see the tangent line visualization.";
      return "f(x) connected — click plot to move the tangent point.";
    },
  },
  visualization: TangentVisualization,
};
