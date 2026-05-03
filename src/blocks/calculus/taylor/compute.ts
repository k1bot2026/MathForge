import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { FunctionPayload, MathValue } from "~/math/types";

export class TaylorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaylorError";
  }
}

export async function computeTaylor(
  inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const fn = inputs.fn;
  if (fn === undefined) {
    throw new TaylorError("calc.taylor requires a function input");
  }
  if (fn.type.kind !== "Function") {
    throw new TaylorError(`calc.taylor requires a Function input, got ${fn.type.kind}`);
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const seriesVar =
    typeof params.variable === "string" && params.variable.trim()
      ? params.variable.trim()
      : (fnPayload.variables[0] ?? "x");

  const center =
    inputs.center !== undefined && typeof inputs.center.payload === "number"
      ? inputs.center.payload
      : typeof params.center === "number"
        ? params.center
        : 0;

  const rawOrder =
    inputs.order !== undefined && typeof inputs.order.payload === "number"
      ? Math.round(inputs.order.payload)
      : typeof params.order === "number"
        ? Math.round(params.order)
        : 5;
  const order = Math.max(1, rawOrder);

  let resultExpr: string;
  try {
    resultExpr = await pyClient.taylor(
      fnPayload.expression,
      fnPayload.variables as string[],
      seriesVar,
      center,
      order,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new TaylorError(`SymPy taylor failed: ${msg}`);
  }

  const outputPayload: FunctionPayload = {
    expression: resultExpr,
    variables: fnPayload.variables,
  };

  return {
    type: fn.type,
    payload: outputPayload as unknown as number,
    provenance: {
      blockId: "calc.taylor",
      inputs: ["fn"],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
