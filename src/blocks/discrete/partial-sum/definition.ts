import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, VectorPayload } from "~/math/types";

export class PartialSumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartialSumError";
  }
}

export const PartialSumBlock: BlockDefinition = {
  id: "discrete.partial-sum",
  label: "Partial Sum",
  symbol: "Σ",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "seq",
      label: "sequence",
      type: { kind: "Vector", n: "any", field: "integer" },
    },
  ],
  outputs: [
    {
      id: "result",
      label: "partial sums",
      type: { kind: "Vector", n: "any", field: "integer" },
    },
  ],
  compute(inputs): MathValue {
    const seqVal = inputs.seq;
    if (seqVal === undefined) {
      throw new PartialSumError("discrete.partial-sum: seq input is required");
    }
    const terms = seqVal.payload as VectorPayload;
    const partials: number[] = [];
    let acc = 0;
    for (const t of terms) {
      acc += t as number;
      partials.push(acc);
    }
    return {
      type: { kind: "Vector", n: partials.length, field: "integer" },
      payload: partials,
      provenance: {
        blockId: "discrete.partial-sum",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the running partial sums of a sequence: S(k) = a(0) + a(1) + … + a(k).",
    why: "Converts a sequence of increments into cumulative totals — used in prefix-sum arrays, probability CDFs, and summation proofs.",
    effect: (_inputs, output) => {
      const payload = output.payload as ReadonlyArray<number>;
      return `${String(payload.length)} partial sums; total = ${String(payload[payload.length - 1] ?? 0)}.`;
    },
  },
};
