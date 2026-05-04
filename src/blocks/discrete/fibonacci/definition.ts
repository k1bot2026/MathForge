import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class FibonacciError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FibonacciError";
  }
}

const MAX_N = 78;

export function fibSequence(n: number): ReadonlyArray<number> {
  if (!Number.isInteger(n) || n < 0) {
    throw new FibonacciError(`fibonacci: n must be a non-negative integer, got ${String(n)}`);
  }
  if (n > MAX_N) {
    throw new FibonacciError(
      `fibonacci: n=${String(n)} exceeds safe limit of ${String(MAX_N)} (F(78) = 8944394323791464 ≤ MAX_SAFE_INTEGER)`,
    );
  }
  if (n === 0) return [];
  const seq = [0, 1];
  for (let i = 2; i < n; i++) {
    seq.push((seq[i - 1] ?? 0) + (seq[i - 2] ?? 0));
  }
  return seq.slice(0, n);
}

export const FibonacciBlock: BlockDefinition = {
  id: "discrete.fibonacci",
  label: "Fibonacci Sequence",
  symbol: "fib",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [],
  outputs: [
    {
      id: "result",
      label: "F(0..n-1)",
      type: { kind: "Vector", n: "any", field: "integer" },
    },
  ],
  params: {
    n: {
      kind: "integer",
      default: 10,
      min: 0,
      max: MAX_N,
      label: "Terms",
    },
  },
  compute(_inputs, params): MathValue {
    const n =
      typeof params.n === "number" && Number.isInteger(params.n)
        ? Math.max(0, Math.min(params.n, MAX_N))
        : 10;
    const seq = fibSequence(n);
    return {
      type: { kind: "Vector", n: seq.length, field: "integer" },
      payload: seq as number[],
      provenance: {
        blockId: "discrete.fibonacci",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: `Generates the first n terms of the Fibonacci sequence F(0), F(1), …, F(n-1). Exact integers up to n=${String(MAX_N)} terms.`,
    why: "Classic example of a recurrence relation — appears in combinatorics, plant growth models, and algorithm analysis.",
    effect: (_inputs, output) => {
      const payload = output.payload as ReadonlyArray<number>;
      return `${String(payload.length)} terms; last value = ${String(payload[payload.length - 1] ?? 0)}.`;
    },
  },
};
