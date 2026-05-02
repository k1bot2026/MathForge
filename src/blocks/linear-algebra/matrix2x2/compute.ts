import type { ResolvedParams } from "~/blocks/types";
import type { MathValue } from "~/math/types";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function computeMatrix2x2(params: ResolvedParams): MathValue {
  return {
    type: { kind: "Matrix", m: 2, n: 2, field: "real" },
    payload: [
      [num(params.a), num(params.b)],
      [num(params.c), num(params.d)],
    ],
    provenance: {
      blockId: "la.matrix2x2",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
