import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class RecurrenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecurrenceError";
  }
}

const MAX_TERMS = 50;

/**
 * Evaluates the linear recurrence a(n) = c1*a(n-1) + c2*a(n-2) + d
 * with initial conditions a(0) = a0, a(1) = a1, for `terms` steps.
 * Setting c2=0 gives a first-order recurrence.
 */
export function linearRecurrence(
  a0: number,
  a1: number,
  c1: number,
  c2: number,
  d: number,
  terms: number,
): ReadonlyArray<number> {
  if (!Number.isFinite(a0) || !Number.isFinite(a1)) {
    throw new RecurrenceError("recurrence: initial values must be finite");
  }
  if (terms < 0 || !Number.isInteger(terms)) {
    throw new RecurrenceError("recurrence: terms must be a non-negative integer");
  }
  if (terms === 0) return [];
  if (terms === 1) return [a0];
  const seq = [a0, a1];
  for (let i = 2; i < terms; i++) {
    const next = c1 * (seq[i - 1] ?? 0) + c2 * (seq[i - 2] ?? 0) + d;
    if (!Number.isFinite(next)) {
      throw new RecurrenceError(`recurrence: value diverged at step ${String(i)}`);
    }
    seq.push(next);
  }
  return seq;
}

export const RecurrenceBlock: BlockDefinition = {
  id: "discrete.recurrence",
  label: "Linear Recurrence",
  symbol: "rec",
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
      label: "a(0..n-1)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  params: {
    terms: { kind: "integer", default: 10, min: 0, max: MAX_TERMS, label: "Terms" },
    a0: { kind: "number", default: 0, label: "a(0)" },
    a1: { kind: "number", default: 1, label: "a(1)" },
    c1: { kind: "number", default: 1, label: "c₁ (coeff of a(n-1))" },
    c2: { kind: "number", default: 1, label: "c₂ (coeff of a(n-2))" },
    d: { kind: "number", default: 0, label: "d (constant term)" },
  },
  compute(_inputs, params): MathValue {
    const terms = Math.max(
      0,
      Math.min(typeof params.terms === "number" ? Math.floor(params.terms) : 10, MAX_TERMS),
    );
    const a0 = typeof params.a0 === "number" ? params.a0 : 0;
    const a1 = typeof params.a1 === "number" ? params.a1 : 1;
    const c1 = typeof params.c1 === "number" ? params.c1 : 1;
    const c2 = typeof params.c2 === "number" ? params.c2 : 1;
    const d = typeof params.d === "number" ? params.d : 0;
    const seq = linearRecurrence(a0, a1, c1, c2, d, terms);
    return {
      type: { kind: "Vector", n: seq.length, field: "real" },
      payload: seq as number[],
      provenance: {
        blockId: "discrete.recurrence",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Evaluates a linear recurrence a(n) = c₁·a(n-1) + c₂·a(n-2) + d with given initial conditions a(0), a(1) for the specified number of terms.",
    why: "Models a wide class of sequences (Fibonacci, Lucas, arithmetic progressions, geometric progressions) under one parameterizable block.",
    effect: (_inputs, output) => {
      const payload = output.payload as ReadonlyArray<number>;
      return `${String(payload.length)} terms; a(${String(payload.length - 1)}) = ${String(payload[payload.length - 1] ?? 0)}.`;
    },
  },
};
