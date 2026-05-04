import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, SetPayload } from "~/math/types";
import { makeScalar } from "../combinatorics";

export class PermutationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermutationsError";
  }
}

const MAX_RESULTS = 5040;

const SET_INTEGER = {
  kind: "Set" as const,
  element: { kind: "Scalar" as const, field: "integer" as const, precision: "exact" as const },
};

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

function* permute(arr: ReadonlyArray<number>, k: number): Generator<ReadonlyArray<number>> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.filter((_, j) => j !== i);
    for (const perm of permute(rest, k - 1)) {
      yield [arr[i] ?? 0, ...perm];
    }
  }
}

export function computePermutations(elements: ReadonlyArray<number>, k: number): MathValue {
  if (!Number.isInteger(k) || k < 0) {
    throw new PermutationsError(`permutations: k must be a non-negative integer, got ${String(k)}`);
  }
  if (k > elements.length) {
    throw new PermutationsError(
      `permutations: k=${String(k)} > |set|=${String(elements.length)}; k cannot exceed set size`,
    );
  }

  const tupleType = {
    kind: "Tuple" as const,
    elements: Array.from({ length: k }, () => INTEGER_TYPE),
  };
  const outType = { kind: "Set" as const, element: tupleType };

  const items: MathValue[] = [];
  for (const perm of permute(elements, k)) {
    if (items.length >= MAX_RESULTS) {
      throw new PermutationsError(
        `permutations: result exceeds ${String(MAX_RESULTS)} tuples; reduce set size or k`,
      );
    }
    items.push({
      type: tupleType,
      payload: perm.map((v) => makeScalar(v)),
      provenance: { blockId: "discrete.permutations", inputs: [], computedAt: 0, engine: "native" },
    });
  }
  const payload: SetPayload = items;

  return {
    type: outType,
    payload,
    provenance: {
      blockId: "discrete.permutations",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}

export const PermutationsBlock: BlockDefinition = {
  id: "discrete.permutations",
  label: "Permutations",
  symbol: "P(n,k)",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "S", label: "S", type: SET_INTEGER },
    { id: "k", label: "k", type: INTEGER_TYPE },
  ],
  outputs: [
    {
      id: "result",
      label: "P(S,k)",
      type: { kind: "Set", element: { kind: "Tuple", elements: [] } },
    },
  ],
  compute(inputs) {
    const { S: sVal, k: kVal } = inputs;
    if (sVal === undefined || kVal === undefined) {
      throw new PermutationsError("discrete.permutations: S and k inputs are required");
    }
    const elements = (sVal.payload as SetPayload).map((mv) => mv.payload as number);
    const k = kVal.payload as number;
    return computePermutations(elements, k);
  },
  explain: {
    what: "Enumerates all ordered k-tuples (permutations) drawn from set S without repetition.",
    why: "Used in counting problems, password/sequence generation, and combinatorial search. Total count = n!/(n-k)!.",
    effect: (_inputs, output) => {
      const count = (output.payload as SetPayload).length;
      return `${String(count)} permutation${count === 1 ? "" : "s"}.`;
    },
  },
};
