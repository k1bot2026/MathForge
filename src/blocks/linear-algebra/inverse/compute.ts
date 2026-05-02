import { det, inv } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class InverseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InverseError";
  }
}

export function computeInverse(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new InverseError("inverse requires input A");
  }
  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  if (m !== n) {
    throw new InverseError(`Inverse is only defined for square matrices; got ${m}×${n}`);
  }
  const d = det(rows as number[][]) as number;
  if (Math.abs(d) < 1e-10) {
    throw new InverseError(
      `Matrix is singular (det ≈ ${d.toExponential(2)}); inverse does not exist`,
    );
  }
  const result = inv(rows as number[][]) as number[][];
  const normalized = result.map((row) => row.map((x) => (x === 0 ? 0 : x)));
  return {
    type: { kind: "Matrix", m, n, field: "real" },
    payload: normalized,
    provenance: {
      blockId: "la.inverse",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
