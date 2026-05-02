import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class TransposeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransposeError";
  }
}

export function computeTranspose(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new TransposeError("transpose requires input A");
  }
  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  // Build n×m result: result[j][i] = rows[i][j]
  const result: number[][] = Array.from({ length: n }, (_, j) =>
    Array.from({ length: m }, (_, i) => {
      const v = rows[i]?.[j] ?? 0;
      // Collapse -0 to +0 for consistent equality semantics.
      return v === 0 ? 0 : v;
    }),
  );
  return {
    type: { kind: "Matrix", m: n, n: m, field: "real" },
    payload: result,
    provenance: {
      blockId: "la.transpose",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
