import type { MathValue, SetPayload } from "~/math/types";

export class SetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetError";
  }
}

const INTEGER_TYPE = { kind: "Scalar", field: "integer", precision: "exact" } as const;

/**
 * Builds a Set<Scalar(integer)> from raw integer elements.
 * Deduplicates by value; preserves first-occurrence order in the output.
 */
export function computeSet(elements: ReadonlyArray<unknown>): MathValue {
  const seen = new Set<number>();
  const deduped: MathValue[] = [];

  for (const raw of elements) {
    const n =
      typeof raw === "number" ? Math.round(raw) : typeof raw === "string" ? parseInt(raw, 10) : NaN;
    if (!Number.isFinite(n)) continue;
    if (!seen.has(n)) {
      seen.add(n);
      deduped.push({
        type: INTEGER_TYPE,
        payload: n,
        provenance: { blockId: "discrete.set", inputs: [], computedAt: 0, engine: "native" },
      });
    }
  }

  const payload: SetPayload = deduped;

  return {
    type: { kind: "Set", element: INTEGER_TYPE },
    payload,
    provenance: {
      blockId: "discrete.set",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
