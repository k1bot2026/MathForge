import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { FunctionPayload, MathValue } from "~/math/types";

export class FunctionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FunctionError";
  }
}

export async function computeFunction(
  _inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const expression = typeof params.expression === "string" ? params.expression.trim() : "";
  const variable = typeof params.variable === "string" ? params.variable.trim() : "x";

  if (!expression) {
    throw new FunctionError("calc.function requires a non-empty expression");
  }
  if (!variable) {
    throw new FunctionError("calc.function requires a non-empty variable name");
  }

  let canonical: string;
  try {
    canonical = await pyClient.sympify(expression, [variable]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new FunctionError(`Invalid expression: ${msg}`);
  }

  const payload: FunctionPayload = {
    expression: canonical,
    variables: [variable],
  };

  const scalarType = {
    kind: "Scalar" as const,
    field: "real" as const,
    precision: "approximate" as const,
  };

  return {
    type: {
      kind: "Function",
      arity: 1,
      domain: scalarType,
      codomain: scalarType,
    },
    payload: payload as unknown as number,
    provenance: {
      blockId: "calc.function",
      inputs: [],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
