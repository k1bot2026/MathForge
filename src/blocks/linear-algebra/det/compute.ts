import { det } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class DetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DetError";
  }
}

export function computeDet(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new DetError("det requires input A");
  }
  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  if (m !== n) {
    throw new DetError(`Determinant is only defined for square matrices; got ${m}×${n}`);
  }
  const d = det(rows as number[][]) as number;
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: d === 0 ? 0 : d,
    provenance: {
      blockId: "la.det",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
