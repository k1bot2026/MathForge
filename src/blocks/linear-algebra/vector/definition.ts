import type { BlockDefinition, ParamSpec } from "~/blocks/types";
import { computeVector } from "./compute";

/** Builds the param spec for components c0..c(n-1). */
function makeComponentParams(n: number): Record<string, ParamSpec> {
  const result: Record<string, ParamSpec> = {};
  for (let i = 0; i < n; i++) {
    result[`c${String(i)}`] = { kind: "number", default: i === 0 ? 1 : 0, label: `c${String(i)}` };
  }
  return result;
}

export const VectorBlock: BlockDefinition = {
  id: "la.vector",
  label: "Vector (N-D)",
  symbol: "v",
  category: "source",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [
    {
      id: "v",
      label: "v",
      // n is resolved at runtime from the `dim` param; declared as "any" for static registry
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  params: {
    dim: { kind: "integer", default: 2, min: 0, max: 16, label: "Dimension" },
    ...makeComponentParams(16),
  },
  compute: (_inputs, params) => {
    const n =
      typeof params.dim === "number" && Number.isInteger(params.dim) ? Math.max(0, params.dim) : 2;
    const components = Array.from({ length: n }, (_, i) => params[`c${String(i)}`]);
    return computeVector(n, components);
  },
  explain: {
    what: "A real vector of configurable dimension N.",
    why: "Generalises the 2-vector and 3-vector to any N so it can feed arbitrary matrix operations.",
    effect: (_inputs, output) => {
      const payload = output.payload as number[];
      return `Outputs [${payload.map(String).join(", ")}].`;
    },
    impact: (_inputs, output) => {
      const payload = output.payload as number[];
      const len = Math.sqrt(payload.reduce((s, x) => s + x * x, 0)).toPrecision(4);
      return `Length ${len}; downstream blocks see a ${String(payload.length)}-vector in ℝⁿ.`;
    },
  },
};
