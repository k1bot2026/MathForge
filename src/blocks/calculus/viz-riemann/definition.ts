import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { RiemannVisualization } from "./visualization";

export const VizRiemannBlock: BlockDefinition = {
  id: "viz.riemann",
  label: "Riemann Sum",
  symbol: "Σf·Δx",
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
      id: "a",
      label: "a (lower bound)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "b",
      label: "b (upper bound)",
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
  params: {
    a: { kind: "number", default: 0, label: "a (lower bound)" },
    b: { kind: "number", default: Math.PI, label: "b (upper bound)" },
  },
  compute: (inputs): MathValue => {
    const fn = inputs.fn;
    if (fn === undefined) {
      throw new Error("viz.riemann requires f(x) on the fn port");
    }
    return fn;
  },
  explain: {
    what: "Visualises the Riemann sum approximation ∫_a^b f(x)dx as coloured rectangles over the curve. Use the slider to increase n and watch the rectangles converge to the area. Supports left, right, and midpoint endpoint methods.",
    why: "Riemann sums are the foundation of the Riemann integral definition. Seeing n → ∞ visually bridges the gap between discrete summation and continuous integration.",
    effect: (inputs) => {
      const fn = inputs.fn;
      if (fn === undefined)
        return "Connect f(x) and bounds a, b to see the Riemann sum approximation.";
      return "f(x) connected — use slider to change the number of rectangles.";
    },
  },
  visualization: RiemannVisualization,
};
