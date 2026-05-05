import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

export class GaussQuadratureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GaussQuadratureError";
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

// Gauss-Legendre nodes and weights for n = 2..10 on [-1,1].
// Source: Abramowitz & Stegun tables 25.4 (truncated to machine precision).
const GL_RULES: Readonly<Record<number, { nodes: number[]; weights: number[] }>> = {
  2: {
    nodes: [-0.5773502691896257, 0.5773502691896257],
    weights: [1, 1],
  },
  3: {
    nodes: [-0.7745966692414834, 0, 0.7745966692414834],
    weights: [0.5555555555555556, 0.8888888888888888, 0.5555555555555556],
  },
  4: {
    nodes: [-0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526],
    weights: [0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538],
  },
  5: {
    nodes: [-0.906179845938664, -0.5384693101056831, 0, 0.5384693101056831, 0.906179845938664],
    weights: [
      0.2369268850561891, 0.4786286704993665, 0.5688888888888889, 0.4786286704993665,
      0.2369268850561891,
    ],
  },
  6: {
    nodes: [
      -0.9324695142031521, -0.6612093864662645, -0.2386191860831969, 0.2386191860831969,
      0.6612093864662645, 0.9324695142031521,
    ],
    weights: [
      0.1713244923791704, 0.3607615730481386, 0.467913934572691, 0.467913934572691,
      0.3607615730481386, 0.1713244923791704,
    ],
  },
  7: {
    nodes: [
      -0.9491079123427585, -0.7415311855993945, -0.4058451513773972, 0, 0.4058451513773972,
      0.7415311855993945, 0.9491079123427585,
    ],
    weights: [
      0.1294849661688697, 0.2797053914892767, 0.3818300505051189, 0.4179591836734694,
      0.3818300505051189, 0.2797053914892767, 0.1294849661688697,
    ],
  },
  8: {
    nodes: [
      -0.9602898564975363, -0.7966664774136267, -0.525532409916329, -0.1834346424956498,
      0.1834346424956498, 0.525532409916329, 0.7966664774136267, 0.9602898564975363,
    ],
    weights: [
      0.1012285362903763, 0.2223810344533745, 0.3137066458778873, 0.362683783378362,
      0.362683783378362, 0.3137066458778873, 0.2223810344533745, 0.1012285362903763,
    ],
  },
  9: {
    nodes: [
      -0.9681602395076261, -0.8360311073266358, -0.6133714327005904, -0.3242534234038089, 0,
      0.3242534234038089, 0.6133714327005904, 0.8360311073266358, 0.9681602395076261,
    ],
    weights: [
      0.0812743883615744, 0.1806481606948574, 0.2606106964029354, 0.3123470770400029,
      0.3302393550012598, 0.3123470770400029, 0.2606106964029354, 0.1806481606948574,
      0.0812743883615744,
    ],
  },
  10: {
    nodes: [
      -0.9739065285171717, -0.8650633666889845, -0.6794095682990244, -0.4333953941292472,
      -0.1488743389816312, 0.1488743389816312, 0.4333953941292472, 0.6794095682990244,
      0.8650633666889845, 0.9739065285171717,
    ],
    weights: [
      0.0666713443086881, 0.1494513491505806, 0.219086362515982, 0.2692667193099963,
      0.2955242247147529, 0.2955242247147529, 0.2692667193099963, 0.219086362515982,
      0.1494513491505806, 0.0666713443086881,
    ],
  },
};

export const GaussQuadratureBlock: BlockDefinition = {
  id: "opt.gauss-quadrature",
  label: "Gauss-Legendre Quadrature",
  symbol: "∫≈GL",
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
    order: {
      kind: "integer",
      default: 5,
      min: 2,
      max: 10,
      label: "GL Order (2–10)",
    },
  },
  compute(inputs, params): MathValue {
    const fn = inputs.fn;
    const aVal = inputs.a;
    const bVal = inputs.b;

    if (fn === undefined)
      throw new GaussQuadratureError("opt.gauss-quadrature: function fn is required");
    if (aVal === undefined)
      throw new GaussQuadratureError("opt.gauss-quadrature: lower bound a is required");
    if (bVal === undefined)
      throw new GaussQuadratureError("opt.gauss-quadrature: upper bound b is required");

    const { expression, variables } = fn.payload as unknown as FunctionPayload;
    const variable = variables[0] ?? "x";
    const a = aVal.payload as number;
    const b = bVal.payload as number;
    const order =
      typeof params.order === "number" ? Math.min(10, Math.max(2, Math.round(params.order))) : 5;

    const rule = GL_RULES[order];
    if (rule === undefined) {
      throw new GaussQuadratureError(`opt.gauss-quadrature: unsupported order ${order}`);
    }

    // Change of variable from [-1,1] to [a,b]: x = (b-a)/2 * t + (a+b)/2
    const halfLen = (b - a) / 2;
    const midpoint = (a + b) / 2;

    let sum = 0;
    for (let i = 0; i < rule.nodes.length; i++) {
      const t = rule.nodes[i] ?? 0;
      const w = rule.weights[i] ?? 0;
      const x = halfLen * t + midpoint;
      sum += w * evalAt(expression, variable, x);
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: halfLen * sum,
      provenance: {
        blockId: "opt.gauss-quadrature",
        inputs: ["fn", "a", "b"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Approximates ∫ₐᵇ f(x) dx using Gauss-Legendre quadrature of order n (2–10). Exact for polynomials of degree ≤ 2n−1. No subintervals needed — O(n) function evaluations.",
    why: "Gauss-Legendre quadrature is optimal among all n-point formulas for smooth functions: it achieves degree 2n−1 exactness vs. degree n−1 for equally-spaced nodes. Use for expensive-to-evaluate smooth integrands.",
    effect: (inputs) => {
      if (inputs.fn === undefined || inputs.a === undefined || inputs.b === undefined)
        return "Connect function f and bounds a, b.";
      const a = inputs.a.payload as number;
      const b = inputs.b.payload as number;
      return `Integrating f on [${a}, ${b}] using Gauss-Legendre quadrature...`;
    },
    impact: (_inputs, output) => `∫f(x)dx ≈ ${(output.payload as number).toPrecision(10)}`,
  },
};
