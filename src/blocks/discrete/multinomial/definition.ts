import type { BlockDefinition, ParamSpec } from "~/blocks/types";
import { CombinatoricsError, FACTORIAL_MAX_N, makeScalar, multinomial } from "../combinatorics";

const INTEGER_TYPE = {
  kind: "Scalar" as const,
  field: "integer" as const,
  precision: "exact" as const,
};

const MAX_GROUPS = 8;

function makeGroupParams(count: number): Record<string, ParamSpec> {
  const result: Record<string, ParamSpec> = {};
  for (let i = 0; i < count; i++) {
    result[`k${String(i)}`] = {
      kind: "integer",
      default: 1,
      min: 0,
      max: FACTORIAL_MAX_N,
      label: `k${String(i)}`,
    };
  }
  return result;
}

export const MultinomialBlock: BlockDefinition = {
  id: "discrete.multinomial",
  label: "Multinomial Coefficient",
  symbol: "M",
  category: "operation",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [],
  outputs: [{ id: "result", label: "M(k₀,…,kₘ)", type: INTEGER_TYPE }],
  params: {
    groups: {
      kind: "integer",
      default: 3,
      min: 1,
      max: MAX_GROUPS,
      label: "Groups",
    },
    ...makeGroupParams(MAX_GROUPS),
  },
  compute(_inputs, params) {
    const groupCount =
      typeof params.groups === "number" && Number.isInteger(params.groups)
        ? Math.max(1, Math.min(params.groups, MAX_GROUPS))
        : 3;
    const counts: number[] = [];
    for (let i = 0; i < groupCount; i++) {
      const v = params[`k${String(i)}`];
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
        throw new CombinatoricsError(
          `discrete.multinomial: k${String(i)} must be a non-negative integer`,
        );
      }
      counts.push(v);
    }
    return makeScalar(multinomial(counts));
  },
  explain: {
    what: `Multinomial coefficient (k₀+k₁+…)! / (k₀! × k₁! × …): the number of ways to partition n items into groups of sizes k₀, k₁, …. Supports up to ${String(MAX_GROUPS)} groups; total n ≤ ${String(FACTORIAL_MAX_N)}.`,
    why: "Generalizes the binomial coefficient to more than two groups — essential for multinomial probability distributions, combinatorial proofs, and polynomial expansions.",
    effect: (_inputs, output) => `Multinomial coefficient = ${String(output.payload as number)}`,
  },
};
