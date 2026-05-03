import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { FunctionPayload, MathValue } from "~/math/types";

export class DerivativeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DerivativeError";
  }
}

export async function computeDerivative(
  inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const fn = inputs.fn;
  if (fn === undefined) {
    throw new DerivativeError("calc.derivative requires a function input");
  }
  if (fn.type.kind !== "Function") {
    throw new DerivativeError(`calc.derivative requires a Function input, got ${fn.type.kind}`);
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const diffVar =
    typeof params.variable === "string" && params.variable.trim()
      ? params.variable.trim()
      : (fnPayload.variables[0] ?? "x");

  let resultExpr: string;
  try {
    resultExpr = await pyClient.diff(
      fnPayload.expression,
      fnPayload.variables as string[],
      diffVar,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new DerivativeError(`SymPy diff failed: ${msg}`);
  }

  const outputPayload: FunctionPayload = {
    expression: resultExpr,
    variables: fnPayload.variables,
  };

  return {
    type: fn.type,
    payload: outputPayload as unknown as number,
    provenance: {
      blockId: "calc.derivative",
      inputs: ["fn"],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
