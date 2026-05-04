import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { ExpressionPayload, FunctionPayload, MathValue } from "~/math/types";

export class OdeSolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OdeSolveError";
  }
}

/**
 * Normalises a user-supplied ODE string into a SymPy Eq() expression.
 *
 * Accepts:
 *   - Already-valid Eq(…): passed through unchanged.
 *   - Primed notation: y'' - y = 0  →  Derivative(y(x), x, 2) - y(x) = 0.
 *   - Plain expression (LHS of LHS = 0): e.g. "y' - y" → "Eq(Derivative(y(x), x) - y(x), 0)".
 *
 * The result is a Python expression string safe to embed directly in runPython code.
 */
function normaliseOde(expression: string, depVar: string, indepVar: string): string {
  const trimmed = expression.trim();
  if (trimmed.startsWith("Eq(")) return trimmed;

  // Handle explicit "lhs = rhs" notation
  const eqIdx = trimmed.indexOf("=");
  let lhs: string;
  let rhs: string;
  if (eqIdx !== -1 && trimmed[eqIdx - 1] !== "!" && trimmed[eqIdx + 1] !== "=") {
    lhs = trimmed.slice(0, eqIdx).trim();
    rhs = trimmed.slice(eqIdx + 1).trim();
  } else {
    lhs = trimmed;
    rhs = "0";
  }

  // Normalise primed notation → SymPy Derivative
  function expandPrimes(s: string): string {
    return s
      .replace(/\b([a-zA-Z_]\w*)'''/g, `Derivative($1(${indepVar}), ${indepVar}, 3)`)
      .replace(/\b([a-zA-Z_]\w*)''/g, `Derivative($1(${indepVar}), ${indepVar}, 2)`)
      .replace(/\b([a-zA-Z_]\w*)'/g, `Derivative($1(${indepVar}), ${indepVar})`);
  }

  // Make bare dep-var references into function calls: y → y(x)
  function addCallSyntax(s: string): string {
    // Only replace word-boundary occurrences not already followed by ( or '
    const re = new RegExp(`\\b${depVar}\\b(?!\\s*[('"])`, "g");
    return s.replace(re, `${depVar}(${indepVar})`);
  }

  const normLhs = addCallSyntax(expandPrimes(lhs));
  const normRhs = addCallSyntax(expandPrimes(rhs));
  return `Eq(${normLhs}, ${normRhs})`;
}

export async function computeOdeSolve(
  inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const odeParam = typeof params.ode === "string" ? params.ode.trim() : "";
  if (!odeParam) {
    throw new OdeSolveError("calc.ode-solve requires an ODE expression in the ode parameter");
  }

  const depVar =
    typeof params.depVar === "string" && params.depVar.trim() ? params.depVar.trim() : "y";
  const indepVar =
    typeof params.indepVar === "string" && params.indepVar.trim() ? params.indepVar.trim() : "x";

  const odeExpr = normaliseOde(odeParam, depVar, indepVar);

  // Optional initial condition y(x0) = y0
  const x0 =
    inputs.x0 !== undefined && typeof inputs.x0.payload === "number"
      ? inputs.x0.payload
      : typeof params.x0 === "number"
        ? params.x0
        : undefined;
  const y0 =
    inputs.y0 !== undefined && typeof inputs.y0.payload === "number"
      ? inputs.y0.payload
      : typeof params.y0 === "number"
        ? params.y0
        : undefined;

  const ics = x0 !== undefined && y0 !== undefined ? { x0, y0 } : undefined;

  let result: { rhs: string; implicit: boolean };
  try {
    result = await pyClient.dsolve(odeExpr, depVar, indepVar, ics);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new OdeSolveError(`SymPy ODE solve failed: ${msg}`);
  }

  const inputKeys = ics !== undefined ? ["x0", "y0"] : [];

  if (result.implicit) {
    // Implicit or piecewise solution — surface as Expression
    const exprPayload: ExpressionPayload = {
      form: "sympy",
      serialized: result.rhs,
      freeVars: [indepVar],
    };
    return {
      type: { kind: "Expression", freeVars: [indepVar] },
      payload: exprPayload as unknown as number,
      provenance: {
        blockId: "calc.ode-solve",
        inputs: inputKeys,
        computedAt: Date.now(),
        engine: "sympy",
      },
    };
  }

  // Explicit solution: y(x) = rhs  →  Function(arity=1)
  const fnPayload: FunctionPayload = {
    expression: result.rhs,
    variables: [indepVar],
  };
  return {
    type: {
      kind: "Function",
      arity: 1,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: fnPayload as unknown as number,
    provenance: {
      blockId: "calc.ode-solve",
      inputs: inputKeys,
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
