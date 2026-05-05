import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";

export class NewtonOptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NewtonOptError";
  }
}

const H = 1e-5;

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

function numericalGradient(
  expression: string,
  variables: ReadonlyArray<string>,
  x: number[],
): number[] {
  return variables.map((_, i) => {
    const xFwd = [...x];
    const xBwd = [...x];
    xFwd[i] = (x[i] ?? 0) + H;
    xBwd[i] = (x[i] ?? 0) - H;
    return (evalFn(expression, variables, xFwd) - evalFn(expression, variables, xBwd)) / (2 * H);
  });
}

// Numerical Hessian via finite differences of the gradient
function numericalHessian(
  expression: string,
  variables: ReadonlyArray<string>,
  x: number[],
): number[][] {
  const n = variables.length;
  return Array.from({ length: n }, (_, i) => {
    const xFwd = [...x];
    const xBwd = [...x];
    xFwd[i] = (x[i] ?? 0) + H;
    xBwd[i] = (x[i] ?? 0) - H;
    const gFwd = numericalGradient(expression, variables, xFwd);
    const gBwd = numericalGradient(expression, variables, xBwd);
    return Array.from({ length: n }, (__, j) => ((gFwd[j] ?? 0) - (gBwd[j] ?? 0)) / (2 * H));
  });
}

// Solve H·d = -g via Gaussian elimination with partial pivoting (n×n system)
function solveLinear(H: number[][], g: number[]): number[] | null {
  const n = g.length;
  const aug: number[][] = H.map((row, i) => [...row, -(g[i] ?? 0)]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row]?.[col] ?? 0) > Math.abs(aug[maxRow]?.[col] ?? 0)) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow] ?? [], aug[col] ?? []];

    const pivot = aug[col]?.[col] ?? 0;
    if (Math.abs(pivot) < 1e-12) return null; // singular Hessian

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = (aug[row]?.[col] ?? 0) / pivot;
      for (let k = col; k <= n; k++) {
        const r = aug[row];
        const c = aug[col];
        if (r !== undefined && c !== undefined) r[k] = (r[k] ?? 0) - factor * (c[k] ?? 0);
      }
    }
  }

  return Array.from({ length: n }, (_, i) => {
    const pivot = aug[i]?.[i] ?? 1;
    return (aug[i]?.[n] ?? 0) / pivot;
  });
}

function newtonMethod(
  expression: string,
  variables: ReadonlyArray<string>,
  x0: number[],
  maxIter: number,
  tolerance: number,
): { x: number[]; value: number } {
  const x = [...x0];
  const n = variables.length;

  for (let iter = 0; iter < maxIter; iter++) {
    const grad = numericalGradient(expression, variables, x);
    let gradNorm = 0;
    for (let i = 0; i < n; i++) gradNorm += (grad[i] ?? 0) ** 2;
    if (Math.sqrt(gradNorm) < tolerance) break;

    const hess = numericalHessian(expression, variables, x);
    const direction = solveLinear(hess, grad);

    if (direction === null) {
      // Hessian singular — fall back to gradient descent step
      for (let i = 0; i < n; i++) x[i] = (x[i] ?? 0) - 0.01 * (grad[i] ?? 0);
    } else {
      for (let i = 0; i < n; i++) x[i] = (x[i] ?? 0) + (direction[i] ?? 0);
    }
  }

  return { x, value: evalFn(expression, variables, x) };
}

export const NewtonOptBlock: BlockDefinition = {
  id: "opt.newton",
  label: "Newton's Method",
  symbol: "N↓",
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
      default: 100,
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

    if (fn === undefined) throw new NewtonOptError("opt.newton: objective function fn is required");
    if (x0 === undefined) throw new NewtonOptError("opt.newton: initial point x0 is required");

    const fnPayload = fn.payload as unknown as FunctionPayload;
    const x0Vals = x0.payload as VectorPayload;

    const maxIter = typeof params.max_iter === "number" ? Math.round(params.max_iter) : 100;
    const tolerance = typeof params.tolerance === "number" ? params.tolerance : 1e-8;

    const { x, value } = newtonMethod(
      fnPayload.expression,
      fnPayload.variables,
      Array.from(x0Vals as ReadonlyArray<number>),
      maxIter,
      tolerance,
    );

    const xOut: MathValue = {
      type: { kind: "Vector", n: x.length, field: "real" },
      payload: x as VectorPayload,
      provenance: {
        blockId: "opt.newton",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };

    const valOut: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: value,
      provenance: {
        blockId: "opt.newton",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
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
        blockId: "opt.newton",
        inputs: ["fn", "x0"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Minimizes f(x) using Newton's method with numerical Hessian. Each step solves H·d = -∇f for the Newton direction d, then updates x ← x + d. Falls back to a gradient descent step when the Hessian is singular.",
    why: "Newton's method has quadratic convergence near the optimum — it finds the minimum of a quadratic function in one step. Faster than gradient descent for smooth strongly-convex objectives.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.x0 === undefined)
        return "Connect a Function and initial Vector x₀.";
      const fnPayload = inputs.fn.payload as unknown as FunctionPayload;
      const n = fnPayload.variables.length;
      return `Newton's method on f: ℝ${n} → ℝ. Computing...`;
    },
    impact: (_inputs, output) => {
      const [xOut, valOut] = output.payload as [MathValue, MathValue];
      const n = xOut ? (xOut.payload as VectorPayload).length : 0;
      const val = valOut ? (valOut.payload as number) : 0;
      return `Minimum x ∈ ℝ${n}, f(x*) = ${val.toPrecision(6)}.`;
    },
  },
};
