import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";

export class BfgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BfgsError";
  }
}

const FINITE_H = 1e-5;

function toMathjsExpr(expression: string): string {
  return expression.replace(/\*\*/g, "^");
}

function evalFn(
  expression: string,
  variables: ReadonlyArray<string>,
  x: ReadonlyArray<number>,
): number {
  const scope: Record<string, number> = {};
  for (let i = 0; i < variables.length; i++) scope[variables[i] ?? ""] = x[i] ?? 0;
  try {
    const result = mathjsEvaluate(toMathjsExpr(expression), scope);
    return typeof result === "number" && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

function gradient(expression: string, variables: ReadonlyArray<string>, x: number[]): number[] {
  return variables.map((_, i) => {
    const xFwd = [...x];
    const xBwd = [...x];
    xFwd[i] = (x[i] ?? 0) + FINITE_H;
    xBwd[i] = (x[i] ?? 0) - FINITE_H;
    return (
      (evalFn(expression, variables, xFwd) - evalFn(expression, variables, xBwd)) / (2 * FINITE_H)
    );
  });
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
}

// BFGS Hessian inverse update: H_{k+1}^{-1} = (I - ρ*s*yᵀ) H_k^{-1} (I - ρ*y*sᵀ) + ρ*s*sᵀ
// where s = x_{k+1} - x_k,  y = g_{k+1} - g_k,  ρ = 1 / (yᵀs)
function bfgsUpdate(H: number[][], s: number[], y: number[]): number[][] {
  const n = s.length;
  const ys = dot(y, s);
  if (Math.abs(ys) < 1e-15) return H; // skip update if curvature too small

  const rho = 1 / ys;

  // Compute H*y
  const Hy: number[] = Array.from(
    { length: n },
    (_, i) => H[i]?.reduce((sum, hij, j) => sum + hij * (y[j] ?? 0), 0) ?? 0,
  );

  // Updated H^-1 via rank-2 BFGS formula
  const result: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      const hij = H[i]?.[j] ?? 0;
      const term1 = -rho * (s[i] ?? 0) * (Hy[j] ?? 0);
      const term2 = -rho * (Hy[i] ?? 0) * (s[j] ?? 0);
      const term3 = rho * rho * dot(y, Hy) * (s[i] ?? 0) * (s[j] ?? 0);
      const term4 = rho * (s[i] ?? 0) * (s[j] ?? 0);
      return hij + term1 + term2 + term3 + term4;
    }),
  );
  return result;
}

function identityMatrix(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)),
  );
}

function matvec(M: number[][], v: number[]): number[] {
  return M.map((row) => row.reduce((sum, mij, j) => sum + mij * (v[j] ?? 0), 0));
}

function backtrack(
  expression: string,
  variables: ReadonlyArray<string>,
  x: number[],
  direction: number[],
  fx: number,
  gradDotDir: number,
): number {
  let alpha = 1.0;
  const c1 = 1e-4;
  for (let i = 0; i < 50; i++) {
    const xNew = x.map((xi, j) => xi + alpha * (direction[j] ?? 0));
    const fNew = evalFn(expression, variables, xNew);
    if (fNew <= fx + c1 * alpha * gradDotDir) break;
    alpha *= 0.5;
  }
  return alpha;
}

function bfgsOptimize(
  expression: string,
  variables: ReadonlyArray<string>,
  x0: number[],
  maxIter: number,
  tolerance: number,
): { x: number[]; value: number } {
  const n = variables.length;
  const x = [...x0];
  let H = identityMatrix(n); // H approximates H^-1
  const g = gradient(expression, variables, x);

  for (let iter = 0; iter < maxIter; iter++) {
    const gradNorm = Math.sqrt(dot(g, g));
    if (gradNorm < tolerance) break;

    // Descent direction: d = -H * g
    const direction = matvec(H, g).map((v) => -v);
    const gradDotDir = dot(g, direction);
    if (gradDotDir >= 0) {
      // Not a descent direction — reset to steepest descent
      for (let i = 0; i < n; i++) direction[i] = -(g[i] ?? 0);
    }

    const fx = evalFn(expression, variables, x);
    const alpha = backtrack(expression, variables, x, direction, fx, dot(g, direction));

    const s = direction.map((di) => alpha * di);
    const xNew = x.map((xi, i) => xi + (s[i] ?? 0));
    const gNew = gradient(expression, variables, xNew);
    const y = gNew.map((gi, i) => gi - (g[i] ?? 0));

    H = bfgsUpdate(H, s, y);

    for (let i = 0; i < n; i++) {
      x[i] = xNew[i] ?? 0;
      g[i] = gNew[i] ?? 0;
    }
  }

  return { x, value: evalFn(expression, variables, x) };
}

export const BfgsBlock: BlockDefinition = {
  id: "opt.bfgs",
  label: "BFGS",
  symbol: "BFGS",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "fn",
      label: "f (objective)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "x0",
      label: "x₀ (initial point)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "result",
      label: "Result",
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Vector", n: "any", field: "real" },
          { kind: "Scalar", field: "real", precision: "approximate" },
        ],
      },
    },
  ],
  params: {
    max_iter: {
      kind: "integer",
      default: 200,
      min: 1,
      max: 10_000,
      label: "Max Iterations",
    },
    tolerance: {
      kind: "number",
      default: 1e-8,
      min: 1e-15,
      max: 1,
      label: "Tolerance",
    },
  },
  compute(inputs, params): MathValue {
    const fn = inputs.fn;
    const x0 = inputs.x0;

    if (fn === undefined) throw new BfgsError("opt.bfgs: objective function fn is required");
    if (x0 === undefined) throw new BfgsError("opt.bfgs: initial point x0 is required");

    const fnPayload = fn.payload as unknown as FunctionPayload;
    const x0Vals = x0.payload as VectorPayload;

    const maxIter = typeof params.max_iter === "number" ? Math.round(params.max_iter) : 200;
    const tolerance = typeof params.tolerance === "number" ? params.tolerance : 1e-8;

    const { x, value } = bfgsOptimize(
      fnPayload.expression,
      fnPayload.variables,
      Array.from(x0Vals as ReadonlyArray<number>),
      maxIter,
      tolerance,
    );

    const xOut: MathValue = {
      type: { kind: "Vector", n: x.length, field: "real" },
      payload: x as VectorPayload,
      provenance: { blockId: "opt.bfgs", inputs: [], computedAt: Date.now(), engine: "native" },
    };

    const valOut: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: value,
      provenance: { blockId: "opt.bfgs", inputs: [], computedAt: Date.now(), engine: "native" },
    };

    return {
      type: {
        kind: "Tuple",
        elements: [
          { kind: "Vector", n: x.length, field: "real" },
          { kind: "Scalar", field: "real", precision: "approximate" },
        ],
      },
      payload: [xOut, valOut],
      provenance: {
        blockId: "opt.bfgs",
        inputs: ["fn", "x0"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Minimizes f(x) using the BFGS quasi-Newton method. Builds an approximation to the inverse Hessian using gradient differences (rank-2 Broyden–Fletcher–Goldfarb–Shanno update) and uses backtracking line search for step size.",
    why: "BFGS achieves superlinear convergence without requiring explicit Hessian computation. More robust than steepest gradient descent for smooth objectives and more scalable than full Newton when n is large.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.x0 === undefined)
        return "Connect a Function and initial Vector x₀.";
      const fnPayload = inputs.fn.payload as unknown as FunctionPayload;
      const n = fnPayload.variables.length;
      return `BFGS optimization on f: ℝ${n} → ℝ. Computing...`;
    },
    impact: (_inputs, output) => {
      const [xOut, valOut] = output.payload as [MathValue, MathValue];
      const n = xOut ? (xOut.payload as VectorPayload).length : 0;
      const val = valOut ? (valOut.payload as number) : 0;
      return `Minimum x ∈ ℝ${n}, f(x*) = ${val.toPrecision(6)}.`;
    },
  },
};
