import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { FunctionPayload, MathValue } from "~/math/types";

export class SeriesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeriesError";
  }
}

export async function computeSeries(
  inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const fn = inputs.fn;
  if (fn === undefined) {
    throw new SeriesError("calc.series requires a function input (the general term aₙ)");
  }
  if (fn.type.kind !== "Function") {
    throw new SeriesError(`calc.series requires a Function input, got ${fn.type.kind}`);
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const indexVar =
    typeof params.index === "string" && params.index.trim()
      ? params.index.trim()
      : (fnPayload.variables[0] ?? "n");

  const from =
    inputs.from !== undefined && typeof inputs.from.payload === "number"
      ? Math.round(inputs.from.payload)
      : typeof params.from === "number"
        ? Math.round(params.from)
        : 0;

  const to =
    inputs.to !== undefined && typeof inputs.to.payload === "number"
      ? Math.round(inputs.to.payload)
      : typeof params.to === "number"
        ? Math.round(params.to)
        : 10;

  // Use SymPy sympify to evaluate the partial sum symbolically.
  // We build a summation expression: Sum(aₙ, (n, from, to))
  const sumExpr = `Sum(${fnPayload.expression}, (${indexVar}, ${from}, ${to})).doit()`;

  let resultStr: string;
  try {
    resultStr = await pyClient.sympify(sumExpr, fnPayload.variables as string[]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new SeriesError(`SymPy series summation failed: ${msg}`);
  }

  const numeric = Number(resultStr);
  if (Number.isFinite(numeric)) {
    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: numeric,
      provenance: {
        blockId: "calc.series",
        inputs: ["fn"],
        computedAt: Date.now(),
        engine: "sympy",
      },
    };
  }

  const outputPayload: FunctionPayload = {
    expression: resultStr,
    variables: [],
  };

  return {
    type: {
      kind: "Function",
      arity: 0,
      domain: { kind: "Scalar", field: "real", precision: "approximate" },
      codomain: { kind: "Scalar", field: "real", precision: "approximate" },
    },
    payload: outputPayload as unknown as number,
    provenance: {
      blockId: "calc.series",
      inputs: ["fn"],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
