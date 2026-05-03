import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { FunctionPayload, MathValue } from "~/math/types";

export class DefiniteIntegrateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DefiniteIntegrateError";
  }
}

export async function computeDefiniteIntegrate(
  inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const fn = inputs.fn;
  if (fn === undefined) {
    throw new DefiniteIntegrateError("calc.definite-integrate requires a function input");
  }
  if (fn.type.kind !== "Function") {
    throw new DefiniteIntegrateError(
      `calc.definite-integrate requires a Function input, got ${fn.type.kind}`,
    );
  }

  const a =
    inputs.a !== undefined && typeof inputs.a.payload === "number"
      ? inputs.a.payload
      : typeof params.a === "number"
        ? params.a
        : 0;
  const b =
    inputs.b !== undefined && typeof inputs.b.payload === "number"
      ? inputs.b.payload
      : typeof params.b === "number"
        ? params.b
        : 1;

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const integVar =
    typeof params.variable === "string" && params.variable.trim()
      ? params.variable.trim()
      : (fnPayload.variables[0] ?? "x");

  let result: number;
  try {
    result = await pyClient.definiteIntegrate(
      fnPayload.expression,
      fnPayload.variables as string[],
      integVar,
      a,
      b,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new DefiniteIntegrateError(`SymPy definite integrate failed: ${msg}`);
  }

  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: result,
    provenance: {
      blockId: "calc.definite-integrate",
      inputs: ["fn"],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
