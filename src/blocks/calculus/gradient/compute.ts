import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { FunctionPayload, MathValue, VectorPayload } from "~/math/types";

export class GradientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GradientError";
  }
}

export async function computeGradient(
  inputs: ResolvedInputs,
  _params: ResolvedParams,
): Promise<MathValue> {
  const fn = inputs.fn;
  if (fn === undefined) {
    throw new GradientError("calc.gradient requires a function input");
  }
  if (fn.type.kind !== "Function") {
    throw new GradientError(`calc.gradient requires a Function input, got ${fn.type.kind}`);
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const variables = fnPayload.variables as string[];

  if (variables.length === 0) {
    throw new GradientError("calc.gradient requires a function with at least one variable");
  }

  // Compute ∂f/∂xᵢ for each variable. SymPy returns a numeric string for
  // constants; we parse to number for the vector payload.
  let partials: string[];
  try {
    partials = await Promise.all(
      variables.map((v) => pyClient.diff(fnPayload.expression, variables, v)),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new GradientError(`SymPy gradient computation failed: ${msg}`);
  }

  // Represent each partial as an approximate scalar (NaN if non-numeric symbolic)
  const components: VectorPayload = partials.map((p) => {
    const n = Number(p);
    return Number.isFinite(n) ? n : Number.NaN;
  });

  return {
    type: { kind: "Vector", n: variables.length, field: "real" },
    payload: components,
    provenance: {
      blockId: "calc.gradient",
      inputs: ["fn"],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
