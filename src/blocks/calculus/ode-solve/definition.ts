import type { BlockDefinition } from "~/blocks/types";
import type { ExpressionPayload, FunctionPayload } from "~/math/types";
import { computeOdeSolve } from "./compute";

export const OdeSolveBlock: BlockDefinition = {
  id: "calc.ode-solve",
  label: "ODE Solve",
  symbol: "dy/dx",
  category: "operation",
  domain: "calculus",
  determinism: "pure",
  stability: "beta",
  engine: "sympy",
  color: "function",
  inputs: [
    {
      id: "x0",
      label: "x₀",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "y0",
      label: "y₀",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
  ],
  outputs: [
    {
      id: "solution",
      label: "y(x)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],
  params: {
    ode: { kind: "string", default: "y' - y", label: "ODE" },
    depVar: { kind: "string", default: "y", label: "y var" },
    indepVar: { kind: "string", default: "x", label: "x var" },
    x0: { kind: "number", default: 0, label: "x₀ (param)" },
    y0: { kind: "number", default: 1, label: "y₀ (param)" },
  },
  compute: (inputs, params) => computeOdeSolve(inputs, params),
  explain: {
    what: "Solves a first or second-order ODE symbolically via SymPy dsolve(). The ODE is specified as a SymPy Eq() or in shorthand prime notation (y' - y). Optional initial conditions y(x₀) = y₀ pin the arbitrary constant. Returns a Function if the solution is explicit, or an Expression if implicit/piecewise.",
    why: "Use to model exponential growth/decay (y' = ky), damped oscillations (y'' + 2ζy' + y = 0), or any ODE with a SymPy closed-form solution. Connect the output Function to viz.taylor or viz.tangent to visualise the solution.",
    effect: (_inputs, output) => {
      if (output.type.kind === "Function") {
        const p = output.payload as unknown as FunctionPayload;
        return `y(${p.variables[0] ?? "x"}) = ${p.expression}`;
      }
      if (output.type.kind === "Expression") {
        const p = output.payload as unknown as ExpressionPayload;
        return `[implicit] ${p.serialized}`;
      }
      return "ODE solution";
    },
  },
};
