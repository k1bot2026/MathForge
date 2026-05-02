import type { MathValue } from "~/math/types";

function toFinite(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Builds an N-dimensional real vector from an array of component values.
 * Components beyond the provided array default to 0; non-finite values coerce to 0.
 */
export function computeVector(n: number, components: ReadonlyArray<unknown>): MathValue {
  const payload: number[] = Array.from({ length: n }, (_, i) => toFinite(components[i]));
  return {
    type: { kind: "Vector", n, field: "real" },
    payload,
    provenance: {
      blockId: "la.vector",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
