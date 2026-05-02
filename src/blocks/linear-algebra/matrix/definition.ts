import type { BlockDefinition, ParamSpec } from "~/blocks/types";
import { computeMatrix } from "./compute";

/** Builds param specs for all cells of an m×n matrix (named r{i}c{j}). */
function makeCellParams(maxDim: number): Record<string, ParamSpec> {
  const result: Record<string, ParamSpec> = {};
  for (let r = 0; r < maxDim; r++) {
    for (let c = 0; c < maxDim; c++) {
      // Default to identity: 1 on diagonal, 0 elsewhere
      result[`r${String(r)}c${String(c)}`] = {
        kind: "number",
        default: r === c ? 1 : 0,
        label: `[${String(r)},${String(c)}]`,
      };
    }
  }
  return result;
}

const MAX_DIM = 8;

export const MatrixBlock: BlockDefinition = {
  id: "la.matrix",
  label: "Matrix (m×n)",
  symbol: "M",
  category: "source",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [
    {
      id: "M",
      label: "M",
      // Shape resolved at runtime; declared as "any" × "any" for static registry
      type: { kind: "Matrix", m: "any", n: "any", field: "real" },
    },
  ],
  params: {
    rows: { kind: "integer", default: 2, min: 1, max: MAX_DIM, label: "Rows" },
    cols: { kind: "integer", default: 2, min: 1, max: MAX_DIM, label: "Columns" },
    ...makeCellParams(MAX_DIM),
  },
  compute: (_inputs, params) => {
    const m =
      typeof params.rows === "number" && Number.isInteger(params.rows)
        ? Math.max(1, params.rows)
        : 2;
    const n =
      typeof params.cols === "number" && Number.isInteger(params.cols)
        ? Math.max(1, params.cols)
        : 2;
    const rows = Array.from({ length: m }, (_, r) =>
      Array.from({ length: n }, (_, c) => params[`r${String(r)}c${String(c)}`]),
    );
    return computeMatrix(m, n, rows);
  },
  explain: {
    what: "A real m×n matrix with configurable dimensions and entries.",
    why: "Generalises the 2×2 matrix to arbitrary size so it can represent any linear map between ℝⁿ and ℝᵐ.",
    effect: (_inputs, output) => {
      const payload = output.payload as number[][];
      const t = output.type as { m: number; n: number };
      return `Currently a ${String(t.m)}×${String(t.n)} matrix; top-left entry = ${String(payload[0]?.[0] ?? 0)}.`;
    },
    impact: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Downstream blocks see a ${String(t.m)}×${String(t.n)} matrix in ℝ^(${String(t.m)}×${String(t.n)}).`;
    },
  },
};
