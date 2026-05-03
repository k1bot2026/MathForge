import { eigs, isComplex } from "mathjs";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class SvdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SvdError";
  }
}

export type SvdPayload = {
  /** Left singular vectors as columns of an m×m orthogonal matrix. */
  U: number[][];
  /** Singular values in descending order, length = min(m,n). */
  S: number[];
  /** Right singular vectors as columns of an n×n orthogonal matrix. */
  V: number[][];
};

const EPS = 1e-10;

function normalize(x: number): number {
  return Math.abs(x) < EPS ? 0 : x;
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const k = B.length;
  const n = B[0]?.length ?? 0;
  return Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      Array.from({ length: k }, (_, l) => (A[i]?.[l] ?? 0) * (B[l]?.[j] ?? 0)).reduce(
        (s, x) => s + x,
        0,
      ),
    ),
  );
}

function matTranspose(A: number[][]): number[][] {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  return Array.from({ length: n }, (_, j) => Array.from({ length: m }, (_, i) => A[i]?.[j] ?? 0));
}

function vecNorm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

/**
 * Complete a set of orthonormal vectors to a full orthonormal basis for R^dim.
 * Input vectors must already be orthonormal to each other.
 * Returns exactly `dim` orthonormal column vectors.
 */
function completeOnb(seed: number[][], dim: number): number[][] {
  const cols: number[][] = seed.map((v) => {
    const n = vecNorm(v);
    return n > EPS ? v.map((x) => x / n) : v;
  });
  for (let e = 0; e < dim && cols.length < dim; e++) {
    let v: number[] = Array.from({ length: dim }, (_, i) => (i === e ? 1 : 0));
    for (const u of cols) {
      const dot = v.reduce((s, x, i) => s + x * (u[i] ?? 0), 0);
      v = v.map((x, i) => x - dot * (u[i] ?? 0));
    }
    const norm = vecNorm(v);
    if (norm > EPS) {
      cols.push(v.map((x) => x / norm));
    }
  }
  return cols;
}

/** Pack column vectors into a row-major 2D array, applying the normalize threshold. */
function packCols(cols: number[][], rows: number): number[][] {
  return Array.from({ length: rows }, (_, row) => cols.map((col) => normalize(col[row] ?? 0)));
}

export function computeSvd(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new SvdError("svd requires input A");
  }
  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  if (m === 0 || n === 0) {
    throw new SvdError(`SVD requires a non-empty matrix; got ${m}×${n}`);
  }

  const Aarr = rows.map((r) => Array.from(r) as number[]);

  // AᵀA is n×n symmetric PSD; eigenvalues = σᵢ².
  const At = matTranspose(Aarr);
  const AtA = matMul(At, Aarr);

  const eigResult = eigs(AtA as number[][]) as {
    values: unknown[];
    eigenvectors: Array<{ value: unknown; vector: unknown[] }>;
  };

  for (const ev of eigResult.eigenvectors) {
    if (isComplex(ev.value)) {
      throw new SvdError(
        "AᵀA produced complex eigenvalues — numeric edge case. Ensure A has real entries.",
      );
    }
  }

  // Sort eigenpairs descending (largest σ first).
  const pairs = eigResult.eigenvectors
    .map((ev) => ({
      lambda: ev.value as number,
      vec: (ev.vector as unknown[]).map((x) => x as number),
    }))
    .sort((a, b) => b.lambda - a.lambda);

  const k = Math.min(m, n);

  // V: right singular vectors = eigenvectors of AᵀA, completed to n×n ONB.
  const Vraw = pairs.map((p) => p.vec);
  const Vcols = completeOnb(Vraw.length === n ? Vraw : Vraw.slice(0, n), n);
  const V = packCols(Vcols, n);

  // Singular values.
  const S: number[] = pairs.slice(0, k).map((p) => normalize(Math.sqrt(Math.max(0, p.lambda))));

  // U: left singular vectors.
  // For σᵢ > EPS: u_i = A·v_i / σᵢ (already unit length since A·v_i = σᵢ·u_i).
  // For σᵢ ≈ 0 or extra columns (m > k): complete via Gram-Schmidt.
  const UcolderivedCols: number[][] = [];
  for (let i = 0; i < k; i++) {
    const sigma = S[i] ?? 0;
    if (sigma > EPS) {
      const vi = pairs[i]?.vec ?? [];
      const Avi = Aarr.map((row) => row.reduce((s, a, j) => s + a * (vi[j] ?? 0), 0));
      const normAvi = vecNorm(Avi);
      if (normAvi > EPS) {
        UcolderivedCols.push(Avi.map((x) => x / normAvi));
      }
    }
  }

  // Complete to full m×m ONB.
  const Ucols = completeOnb(UcolderivedCols, m);

  // Re-order U so column i corresponds to S[i]:
  // - Positions 0..nonzeroCount-1 are the derived columns (already in order).
  // - Positions nonzeroCount..k-1 are zero-sigma slots filled from the ONB tail.
  // - Positions k..m-1 are the remaining ONB columns.
  const nonzeroCount = UcolderivedCols.length;
  const Uordered: number[][] = [];
  let tailIdx = nonzeroCount; // index into Ucols for ONB-tail columns

  for (let i = 0; i < m; i++) {
    if (i < nonzeroCount) {
      // Derived from A·v_i
      Uordered.push(Ucols[i] ?? []);
    } else {
      // Zero-sigma or extra: take from the ONB tail
      Uordered.push(Ucols[tailIdx] ?? []);
      tailIdx++;
    }
  }

  const U = packCols(Uordered, m);

  const payload: SvdPayload = { U, S, V };

  return {
    type: {
      kind: "Tuple",
      elements: [
        { kind: "Matrix", m, n: m, field: "real" },
        { kind: "Vector", n: k, field: "real" },
        { kind: "Matrix", m: n, n, field: "real" },
      ],
    },
    payload: payload as unknown as number[][],
    provenance: {
      blockId: "la.svd",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "mathjs",
    },
  };
}
