import { qr } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class QrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrError";
  }
}

export type QrPayload = {
  Q: number[][];
  R: number[][];
};

const EPS = 1e-12;

function normalize(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

function toArray(m: number[][] | { toArray(): number[][] }): number[][] {
  return "toArray" in m ? m.toArray() : (m as number[][]);
}

export function computeQr(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new QrError("qr requires input A");
  }
  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;

  const { Q, R } = qr(rows as number[][]) as {
    Q: number[][] | { toArray(): number[][] };
    R: number[][] | { toArray(): number[][] };
  };

  const Qarr = toArray(Q).map((row) => row.map(normalize));
  const Rarr = toArray(R).map((row) => row.map(normalize));

  // Q is always m×m; R is m×n.
  const payload: QrPayload = { Q: Qarr, R: Rarr };

  return {
    type: {
      kind: "Tuple",
      elements: [
        { kind: "Matrix", m, n: m, field: "real" },
        { kind: "Matrix", m, n, field: "real" },
      ],
    },
    payload: payload as unknown as number[][],
    provenance: {
      blockId: "la.qr",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
