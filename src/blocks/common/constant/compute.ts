// `core.constant` compute kernel — kept separate from the BlockDefinition
// so it can be exercised by unit + property tests without dragging the
// React component, registry, or evaluator into scope.

import type { ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export function computeConstant(params: ResolvedParams): MathValue {
  const raw = params.value;
  const value = typeof raw === "number" ? raw : Number(raw ?? 0);
  return {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: Number.isFinite(value) ? value : 0,
    provenance: {
      blockId: "core.constant",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
