import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

export class LineSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LineSearchError";
  }
}

function toMathjsExpr(expression: string): string {
  return expression.replace(/\*\*/g, "^");
}

function evalFnAt(
  expression: string,
  variables: ReadonlyArray<string>,
  x: ReadonlyArray<number>,
): number {
  const scope: Record<string, number> = {};
  for (let i = 0; i < variables.length; i++) {
    scope[variables[i] ?? ""] = x[i] ?? 0;
  }
  try {
    const result = mathjsEvaluate(toMathjsExpr(expression), scope);
    return typeof result === "number" && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

function numericalDirectionalDerivative(
  expression: string,
  variables: ReadonlyArray<string>,
  x: ReadonlyArray<number>,
  direction: ReadonlyArray<number>,
  h = 1e-5,
): number {
  const xFwd = Array.from(x, (xi, i) => xi + h * (direction[i] ?? 0));
  const xBwd = Array.from(x, (xi, i) => xi - h * (direction[i] ?? 0));
  return (evalFnAt(expression, variables, xFwd) - evalFnAt(expression, variables, xBwd)) / (2 * h);
}

// Backtracking Armijo line search.
// Finds α satisfying: f(x + α*d) ≤ f(x) + c1 * α * ∇f(x)·d
function backtrackingLineSearch(
  expression: string,
  variables: ReadonlyArray<string>,
  x: ReadonlyArray<number>,
  direction: ReadonlyArray<number>,
  alpha0: number,
  c1: number,
  rho: number,
  maxIter: number,
): number {
  const fx = evalFnAt(expression, variables, x);
  const slope = numericalDirectionalDerivative(expression, variables, x, direction);

  let alpha = alpha0;
  for (let i = 0; i < maxIter; i++) {
    const xNew = Array.from(x, (xi, j) => xi + alpha * (direction[j] ?? 0));
    const fNew = evalFnAt(expression, variables, xNew);
    if (fNew <= fx + c1 * alpha * slope) break;
    alpha *= rho;
  }
  return alpha;
}

export const LineSearchBlock: BlockDefinition = {
  id: "opt.line-search",
  label: "Line Search",
  symbol: "α",
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
      id: "x",
      label: "x (current point)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
    {
      id: "direction",
      label: "d (search direction)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "alpha",
      label: "α (step size)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {
    alpha0: {
      kind: "number",
      default: 1.0,
      min: 1e-10,
      max: 100,
      label: "Initial α",
    },
    c1: {
      kind: "number",
      default: 1e-4,
      min: 1e-10,
      max: 0.5,
      label: "Sufficient decrease (c₁)",
    },
    rho: {
      kind: "number",
      default: 0.5,
      min: 0.01,
      max: 0.99,
      step: 0.01,
      label: "Backtrack factor (ρ)",
    },
  },
  compute(inputs, params): MathValue {
    const fn = inputs.fn;
    const x = inputs.x;
    const direction = inputs.direction;

    if (fn === undefined)
      throw new LineSearchError("opt.line-search: objective function fn is required");
    if (x === undefined) throw new LineSearchError("opt.line-search: current point x is required");
    if (direction === undefined)
      throw new LineSearchError("opt.line-search: search direction is required");

    const fnPayload = fn.payload as unknown as FunctionPayload;
    const xVals = x.payload as ReadonlyArray<number>;
    const dirVals = direction.payload as ReadonlyArray<number>;

    const alpha0 = typeof params.alpha0 === "number" ? params.alpha0 : 1.0;
    const c1 = typeof params.c1 === "number" ? params.c1 : 1e-4;
    const rho = typeof params.rho === "number" ? params.rho : 0.5;

    const alpha = backtrackingLineSearch(
      fnPayload.expression,
      fnPayload.variables,
      xVals,
      dirVals,
      alpha0,
      c1,
      rho,
      100,
    );

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: alpha,
      provenance: {
        blockId: "opt.line-search",
        inputs: ["fn", "x", "direction"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes a step size α using backtracking line search (Armijo sufficient decrease condition). Starting from α₀, multiplies by ρ until f(x + α·d) ≤ f(x) + c₁·α·∇f(x)·d.",
    why: "Adaptive step size prevents overshoot in gradient descent and Newton's method. The Armijo condition guarantees sufficient decrease at each step, stabilizing convergence.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.x === undefined || inputs.direction === undefined)
        return "Connect objective function f, current point x, and search direction d.";
      return "Running backtracking line search to find step size α...";
    },
    impact: (_inputs, output) => {
      const alpha = output.payload as number;
      return `Step size α = ${alpha.toPrecision(6)}.`;
    },
  },
};
