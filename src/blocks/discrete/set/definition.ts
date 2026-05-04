import type { BlockDefinition, ParamSpec } from "~/blocks/types";
import { computeSet } from "./compute";

function makeElementParams(count: number): Record<string, ParamSpec> {
  const result: Record<string, ParamSpec> = {};
  for (let i = 0; i < count; i++) {
    result[`e${String(i)}`] = {
      kind: "integer",
      default: i + 1,
      min: -1_000_000,
      max: 1_000_000,
      label: `e${String(i)}`,
    };
  }
  return result;
}

const MAX_ELEMENTS = 16;

export const SetBlock: BlockDefinition = {
  id: "discrete.set",
  label: "Set",
  symbol: "{}",
  category: "source",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [
    {
      id: "S",
      label: "S",
      type: { kind: "Set", element: { kind: "Scalar", field: "integer", precision: "exact" } },
    },
  ],
  params: {
    count: { kind: "integer", default: 3, min: 0, max: MAX_ELEMENTS, label: "Elements" },
    ...makeElementParams(MAX_ELEMENTS),
  },
  compute: (_inputs, params) => {
    const count =
      typeof params.count === "number" && Number.isInteger(params.count)
        ? Math.max(0, Math.min(params.count, MAX_ELEMENTS))
        : 3;
    const elements = Array.from({ length: count }, (_, i) => params[`e${String(i)}`]);
    return computeSet(elements);
  },
  explain: {
    what: "An explicit set of integers. Duplicate entries are silently deduplicated.",
    why: "Foundation block for discrete-math pipelines — feeds union, intersection, combinations, and permutations blocks.",
    effect: (_inputs, output) => {
      const payload = output.payload as ReadonlyArray<{ payload: number }>;
      const values = payload.map((v) => String(v.payload));
      return `{${values.join(", ")}} — ${String(values.length)} element${values.length === 1 ? "" : "s"}.`;
    },
    impact: (_inputs, output) => {
      const payload = output.payload as ReadonlyArray<unknown>;
      return `Set of ${String(payload.length)} integer${payload.length === 1 ? "" : "s"}. Connect to discrete.union, discrete.intersection, discrete.combinations, or discrete.permutations.`;
    },
  },
};
