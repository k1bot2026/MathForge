import { det, lusolve } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class SolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SolveError";
  }
}

const EPS = 1e-10;

export function computeSolve(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  const b = inputs.b;
  if (A === undefined) {
    throw new SolveError("solve requires input A");
  }
  if (b === undefined) {
    throw new SolveError("solve requires input b");
  }

  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  if (m !== n) {
    throw new SolveError(`solve requires a square matrix; got ${m}×${n}`);
  }

  const bVec = b.payload as ReadonlyArray<number>;
  if (bVec.length !== n) {
    throw new SolveError(`Dimension mismatch: A is ${n}×${n} but b has ${bVec.length} element(s)`);
  }

  const d = det(rows as number[][]) as number;
  if (Math.abs(d) < EPS) {
    throw new SolveError(
      `Matrix is singular (det ≈ ${d.toExponential(2)}); system may have no solution or infinitely many`,
    );
  }

  let raw: number[][];
  try {
    raw = lusolve(rows as number[][], bVec as number[]) as number[][];
  } catch (err) {
    throw new SolveError(
      `Linear system cannot be solved: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // lusolve returns column vector [[x0],[x1],...]; flatten to 1-D
  const result = raw.map((row) => {
    const val = row[0] ?? 0;
    return val === 0 ? 0 : val;
  });

  return {
    type: { kind: "Vector", n, field: "real" },
    payload: result,
    provenance: {
      blockId: "la.solve",
      inputs: [A.provenance.blockId, b.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
