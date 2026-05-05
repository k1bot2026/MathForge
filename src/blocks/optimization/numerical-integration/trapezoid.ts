import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

export class TrapezoidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrapezoidError";
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

export const TrapezoidBlock: BlockDefinition = {
  id: "opt.trapezoid",
  label: "Trapezoidal Rule",
  symbol: "∫≈Σ",
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
    n: { kind: "integer", default: 1000, min: 1, max: 1_000_000, label: "Subintervals (n)" },
  },
  compute(inputs, params): MathValue {
    const fn = inputs.fn;
    const aVal = inputs.a;
    const bVal = inputs.b;

    if (fn === undefined) throw new TrapezoidError("opt.trapezoid: function fn is required");
    if (aVal === undefined) throw new TrapezoidError("opt.trapezoid: lower bound a is required");
    if (bVal === undefined) throw new TrapezoidError("opt.trapezoid: upper bound b is required");

    const { expression, variables } = fn.payload as unknown as FunctionPayload;
    const variable = variables[0] ?? "x";
    const a = aVal.payload as number;
    const b = bVal.payload as number;
    const n = typeof params.n === "number" ? Math.max(1, Math.round(params.n)) : 1000;

    const h = (b - a) / n;
    let sum = evalAt(expression, variable, a) + evalAt(expression, variable, b);
    for (let i = 1; i < n; i++) {
      sum += 2 * evalAt(expression, variable, a + i * h);
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: (h / 2) * sum,
      provenance: {
        blockId: "opt.trapezoid",
        inputs: ["fn", "a", "b"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Approximates ∫ₐᵇ f(x) dx using the composite trapezoidal rule with n subintervals. Error is O(h²) = O((b−a)²/n²).",
    why: "The trapezoidal rule is the simplest numerical integrator. Use Simpson's rule or Gauss quadrature for higher accuracy at the same function-evaluation count.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.a === undefined || inputs.b === undefined)
        return "Connect function f and bounds a, b.";
      const a = inputs.a.payload as number;
      const b = inputs.b.payload as number;
      return `Integrating f on [${a}, ${b}] using trapezoidal rule...`;
    },
    impact: (_inputs, output) => `∫f(x)dx ≈ ${(output.payload as number).toPrecision(10)}`,
  },
};
