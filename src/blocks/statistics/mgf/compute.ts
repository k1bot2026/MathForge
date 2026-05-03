import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { ExpressionPayload, MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";

export class MgfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MgfError";
  }
}

export async function computeMgf(
  inputs: ResolvedInputs,
  _params: ResolvedParams,
): Promise<MathValue> {
  const dist = inputs.distribution;
  if (dist === undefined) {
    throw new MgfError("stats.mgf requires a distribution input");
  }
  if (dist.type.kind !== "Distribution") {
    throw new MgfError("stats.mgf input must be a Distribution value");
  }

  const distPayload = dist.payload as unknown as DistributionPayload;
  // DistributionParameters uses string literal families; cast covers future custom families.
  const family = distPayload.parameters.family as unknown as string;

  // Extract numeric parameters for the SymPy code generator
  const params: Record<string, number> = {};
  const p = distPayload.parameters;
  if ("p" in p && typeof p.p === "number") params.p = p.p;
  if ("n" in p && typeof p.n === "number") params.n = p.n;
  if ("mu" in p && typeof p.mu === "number") params.mu = p.mu;
  if ("sigma" in p && typeof p.sigma === "number") params.sigma = p.sigma;
  if ("lambda" in p && typeof p.lambda === "number") params.lambda = p.lambda;
  if ("a" in p && typeof p.a === "number") params.a = p.a;
  if ("b" in p && typeof p.b === "number") params.b = p.b;
  if ("alpha" in p && typeof p.alpha === "number") params.alpha = p.alpha;
  if ("beta" in p && typeof p.beta === "number") params.beta = p.beta;

  let serialized: string;
  try {
    serialized = await pyClient.mgf(family, params);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new MgfError(`SymPy MGF computation failed: ${msg}`);
  }

  const payload: ExpressionPayload = {
    form: "sympy",
    serialized,
    freeVars: ["t"],
  };

  return {
    type: { kind: "Expression", freeVars: ["t"] },
    payload: payload as unknown as number,
    provenance: {
      blockId: "stats.mgf",
      inputs: [dist.provenance.blockId],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
