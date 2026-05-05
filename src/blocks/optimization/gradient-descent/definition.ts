import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";

export class GradientDescentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GradientDescentError";
  }
}

const FINITE_DIFF_H = 1e-5;

// SymPy str() uses Python ** for exponentiation; mathjs uses ^.
function toMathjsExpr(expression: string): string {
  return expression.replace(/\*\*/g, "^");
}

function evalFn(expression: string, variables: ReadonlyArray<string>, x: number[]): number {
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

// Numerical gradient via central finite differences
function numericalGradient(
  expression: string,
  variables: ReadonlyArray<string>,
  x: number[],
): number[] {
  const n = variables.length;
  const grad = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const xFwd = [...x];
    const xBwd = [...x];
    xFwd[i] = (x[i] ?? 0) + FINITE_DIFF_H;
    xBwd[i] = (x[i] ?? 0) - FINITE_DIFF_H;
    grad[i] =
      (evalFn(expression, variables, xFwd) - evalFn(expression, variables, xBwd)) /
      (2 * FINITE_DIFF_H);
  }
  return grad;
}

function gradientDescent(
  expression: string,
  variables: ReadonlyArray<string>,
  x0: number[],
  learningRate: number,
  maxIter: number,
  tolerance: number,
): { x: number[]; value: number } {
  const x = [...x0];
  const n = variables.length;

  for (let iter = 0; iter < maxIter; iter++) {
    const grad = numericalGradient(expression, variables, x);
    let gradNorm = 0;
    for (let i = 0; i < n; i++) gradNorm += (grad[i] ?? 0) ** 2;
    gradNorm = Math.sqrt(gradNorm);

    if (gradNorm < tolerance) break;

    for (let i = 0; i < n; i++) {
      x[i] = (x[i] ?? 0) - learningRate * (grad[i] ?? 0);
    }
  }

  return { x, value: evalFn(expression, variables, x) };
}

export const GradientDescentBlock: BlockDefinition = {
  id: "opt.gradient-descent",
  label: "Gradient Descent",
  symbol: "∇↓",
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
    learning_rate: {
      kind: "number",
      default: 0.01,
      min: 1e-6,
      max: 10,
      step: 0.001,
      label: "Learning Rate",
    },
    max_iter: {
      kind: "integer",
      default: 1000,
      min: 1,
      max: 100_000,
      label: "Max Iterations",
    },
    tolerance: {
      kind: "number",
      default: 1e-6,
      min: 1e-12,
      max: 1,
      step: 1e-7,
      label: "Tolerance",
    },
  },
  compute(inputs, params): MathValue {
    const fn = inputs.fn;
    const x0 = inputs.x0;

    if (fn === undefined)
      throw new GradientDescentError("opt.gradient-descent: objective function fn is required");
    if (x0 === undefined)
      throw new GradientDescentError("opt.gradient-descent: initial point x0 is required");

    const fnPayload = fn.payload as unknown as FunctionPayload;
    const { expression, variables } = fnPayload;
    const x0Vals = x0.payload as VectorPayload;

    if (variables.length !== x0Vals.length) {
      throw new GradientDescentError(
        `opt.gradient-descent: fn has ${variables.length} variables but x0 has ${x0Vals.length} components`,
      );
    }

    const learningRate = typeof params.learning_rate === "number" ? params.learning_rate : 0.01;
    const maxIter = typeof params.max_iter === "number" ? Math.round(params.max_iter) : 1000;
    const tolerance = typeof params.tolerance === "number" ? params.tolerance : 1e-6;

    const { x, value } = gradientDescent(
      expression,
      variables,
      Array.from(x0Vals as ReadonlyArray<number>),
      learningRate,
      maxIter,
      tolerance,
    );

    const xOut: MathValue = {
      type: { kind: "Vector", n: x.length, field: "real" },
      payload: x as VectorPayload,
      provenance: {
        blockId: "opt.gradient-descent",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };

    const valOut: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: value,
      provenance: {
        blockId: "opt.gradient-descent",
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
        blockId: "opt.gradient-descent",
        inputs: ["fn", "x0"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Minimizes f(x) using gradient descent with fixed learning rate. Computes the gradient numerically via central finite differences at each step. Stops when the gradient norm falls below tolerance or max iterations is reached.",
    why: "Gradient descent is the foundation of modern machine learning optimizers. Each step xₜ₊₁ = xₜ − α·∇f(xₜ) moves in the direction of steepest descent. For convex f, convergence to the global minimum is guaranteed.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.x0 === undefined)
        return "Connect a Function and initial Vector x₀.";
      const fnPayload = inputs.fn.payload as unknown as FunctionPayload;
      const n = fnPayload.variables.length;
      return `Minimizing f: ℝ${n} → ℝ via gradient descent. Computing...`;
    },
    impact: (_inputs, output) => {
      const [xOut, valOut] = output.payload as [MathValue, MathValue];
      const n = xOut ? (xOut.payload as VectorPayload).length : 0;
      const val = valOut ? (valOut.payload as number) : 0;
      return `Minimum x ∈ ℝ${n}, f(x*) = ${val.toPrecision(6)}.`;
    },
  },
};
