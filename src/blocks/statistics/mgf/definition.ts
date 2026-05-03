import type { BlockDefinition } from "~/blocks/types";
import type { ExpressionPayload } from "~/math/types";
import { computeMgf } from "./compute";

export const MgfBlock: BlockDefinition = {
  id: "stats.mgf",
  label: "MGF",
  symbol: "M_X(t)",
  category: "operation",
  domain: "statistics",
  determinism: "pure",
  stability: "beta",
  engine: "sympy",
  color: "function",
  inputs: [
    {
      id: "distribution",
      label: "Distribution",
      type: { kind: "Distribution", family: "Normal" },
    },
  ],
  outputs: [
    {
      id: "mgf",
      label: "MGF",
      type: { kind: "Expression", freeVars: ["t"] },
    },
  ],
  compute: (inputs, params) => computeMgf(inputs, params),
  explain: {
    what: "Computes the moment generating function M_X(t) = E[e^{tX}] symbolically via SymPy. Returns a symbolic expression in t.",
    why: "The MGF uniquely characterises a distribution. Its k-th derivative at t=0 equals E[X^k], so all moments are recoverable from a single formula.",
    effect: (inputs, output) => {
      if (inputs.distribution === undefined) return "Connect a distribution to compute its MGF.";
      const payload = output.payload as unknown as ExpressionPayload;
      return `M_X(t) = ${payload.serialized}`;
    },
    impact: (_inputs, output) => {
      const payload = output.payload as unknown as ExpressionPayload;
      return `Expression in t: ${payload.serialized}. Differentiate at t=0 to recover moments.`;
    },
  },
};
