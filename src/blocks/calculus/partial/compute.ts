import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { FunctionPayload, MathValue } from "~/math/types";

export class PartialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartialError";
  }
}

export async function computePartial(
  inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const fn = inputs.fn;
  if (fn === undefined) {
    throw new PartialError("calc.partial requires a function input");
  }
  if (fn.type.kind !== "Function") {
    throw new PartialError(`calc.partial requires a Function input, got ${fn.type.kind}`);
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;

  // Differentiation variable is required for partials (unlike derivative which infers)
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
    throw new PartialError(`SymPy partial diff failed: ${msg}`);
  }

  const outputPayload: FunctionPayload = {
    expression: resultExpr,
    variables: fnPayload.variables,
  };

  return {
    type: fn.type,
    payload: outputPayload as unknown as number,
    provenance: {
      blockId: "calc.partial",
      inputs: ["fn"],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
