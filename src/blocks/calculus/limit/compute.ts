import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { ExpressionPayload, FunctionPayload, MathValue } from "~/math/types";

export class LimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitError";
  }
}

export async function computeLimit(
  inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const fn = inputs.fn;
  if (fn === undefined) {
    throw new LimitError("calc.limit requires a function input");
  }
  if (fn.type.kind !== "Function") {
    throw new LimitError(`calc.limit requires a Function input, got ${fn.type.kind}`);
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const limitVar =
    typeof params.variable === "string" && params.variable.trim()
      ? params.variable.trim()
      : (fnPayload.variables[0] ?? "x");

  // point: prefer input scalar, fall back to param, fall back to 0
  const point: number | string =
    inputs.point !== undefined && typeof inputs.point.payload === "number"
      ? inputs.point.payload
      : typeof params.point === "number"
        ? params.point
        : typeof params.point === "string" && params.point.trim()
          ? params.point.trim()
          : 0;

  let resultStr: string;
  try {
    resultStr = await pyClient.limit(
      fnPayload.expression,
      fnPayload.variables as string[],
      limitVar,
      point,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new LimitError(`SymPy limit failed: ${msg}`);
  }

  // If SymPy returns a pure number string, return a Scalar. Otherwise Expression.
  const numeric = Number(resultStr);
  if (Number.isFinite(numeric)) {
    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: numeric,
      provenance: {
        blockId: "calc.limit",
        inputs: ["fn"],
        computedAt: Date.now(),
        engine: "sympy",
      },
    };
  }

  const exprPayload: ExpressionPayload = {
    form: "sympy",
    serialized: resultStr,
    freeVars: [],
  };
  return {
    type: { kind: "Expression", freeVars: [] },
    payload: exprPayload as unknown as number,
    provenance: {
      blockId: "calc.limit",
      inputs: ["fn"],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
