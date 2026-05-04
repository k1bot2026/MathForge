import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, SetPayload } from "~/math/types";
import { makeScalar } from "../combinatorics";

export class CombinationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CombinationsError";
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

function* choose(
  arr: ReadonlyArray<number>,
  k: number,
  start = 0,
): Generator<ReadonlyArray<number>> {
  if (k === 0) {
    yield [];
    return;
  }
  for (let i = start; i <= arr.length - k; i++) {
    for (const rest of choose(arr, k - 1, i + 1)) {
      yield [arr[i] ?? 0, ...rest];
    }
  }
}

export function computeCombinations(elements: ReadonlyArray<number>, k: number): MathValue {
  if (!Number.isInteger(k) || k < 0) {
    throw new CombinationsError(`combinations: k must be a non-negative integer, got ${String(k)}`);
  }
  if (k > elements.length) {
    throw new CombinationsError(
      `combinations: k=${String(k)} > |set|=${String(elements.length)}; k cannot exceed set size`,
    );
  }

  const sorted = [...elements].sort((a, b) => a - b);
  const tupleType = {
    kind: "Tuple" as const,
    elements: Array.from({ length: k }, () => INTEGER_TYPE),
  };
  const outType = { kind: "Set" as const, element: tupleType };

  const items: MathValue[] = [];
  for (const combo of choose(sorted, k)) {
    if (items.length >= MAX_RESULTS) {
      throw new CombinationsError(
        `combinations: result exceeds ${String(MAX_RESULTS)} tuples; reduce set size or k`,
      );
    }
    items.push({
      type: tupleType,
      payload: combo.map((v) => makeScalar(v)),
      provenance: { blockId: "discrete.combinations", inputs: [], computedAt: 0, engine: "native" },
    });
  }
  const payload: SetPayload = items;

  return {
    type: outType,
    payload,
    provenance: {
      blockId: "discrete.combinations",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}

export const CombinationsBlock: BlockDefinition = {
  id: "discrete.combinations",
  label: "Combinations",
  symbol: "C(n,k)",
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
      label: "C(S,k)",
      type: { kind: "Set", element: { kind: "Tuple", elements: [] } },
    },
  ],
  compute(inputs) {
    const { S: sVal, k: kVal } = inputs;
    if (sVal === undefined || kVal === undefined) {
      throw new CombinationsError("discrete.combinations: S and k inputs are required");
    }
    const elements = (sVal.payload as SetPayload).map((mv) => mv.payload as number);
    const k = kVal.payload as number;
    return computeCombinations(elements, k);
  },
  explain: {
    what: "Enumerates all unordered k-subsets (combinations) drawn from set S without repetition.",
    why: "Foundation for sampling, probability spaces, and counting subsets. Total count = C(|S|,k) = binomial coefficient.",
    effect: (_inputs, output) => {
      const count = (output.payload as SetPayload).length;
      return `${String(count)} combination${count === 1 ? "" : "s"}.`;
    },
  },
};
