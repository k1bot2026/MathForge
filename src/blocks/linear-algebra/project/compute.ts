import { det, inv, multiply, transpose } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class ProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectError";
  }
}

const EPS = 1e-10;

export function computeProject(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  const v = inputs.v;

  if (A === undefined) {
    throw new ProjectError("project requires input A");
  }
  if (v === undefined) {
    throw new ProjectError("project requires input v");
  }

  const Arows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = Arows.length;
  const vArr = v.payload as ReadonlyArray<number>;

  if (vArr.length !== m) {
    throw new ProjectError(`Dimension mismatch: A has ${m} rows but v has length ${vArr.length}`);
  }

  // Compute AᵀA (n×n matrix).
  const At = transpose(Arows as number[][]) as number[][];
  const AtA = multiply(At, Arows as number[][]) as number[][];

  // AᵀA must be invertible for the projection formula to be valid.
  const d = det(AtA) as number;
  if (Math.abs(d) < EPS) {
    throw new ProjectError(
      `Columns of A are linearly dependent (det(AᵀA) ≈ ${d.toExponential(2)}); projection is not uniquely defined via A·(AᵀA)⁻¹·Aᵀ`,
    );
  }

  const AtAinv = inv(AtA) as number[][];

  // P·v = A · (AᵀA)⁻¹ · Aᵀ · v
  const Atv = multiply(At, vArr as number[]) as number[];
  const AtAinvAtv = multiply(AtAinv, Atv) as number[];
  const Pv = multiply(Arows as number[][], AtAinvAtv) as number[];

  const result = Pv.map((x) => (x === 0 || Math.abs(x) < EPS ? 0 : x));

  return {
    type: { kind: "Vector", n: m, field: "real" },
    payload: result,
    provenance: {
      blockId: "la.project",
      inputs: [A.provenance.blockId, v.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
