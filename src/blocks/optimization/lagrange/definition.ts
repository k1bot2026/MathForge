import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

export class LagrangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LagrangeError";
  }
}

/**
 * Newton's divided differences table.
 * Returns divided difference coefficients [f[x0], f[x0,x1], f[x0,x1,x2], …].
 */
function dividedDifferences(x: ReadonlyArray<number>, y: ReadonlyArray<number>): number[] {
  const n = x.length;
  const table = y.slice() as number[];
  for (let j = 1; j < n; j++) {
    for (let i = n - 1; i >= j; i--) {
      const xi = x[i] ?? 0;
      const xij = x[i - j] ?? 0;
      if (Math.abs(xi - xij) < 1e-14) {
        throw new LagrangeError(
          `opt.lagrange: duplicate or near-duplicate x values at indices ${i - j} and ${i} (x=${xi})`,
        );
      }
      table[i] = ((table[i] ?? 0) - (table[i - 1] ?? 0)) / (xi - xij);
    }
  }
  return table;
}

/**
 * Multiplies out Newton form into monomial coefficients.
 * Newton form: c0 + c1*(x-x0) + c2*(x-x0)*(x-x1) + ...
 * Returns poly such that poly[k] is the coefficient of x^k.
 */
function newtonToMonomial(coefs: number[], x: ReadonlyArray<number>): number[] {
  const n = coefs.length;
  // poly[k] = coeff of x^k in accumulated product
  const poly = new Array<number>(n).fill(0);
  poly[0] = 1;

  // We accumulate the product (x-x0)(x-x1)...(x-x_{i-1}) in `prod`
  // and add coefs[i] * prod to the final polynomial.
  const result = new Array<number>(n).fill(0);
  result[0] = coefs[0] ?? 0;

  // prod[k] = coeff of x^k in the running Newton basis product
  const prod = new Array<number>(n).fill(0);
  prod[0] = 1;

  for (let i = 1; i < n; i++) {
    // new_prod = prod * (x - x[i-1])
    const newProd = new Array<number>(n).fill(0);
    const xi1 = x[i - 1] ?? 0;
    for (let k = 0; k < n; k++) {
      const pk = prod[k] ?? 0;
      if (pk === 0) continue;
      // pk * x^(k+1)
      if (k + 1 < n) newProd[k + 1] = (newProd[k + 1] ?? 0) + pk;
      // pk * (-x[i-1]) * x^k
      newProd[k] = (newProd[k] ?? 0) - pk * xi1;
    }
    for (let k = 0; k < n; k++) {
      prod[k] = newProd[k] ?? 0;
    }
    // result += coefs[i] * prod
    const ci = coefs[i] ?? 0;
    for (let k = 0; k < n; k++) {
      result[k] = (result[k] ?? 0) + ci * (prod[k] ?? 0);
    }
  }

  return result;
}

function coeffsToExpression(coeffs: number[]): string {
  const terms: string[] = [];
  for (let j = 0; j < coeffs.length; j++) {
    const c = coeffs[j] ?? 0;
    if (Math.abs(c) < 1e-12) continue;
    const cStr = c.toPrecision(12);
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

export const LagrangeBlock: BlockDefinition = {
  id: "opt.lagrange",
  label: "Lagrange Interpolation",
  symbol: "L(x)",
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
      label: "L(x) (interpolating polynomial)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const xVal = inputs.x;
    const yVal = inputs.y;

    if (xVal === undefined) throw new LagrangeError("opt.lagrange: sample points x is required");
    if (yVal === undefined) throw new LagrangeError("opt.lagrange: values y is required");

    const x = xVal.payload as ReadonlyArray<number>;
    const y = yVal.payload as ReadonlyArray<number>;

    if (x.length !== y.length) {
      throw new LagrangeError(
        `opt.lagrange: x and y must have the same length (got ${x.length} and ${y.length})`,
      );
    }
    if (x.length === 0) {
      throw new LagrangeError("opt.lagrange: at least one data point is required");
    }

    const coefs = dividedDifferences(x, y);
    const monomials = newtonToMonomial(coefs, x);
    const expression = coeffsToExpression(monomials);

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
        blockId: "opt.lagrange",
        inputs: ["x", "y"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Constructs the unique polynomial of degree ≤ n−1 passing exactly through n data points (x₀,y₀), …, (xₙ₋₁,yₙ₋₁) using Newton's divided differences.",
    why: "Lagrange interpolation gives the unique lowest-degree polynomial through a set of points. Useful for reconstructing functions from tabulated values or for smooth joins between data points. The Newton form is numerically stable and O(n²) to compute.",
    effect: (inputs) => {
      if (inputs.x === undefined || inputs.y === undefined)
        return "Connect sample points x and values y.";
      const n = (inputs.x.payload as ReadonlyArray<number>).length;
      return `Computing degree-${n - 1} interpolating polynomial through ${n} points...`;
    },
    impact: (_inputs, output) => {
      const { expression } = output.payload as unknown as FunctionPayload;
      return `L(x) = ${expression}`;
    },
  },
};
