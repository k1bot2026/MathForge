import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { HistogramVisualization } from "./visualization";

export const HistogramBlock: BlockDefinition = {
  id: "viz.histogram",
  label: "Histogram",
  symbol: "∥",
  category: "visualizer",
  domain: "statistics",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "samples",
      label: "samples",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "samples",
      label: "samples (passthrough)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  params: {
    bins: {
      kind: "integer",
      default: 0,
      min: 0,
      max: 200,
      label: "Bins (0 = auto)",
    },
    kde: {
      kind: "boolean",
      default: true,
      label: "KDE overlay",
    },
  },
  compute: (inputs): MathValue => {
    const s = inputs.samples;
    if (s === undefined) {
      throw new Error("viz.histogram requires a Vector input on port samples");
    }
    return s;
  },
  explain: {
    what: "Plots a histogram of a sample vector with an optional Gaussian KDE density overlay.",
    why: "Histograms reveal the empirical distribution of samples — essential for checking normality, detecting multimodality, and validating stats.sample output.",
    effect: (inputs) => {
      const s = inputs.samples;
      if (s === undefined) return "Connect a Vector of samples to see the histogram.";
      const n = (s.payload as ReadonlyArray<number>).length;
      return `Plotting histogram of ${n} samples.`;
    },
    impact: (_inputs, output) => {
      const n = (output.payload as ReadonlyArray<number>).length;
      return `Passes the same Vector(${n}) downstream.`;
    },
  },
  visualization: HistogramVisualization,
};
