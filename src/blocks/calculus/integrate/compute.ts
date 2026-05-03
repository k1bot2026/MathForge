import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { FunctionPayload, MathValue } from "~/math/types";

export class IntegrateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrateError";
  }
}

export async function computeIntegrate(
  inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const fn = inputs.fn;
  if (fn === undefined) {
    throw new IntegrateError("calc.integrate requires a function input");
  }
  if (fn.type.kind !== "Function") {
    throw new IntegrateError(`calc.integrate requires a Function input, got ${fn.type.kind}`);
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const integVar =
    typeof params.variable === "string" && params.variable.trim()
      ? params.variable.trim()
      : (fnPayload.variables[0] ?? "x");

  let resultExpr: string;
  try {
    resultExpr = await pyClient.integrate(
      fnPayload.expression,
      fnPayload.variables as string[],
      integVar,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new IntegrateError(`SymPy integrate failed: ${msg}`);
  }

  const outputPayload: FunctionPayload = {
    expression: resultExpr,
    variables: fnPayload.variables,
  };

  return {
    type: fn.type,
    payload: outputPayload as unknown as number,
    provenance: {
      blockId: "calc.integrate",
      inputs: ["fn"],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
