import type { BlockDefinition } from "~/blocks/types";
import { computeCor } from "./compute";

export const CorBlock: BlockDefinition = {
  id: "stats.cor",
  label: "Correlation",
  symbol: "Cor[X,Y]",
  category: "operation",
  domain: "statistics",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "cov",
      label: "Cov[X, Y]",
      type: { kind: "Scalar", field: "real", precision: "exact" },
    },
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
      id: "cor",
      label: "Cor[X, Y]",
      type: { kind: "Scalar", field: "real", precision: "exact" },
    },
  ],
  compute: (inputs, params) => computeCor(inputs, params),
  explain: {
    what: "Computes the Pearson correlation coefficient Cor[X, Y] = Cov[X, Y] / √(Var[X]·Var[Y]) ∈ [−1, 1].",
    why: "Correlation is the scale-invariant version of covariance. It quantifies the strength and direction of the linear relationship between two random variables. Essential for feature selection, regression, and measuring statistical dependence.",
    effect: (_inputs, output) =>
      `Output is Scalar(real) in [−1, 1]. Cor[X, Y] = ${(output.payload as number).toPrecision(4)}.`,
    impact: () =>
      "0 = uncorrelated, ±1 = perfect linear relationship. Connect stats.cov output to cov input and both distribution sources to X and Y.",
  },
};
