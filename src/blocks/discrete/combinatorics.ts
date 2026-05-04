import type { MathValue } from "~/math/types";

export class CombinatoricsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CombinatoricsError";
  }
}

export const INTEGER_EXACT = {
  type: { kind: "Scalar" as const, field: "integer" as const, precision: "exact" as const },
  provenance: {
    blockId: "discrete",
    inputs: [],
    computedAt: 0,
    engine: "native" as const,
  },
};

/** Maximum n for exact factorial (20! = 2_432_902_008_176_640_000, fits in Number.MAX_SAFE_INTEGER). */
export const FACTORIAL_MAX_N = 20;

/** Precomputed factorial table for n in [0, 20]. */
const FACTORIAL_TABLE: ReadonlyArray<number> = (() => {
  const t = [1];
  for (let i = 1; i <= FACTORIAL_MAX_N; i++) {
    t.push((t[i - 1] ?? 1) * i);
  }
  return t;
})();

export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new CombinatoricsError(`factorial: n must be a non-negative integer, got ${String(n)}`);
  }
  if (n > FACTORIAL_MAX_N) {
    throw new CombinatoricsError(
      `factorial: n=${String(n)} exceeds maximum exact value of ${String(FACTORIAL_MAX_N)}`,
    );
  }
  return FACTORIAL_TABLE[n] ?? 1;
}

export function binomial(n: number, k: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new CombinatoricsError(`binomial: n must be a non-negative integer, got ${String(n)}`);
  }
  if (!Number.isInteger(k) || k < 0) {
    throw new CombinatoricsError(`binomial: k must be a non-negative integer, got ${String(k)}`);
  }
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  // Use symmetry to minimize multiplications
  const kk = k > n - k ? n - k : k;
  let result = 1;
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

export function multinomial(counts: ReadonlyArray<number>): number {
  if (counts.length === 0) return 1;
  for (const c of counts) {
    if (!Number.isInteger(c) || c < 0) {
      throw new CombinatoricsError(
        `multinomial: each count must be a non-negative integer, got ${String(c)}`,
      );
    }
  }
  const n = counts.reduce((a, b) => a + b, 0);
  if (n > FACTORIAL_MAX_N) {
    throw new CombinatoricsError(
      `multinomial: total count n=${String(n)} exceeds maximum exact value of ${String(FACTORIAL_MAX_N)}`,
    );
  }
  let result = factorial(n);
  for (const c of counts) {
    result = result / factorial(c);
  }
  return Math.round(result);
}

export function makeScalar(value: number): MathValue {
  return {
    type: { kind: "Scalar", field: "integer", precision: "exact" },
    payload: value,
    provenance: { blockId: "discrete", inputs: [], computedAt: Date.now(), engine: "native" },
  };
}
