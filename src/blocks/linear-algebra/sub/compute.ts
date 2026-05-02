import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class SubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubError";
  }
}

export function computeSub(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  const B = inputs.B;
  if (A === undefined || B === undefined) {
    throw new SubError("sub requires both A and B inputs");
  }
  const ap = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const bp = B.payload as ReadonlyArray<ReadonlyArray<number>>;
  const am = ap.length;
  const an = ap[0]?.length ?? 0;
  const bm = bp.length;
  const bn = bp[0]?.length ?? 0;
  if (am !== bm || an !== bn) {
    throw new SubError(`Shape mismatch: A is ${am}×${an}, B is ${bm}×${bn}`);
  }
  const result: number[][] = ap.map((row, i) =>
    row.map((x, j) => {
      const r = x - (bp[i]?.[j] ?? 0);
      return r === 0 ? 0 : r;
    }),
  );
  return {
    type: { kind: "Matrix", m: am, n: an, field: "real" },
    payload: result,
    provenance: {
      blockId: "la.sub",
      inputs: [A.provenance.blockId, B.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
