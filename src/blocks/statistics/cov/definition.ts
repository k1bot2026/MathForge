import type { BlockDefinition } from "~/blocks/types";
import { computeCov } from "./compute";

export const CovBlock: BlockDefinition = {
  id: "stats.cov",
  label: "Covariance",
  symbol: "Cov[X,Y]",
  category: "operation",
  domain: "statistics",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "X",
      label: "X",
      type: { kind: "Distribution", family: "Empirical" },
    },
    {
      id: "Y",
      label: "Y",
      type: { kind: "Distribution", family: "Empirical" },
    },
  ],
  outputs: [
    {
      id: "cov",
      label: "Cov[X, Y]",
      type: { kind: "Scalar", field: "real", precision: "exact" },
    },
  ],
  compute: (inputs, params) => computeCov(inputs, params),
  explain: {
    what: "Returns Cov[X, Y] = E[(X−E[X])(Y−E[Y])]. Assumes independence (Cov=0) unless X and Y are the same random variable.",
    why: "Covariance measures the joint variability of two random variables. Positive covariance means they tend to move together; negative means they move opposite. The foundation of portfolio theory (Markowitz), linear regression, and PCA.",
    effect: (_inputs, output) =>
      `Output is Scalar(real). Cov[X, Y] = ${(output.payload as number).toPrecision(6)}.`,
    impact: () =>
      "Feed into stats.cor to compute the Pearson correlation coefficient (scale-invariant covariance). For joint distributions, connect X and Y from the same source.",
  },
};
