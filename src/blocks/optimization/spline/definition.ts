import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

export class SplineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplineError";
  }
}

export type SplineCoefficients = {
  x: number[];
  a: number[]; // f(xᵢ)
  b: number[]; // first-order coefficient
  c: number[]; // second-order coefficient
  d: number[]; // third-order coefficient
};

const SPLINE_TAG = "__spline_v1__:";

export function isSplineExpression(expression: string): boolean {
  return expression.startsWith(SPLINE_TAG);
}

export function encodeSpline(coeffs: SplineCoefficients): string {
  return SPLINE_TAG + JSON.stringify(coeffs);
}

export function decodeSpline(expression: string): SplineCoefficients {
  return JSON.parse(expression.slice(SPLINE_TAG.length)) as SplineCoefficients;
}

export function evaluateSplineAt(expression: string, x: number): number {
  const { x: xs, a, b, c, d } = decodeSpline(expression);
  const n = xs.length - 1;
  // Clamp to endpoints for out-of-range x
  if (x <= (xs[0] ?? 0)) {
    const dx = x - (xs[0] ?? 0);
    return (a[0] ?? 0) + (b[0] ?? 0) * dx + (c[0] ?? 0) * dx * dx + (d[0] ?? 0) * dx * dx * dx;
  }
  if (x >= (xs[n] ?? 0)) {
    const i = n - 1;
    const dx = x - (xs[i] ?? 0);
    return (a[i] ?? 0) + (b[i] ?? 0) * dx + (c[i] ?? 0) * dx * dx + (d[i] ?? 0) * dx * dx * dx;
  }
  // Binary search for the interval
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((xs[mid + 1] ?? 0) < x) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const i = lo;
  const dx = x - (xs[i] ?? 0);
  return (a[i] ?? 0) + (b[i] ?? 0) * dx + (c[i] ?? 0) * dx * dx + (d[i] ?? 0) * dx * dx * dx;
}

/**
 * Computes natural cubic spline coefficients.
 * Natural boundary conditions: S''(x₀) = S''(xₙ) = 0.
 * Uses the tridiagonal Thomas algorithm.
 */
function computeNaturalCubicSpline(
  x: ReadonlyArray<number>,
  y: ReadonlyArray<number>,
): SplineCoefficients {
  const n = x.length - 1;
  const h = Array.from({ length: n }, (_, i) => (x[i + 1] ?? 0) - (x[i] ?? 0));

  // Set up tridiagonal system for second derivatives M[0..n]
  // Natural BCs: M[0] = M[n] = 0
  const size = n - 1;
  if (size <= 0) {
    // Only 2 points — linear spline
    const slope = ((y[1] ?? 0) - (y[0] ?? 0)) / (h[0] ?? 1);
    return {
      x: x.slice() as number[],
      a: [y[0] ?? 0],
      b: [slope],
      c: [0],
      d: [0],
    };
  }

  const diag = Array.from({ length: size }, (_, i) => 2 * ((h[i] ?? 0) + (h[i + 1] ?? 0)));
  const lower = Array.from({ length: size - 1 }, (_, i) => h[i + 1] ?? 0);
  const upper = lower.slice();
  const rhs = Array.from({ length: size }, (_, i) => {
    const i1 = i + 1;
    return (
      6 *
      (((y[i1 + 1] ?? 0) - (y[i1] ?? 0)) / (h[i1] ?? 1) -
        ((y[i1] ?? 0) - (y[i1 - 1] ?? 0)) / (h[i1 - 1] ?? 1))
    );
  });

  // Thomas algorithm (forward sweep + back substitution)
  const diagCopy = diag.slice();
  const rhsCopy = rhs.slice();
  for (let i = 1; i < size; i++) {
    const factor = (lower[i - 1] ?? 0) / (diagCopy[i - 1] ?? 1);
    diagCopy[i] = (diagCopy[i] ?? 0) - factor * (upper[i - 1] ?? 0);
    rhsCopy[i] = (rhsCopy[i] ?? 0) - factor * (rhsCopy[i - 1] ?? 0);
  }

  const M = new Array<number>(n + 1).fill(0);
  M[size] = (rhsCopy[size - 1] ?? 0) / (diagCopy[size - 1] ?? 1);
  for (let i = size - 2; i >= 0; i--) {
    M[i + 1] = ((rhsCopy[i] ?? 0) - (upper[i] ?? 0) * (M[i + 2] ?? 0)) / (diagCopy[i] ?? 1);
  }
  // M[0] = M[n] = 0 already set

  // Compute coefficients for each segment [xᵢ, xᵢ₊₁]
  const a = Array.from({ length: n }, (_, i) => y[i] ?? 0);
  const b = Array.from({ length: n }, (_, i) => {
    const hi = h[i] ?? 1;
    return ((y[i + 1] ?? 0) - (y[i] ?? 0)) / hi - (hi / 6) * (2 * (M[i] ?? 0) + (M[i + 1] ?? 0));
  });
  const c = Array.from({ length: n }, (_, i) => (M[i] ?? 0) / 2);
  const d = Array.from(
    { length: n },
    (_, i) => ((M[i + 1] ?? 0) - (M[i] ?? 0)) / (6 * (h[i] ?? 1)),
  );

  return { x: x.slice() as number[], a, b, c, d };
}

export const SplineBlock: BlockDefinition = {
  id: "opt.spline",
  label: "Cubic Spline",
  symbol: "S(x)",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "x",
      label: "x (knots)",
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
      id: "spline",
      label: "S(x) (cubic spline)",
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

    if (xVal === undefined) throw new SplineError("opt.spline: knot vector x is required");
    if (yVal === undefined) throw new SplineError("opt.spline: value vector y is required");

    const x = xVal.payload as ReadonlyArray<number>;
    const y = yVal.payload as ReadonlyArray<number>;

    if (x.length !== y.length) {
      throw new SplineError(
        `opt.spline: x and y must have the same length (got ${x.length} and ${y.length})`,
      );
    }
    if (x.length < 2) {
      throw new SplineError("opt.spline: at least 2 data points are required");
    }

    // Verify x is strictly increasing
    for (let i = 1; i < x.length; i++) {
      if ((x[i] ?? 0) <= (x[i - 1] ?? 0)) {
        throw new SplineError(
          `opt.spline: x must be strictly increasing; got x[${i - 1}]=${x[i - 1]}, x[${i}]=${x[i]}`,
        );
      }
    }

    const coeffs = computeNaturalCubicSpline(x, y);
    const expression = encodeSpline(coeffs);

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
        blockId: "opt.spline",
        inputs: ["x", "y"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Fits a natural cubic spline S(x) through n data points. Between each pair of knots, S(x) is a cubic polynomial. At the knots: S(xᵢ) = yᵢ, S is C² continuous, and S''(x₀) = S''(xₙ) = 0 (natural boundary conditions).",
    why: "Cubic splines are the standard tool for smooth interpolation. They minimize the total bending energy ∫(S'')² dx subject to interpolation constraints, giving visually smooth curves without Runge's phenomenon from high-degree polynomials.",
    effect: (inputs) => {
      if (inputs.x === undefined || inputs.y === undefined)
        return "Connect knot vector x and value vector y.";
      const n = (inputs.x.payload as ReadonlyArray<number>).length;
      return `Computing natural cubic spline through ${n} points...`;
    },
    impact: (_inputs, output) => {
      const { expression } = output.payload as unknown as FunctionPayload;
      const coeffs = decodeSpline(expression);
      const n = coeffs.x.length;
      return `Cubic spline: ${n - 1} piece(s), x ∈ [${(coeffs.x[0] ?? 0).toPrecision(4)}, ${(coeffs.x[n - 1] ?? 0).toPrecision(4)}]`;
    },
  },
};
