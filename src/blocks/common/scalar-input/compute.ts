// `core.scalar-input` compute kernel — same shape as `core.constant`'s
// output but tagged for interactive use. The Phase-1 difference is
// purely metadata (intended UI: slider with min/max/step); compute() is
// identical so the evaluator treats it the same way.

import type { ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export function computeScalarInput(params: ResolvedParams): MathValue {
  const raw = params.value;
  const value = typeof raw === "number" ? raw : Number(raw ?? 0);
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: Number.isFinite(value) ? value : 0,
    provenance: {
      blockId: "core.scalar-input",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
