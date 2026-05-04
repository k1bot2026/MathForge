import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { VectorFieldVisualization } from "./visualization";

export const VizVectorFieldBlock: BlockDefinition = {
  id: "viz.vector-field",
  label: "Vector Field",
  symbol: "F(x,y)",
  category: "visualizer",
  domain: "calculus",
  determinism: "pure",
  stability: "beta",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "Fx",
      label: "Fx(x,y) — x-component",
      type: {
        kind: "Function",
        arity: 2,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "Fy",
      label: "Fy(x,y) — y-component",
      type: {
        kind: "Function",
        arity: 2,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      required: false,
    },
  ],
  outputs: [
    {
      id: "Fx",
      label: "Fx passthrough",
      type: {
        kind: "Function",
        arity: 2,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],
  compute: (inputs): MathValue => {
    const fx = inputs.Fx;
    if (fx === undefined) {
      throw new Error("viz.vector-field requires Fx(x,y) on the Fx port");
    }
    return fx;
  },
  explain: {
    what: "Plots a 2D vector field F(x,y) = (Fx, Fy) on a uniform grid. Each arrow direction shows the field direction; arrow length and opacity encode magnitude. Connect calc.partial outputs (∂f/∂x, ∂f/∂y) as Fx/Fy to visualise the gradient field of a scalar function.",
    why: "Vector fields appear throughout calculus and physics: gradient fields, flow fields, and Hamiltonian dynamics. This block makes the connection between symbolic partial derivatives and geometric flow patterns visual.",
    effect: (inputs) => {
      const fx = inputs.Fx;
      const fy = inputs.Fy;
      if (fx === undefined) return "Connect Fx(x,y) and Fy(x,y) to render the vector field.";
      const fxP = fx.payload as unknown as FunctionPayload;
      const fyP = fy !== undefined ? (fy.payload as unknown as FunctionPayload) : null;
      if (fyP === null) return `Fx = ${fxP.expression} — connect Fy for full 2D field.`;
      return `F(x,y) = (${fxP.expression}, ${fyP.expression})`;
    },
  },
  visualization: VectorFieldVisualization,
};
