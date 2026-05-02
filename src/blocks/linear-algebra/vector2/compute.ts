import type { ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function computeVector2(params: ResolvedParams): MathValue {
  return {
    type: { kind: "Vector", n: 2, field: "real" },
    payload: [num(params.x), num(params.y)],
    provenance: {
      blockId: "la.vector2",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
