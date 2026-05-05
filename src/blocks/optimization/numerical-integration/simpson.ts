import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

export class SimpsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimpsonError";
  }
}

function evalAt(expression: string, variable: string, x: number): number {
  try {
    const result = mathjsEvaluate(expression.replace(/\*\*/g, "^"), { [variable]: x });
    return typeof result === "number" && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

export const SimpsonBlock: BlockDefinition = {
  id: "opt.simpson",
  label: "Simpson's Rule",
  symbol: "∫≈S",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "fn",
      label: "f (function)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "a",
      label: "a (lower bound)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    {
      id: "b",
      label: "b (upper bound)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  outputs: [
    {
      id: "integral",
      label: "∫f(x)dx",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {
    n: {
      kind: "integer",
      default: 1000,
      min: 2,
      max: 1_000_000,
      label: "Subintervals (n, must be even)",
    },
  },
  compute(inputs, params): MathValue {
    const fn = inputs.fn;
    const aVal = inputs.a;
    const bVal = inputs.b;

    if (fn === undefined) throw new SimpsonError("opt.simpson: function fn is required");
    if (aVal === undefined) throw new SimpsonError("opt.simpson: lower bound a is required");
    if (bVal === undefined) throw new SimpsonError("opt.simpson: upper bound b is required");

    const { expression, variables } = fn.payload as unknown as FunctionPayload;
    const variable = variables[0] ?? "x";
    const a = aVal.payload as number;
    const b = bVal.payload as number;
    // Simpson's rule requires an even number of subintervals
    let n = typeof params.n === "number" ? Math.max(2, Math.round(params.n)) : 1000;
    if (n % 2 !== 0) n += 1;

    const h = (b - a) / n;
    let sum = evalAt(expression, variable, a) + evalAt(expression, variable, b);
    for (let i = 1; i < n; i++) {
      const coeff = i % 2 === 0 ? 2 : 4;
      sum += coeff * evalAt(expression, variable, a + i * h);
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: (h / 3) * sum,
      provenance: {
        blockId: "opt.simpson",
        inputs: ["fn", "a", "b"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Approximates ∫ₐᵇ f(x) dx using the composite Simpson's 1/3 rule with n subintervals (n must be even). Error is O(h⁴) = O((b−a)⁴/n⁴) — much more accurate than the trapezoidal rule.",
    why: "Simpson's rule fits a parabola through each pair of subintervals, giving fourth-order accuracy vs. the trapezoidal rule's second-order. For smooth functions, it's the standard first choice.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.a === undefined || inputs.b === undefined)
        return "Connect function f and bounds a, b.";
      const a = inputs.a.payload as number;
      const b = inputs.b.payload as number;
      return `Integrating f on [${a}, ${b}] using Simpson's rule...`;
    },
    impact: (_inputs, output) => `∫f(x)dx ≈ ${(output.payload as number).toPrecision(10)}`,
  },
};
