import { lup } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class LuError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LuError";
  }
}

export type LuPayload = {
  L: number[][];
  U: number[][];
  P: number[][];
};

const EPS = 1e-12;

function normalize(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

export function computeLu(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new LuError("lu requires input A");
  }
  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  if (m !== n) {
    throw new LuError(`LU decomposition requires a square matrix; got ${m}×${n}`);
  }

  const { L, U, p } = lup(rows as number[][]) as {
    L: number[][] | { toArray(): number[][] };
    U: number[][] | { toArray(): number[][] };
    p: number[];
  };

  // Normalise mathjs matrix objects (have .toArray()) or plain arrays.
  const toLodash = (m: number[][] | { toArray(): number[][] }): number[][] =>
    "toArray" in m ? m.toArray() : (m as number[][]);

  // Convert permutation index vector p to a permutation matrix P.
  // math.js lup() returns p such that P[p[i]][i] = 1 (column-permutation indexing).
  const P: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    const pi = p[i];
    const Prow = pi !== undefined ? P[pi] : undefined;
    if (Prow !== undefined) Prow[i] = 1;
  }

  const Larr = toLodash(L).map((row) => row.map(normalize));
  const Uarr = toLodash(U).map((row) => row.map(normalize));

  const payload: LuPayload = { L: Larr, U: Uarr, P };

  return {
    type: {
      kind: "Tuple",
      elements: [
        { kind: "Matrix", m, n, field: "real" },
        { kind: "Matrix", m, n, field: "real" },
        { kind: "Matrix", m, n, field: "real" },
      ],
    },
    payload: payload as unknown as number[][],
    provenance: {
      blockId: "la.lu",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
