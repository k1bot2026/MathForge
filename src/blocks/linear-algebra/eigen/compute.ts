import { eigs, isComplex } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class EigenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EigenError";
  }
}

export type EigenPayload = {
  /** Eigenvalues in the order returned by mathjs eigs(). */
  eigenvalues: number[];
  /**
   * Eigenvectors as column vectors packed into an n×n matrix:
   * column k is the eigenvector corresponding to eigenvalues[k].
   * This layout is eigenvector-highlight-friendly: extract column k
   * directly as the kth eigenvector.
   */
  eigenvectors: number[][];
};

const EPS = 1e-12;

function normalize(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

export function computeEigen(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new EigenError("eigen requires input A");
  }
  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  if (m !== n) {
    throw new EigenError(`Eigendecomposition requires a square matrix; got ${m}×${n}`);
  }

  const result = eigs(rows as number[][]) as {
    values: unknown[];
    eigenvectors: Array<{ value: unknown; vector: unknown[] }>;
  };

  // Validate all eigenvalues are real (not complex).
  for (const ev of result.eigenvectors) {
    if (isComplex(ev.value)) {
      throw new EigenError(
        "Matrix has complex eigenvalues — la.eigen only supports matrices with real eigenvalues. " +
          "Use a symmetric (self-adjoint) matrix, or expect complex output in a future block.",
      );
    }
    for (const component of ev.vector) {
      if (isComplex(component)) {
        throw new EigenError(
          "Matrix has complex eigenvector components — la.eigen only supports real eigenvectors.",
        );
      }
    }
  }

  const eigenvalues = result.eigenvectors.map((ev) => normalize(ev.value as number));

  // Pack eigenvectors as columns into an n×n matrix.
  const eigenvectors: number[][] = Array.from({ length: n }, (_, row) =>
    result.eigenvectors.map((ev) => normalize((ev.vector[row] ?? 0) as number)),
  );

  const payload: EigenPayload = { eigenvalues, eigenvectors };

  return {
    type: {
      kind: "Tuple",
      elements: [
        { kind: "Vector", n, field: "real" },
        { kind: "Matrix", m: n, n, field: "real" },
      ],
    },
    payload: payload as unknown as number[][],
    provenance: {
      blockId: "la.eigen",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
