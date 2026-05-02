import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class TraceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TraceError";
  }
}

export function computeTrace(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new TraceError("trace requires input A");
  }
  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  if (m !== n) {
    throw new TraceError(`Trace is only defined for square matrices; got ${m}×${n}`);
  }
  let sum = 0;
  for (let i = 0; i < m; i++) {
    sum += rows[i]?.[i] ?? 0;
  }
  return {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: sum === 0 ? 0 : sum,
    provenance: {
      blockId: "la.trace",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
