import { det, lusolve, multiply, transpose } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

export class PolynomialRegressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolynomialRegressionError";
  }
}

const EPS = 1e-10;

function buildVandermonde(x: ReadonlyArray<number>, degree: number): number[][] {
  return x.map((xi) => Array.from({ length: degree + 1 }, (_, j) => xi ** j));
}

function coeffsToExpression(coeffs: number[]): string {
  const terms: string[] = [];
  for (let j = 0; j < coeffs.length; j++) {
    const c = coeffs[j] ?? 0;
    if (Math.abs(c) < 1e-14) continue;
    const cStr = c.toPrecision(10);
    if (j === 0) {
      terms.push(cStr);
    } else if (j === 1) {
      terms.push(`${cStr}*x`);
    } else {
      terms.push(`${cStr}*x**${j}`);
    }
  }
  return terms.length > 0 ? terms.join(" + ") : "0";
}

export const PolynomialRegressionBlock: BlockDefinition = {
  id: "opt.polynomial-regression",
  label: "Polynomial Regression",
  symbol: "p(x)=Σβᵢxⁱ",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "x",
      label: "x (sample points)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
    {
      id: "y",
      label: "y (values)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "poly",
      label: "Polynomial p(x)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],
  params: {
    degree: {
      kind: "integer",
      default: 1,
      min: 1,
      max: 20,
      label: "Degree",
    },
  },
  compute(inputs, params): MathValue {
    const xVal = inputs.x;
    const yVal = inputs.y;

    if (xVal === undefined)
      throw new PolynomialRegressionError("opt.polynomial-regression: sample points x is required");
    if (yVal === undefined)
      throw new PolynomialRegressionError("opt.polynomial-regression: values y is required");

    const x = xVal.payload as ReadonlyArray<number>;
    const y = yVal.payload as ReadonlyArray<number>;
    const degree = typeof params.degree === "number" ? Math.round(params.degree) : 1;

    if (x.length !== y.length) {
      throw new PolynomialRegressionError(
        `opt.polynomial-regression: x and y must have the same length (got ${x.length} and ${y.length})`,
      );
    }
    if (x.length < degree + 1) {
      throw new PolynomialRegressionError(
        `opt.polynomial-regression: need at least ${degree + 1} points to fit a degree-${degree} polynomial (got ${x.length})`,
      );
    }

    // Build Vandermonde matrix V[i][j] = x[i]^j, j = 0..degree
    const V = buildVandermonde(x, degree);
    const Vt = transpose(V as number[][]) as number[][];
    const VtV = multiply(Vt, V as number[][]) as number[][];
    const Vty = multiply(Vt, y as number[]) as number[];

    const d = det(VtV) as number;
    if (Math.abs(d) < EPS) {
      throw new PolynomialRegressionError(
        "opt.polynomial-regression: Vandermonde matrix is singular — check for duplicate x values or try a lower degree",
      );
    }

    const raw = lusolve(VtV, Vty) as number[][];
    const coeffs = raw.map((row) => row[0] ?? 0);

    const expression = coeffsToExpression(coeffs);
    const fnPayload: FunctionPayload = { expression, variables: ["x"] };

    return {
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      payload: fnPayload as unknown as number,
      provenance: {
        blockId: "opt.polynomial-regression",
        inputs: ["x", "y"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Fits a polynomial p(x) = β₀ + β₁x + … + βₙxⁿ of given degree to (x, y) data using least-squares via the Vandermonde normal equations.",
    why: "Polynomial regression captures non-linear trends. The coefficients minimise ‖y − Vβ‖² where V is the Vandermonde matrix. High degree can overfit — use the minimum degree that captures your signal.",
    effect: (inputs) => {
      if (inputs.x === undefined || inputs.y === undefined)
        return "Connect sample points x and values y.";
      const n = (inputs.x.payload as ReadonlyArray<number>).length;
      return `Fitting polynomial to ${n} data points...`;
    },
    impact: (_inputs, output) => {
      const { expression } = output.payload as unknown as FunctionPayload;
      return `p(x) = ${expression}`;
    },
  },
};
