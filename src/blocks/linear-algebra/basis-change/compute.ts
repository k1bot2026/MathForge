import { det, inv, multiply } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class BasisChangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BasisChangeError";
  }
}

const EPS = 1e-10;

export function computeBasisChange(inputs: ResolvedInputs): MathValue {
  const T = inputs.T;
  const P = inputs.P;
  if (T === undefined) throw new BasisChangeError("basis-change requires input T");
  if (P === undefined) throw new BasisChangeError("basis-change requires input P");

  const Trows = T.payload as ReadonlyArray<ReadonlyArray<number>>;
  const Prows = P.payload as ReadonlyArray<ReadonlyArray<number>>;
  const n = Trows.length;

  if (Trows[0]?.length !== n) {
    throw new BasisChangeError(`T must be square; got ${n}×${Trows[0]?.length ?? 0}`);
  }
  if (Prows.length !== n || Prows[0]?.length !== n) {
    throw new BasisChangeError(
      `P must be ${n}×${n} to match T; got ${Prows.length}×${Prows[0]?.length ?? 0}`,
    );
  }

  const d = det(Prows as number[][]) as number;
  if (Math.abs(d) < EPS) {
    throw new BasisChangeError(
      `Basis matrix P is singular (det ≈ ${d.toExponential(2)}); columns must be linearly independent`,
    );
  }

  const Pinv = inv(Prows as number[][]) as number[][];
  // P⁻¹ · T · P
  const TP = multiply(Trows as number[][], Prows as number[][]) as number[][];
  const result = multiply(Pinv, TP) as number[][];

  return {
    type: { kind: "Matrix", m: n, n, field: "real" },
    payload: result,
    provenance: {
      blockId: "la.basis-change",
      inputs: [T.provenance.blockId, P.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
