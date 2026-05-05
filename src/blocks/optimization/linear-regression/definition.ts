import { det, lusolve, multiply, transpose } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class LinearRegressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinearRegressionError";
  }
}

const EPS = 1e-10;

export const LinearRegressionBlock: BlockDefinition = {
  id: "opt.linear-regression",
  label: "Linear Regression",
  symbol: "β=(XᵀX)⁻¹Xᵀy",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "X",
      label: "X (design matrix)",
      type: { kind: "Matrix", m: "any", n: "any", field: "real" },
    },
    {
      id: "y",
      label: "y (response vector)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "beta",
      label: "β (coefficients)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const Xval = inputs.X;
    const yVal = inputs.y;

    if (Xval === undefined)
      throw new LinearRegressionError("opt.linear-regression: design matrix X is required");
    if (yVal === undefined)
      throw new LinearRegressionError("opt.linear-regression: response vector y is required");

    const X = Xval.payload as ReadonlyArray<ReadonlyArray<number>>;
    const y = yVal.payload as ReadonlyArray<number>;

    const m = X.length;
    const n = X[0]?.length ?? 0;

    if (m < n) {
      throw new LinearRegressionError(
        `opt.linear-regression: underdetermined system (${m} observations, ${n} predictors); need m ≥ n`,
      );
    }
    if (y.length !== m) {
      throw new LinearRegressionError(
        `opt.linear-regression: dimension mismatch — X has ${m} rows but y has ${y.length} elements`,
      );
    }

    // Normal equations: β = (XᵀX)⁻¹ Xᵀy
    const Xt = transpose(X as number[][]) as number[][];
    const XtX = multiply(Xt, X as number[][]) as number[][];
    const Xty = multiply(Xt, y as number[]) as number[];

    const d = det(XtX) as number;
    if (Math.abs(d) < EPS) {
      throw new LinearRegressionError(
        "opt.linear-regression: X is rank-deficient (columns are linearly dependent); cannot compute unique β",
      );
    }

    const raw = lusolve(XtX, Xty) as number[][];
    const beta = raw.map((row) => row[0] ?? 0);

    return {
      type: { kind: "Vector", n, field: "real" },
      payload: beta,
      provenance: {
        blockId: "opt.linear-regression",
        inputs: ["X", "y"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Fits a linear model y = Xβ by solving the normal equations β = (XᵀX)⁻¹Xᵀy. X is the design matrix (m×n), y is the response vector (length m). Returns the least-squares coefficient vector β.",
    why: "OLS (ordinary least squares) minimizes ‖y − Xβ‖². The normal equations give the unique β when X has full column rank. Use an intercept column of ones for affine fits.",
    effect: (inputs) => {
      if (inputs.X === undefined || inputs.y === undefined)
        return "Connect design matrix X and response vector y.";
      const X = inputs.X.payload as ReadonlyArray<ReadonlyArray<number>>;
      const m = X.length;
      const n = X[0]?.length ?? 0;
      return `Fitting linear model on ${m} observations with ${n} predictor(s)...`;
    },
    impact: (_inputs, output) => {
      const beta = output.payload as ReadonlyArray<number>;
      return `β = [${beta.map((v) => v.toPrecision(6)).join(", ")}]`;
    },
  },
};
