import type { BlockDefinition } from "~/blocks/types";
import { computeMatrix2x2 } from "./compute";

export const Matrix2x2Block: BlockDefinition = {
  id: "la.matrix2x2",
  label: "Matrix (2×2)",
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
      type: { kind: "Matrix", m: 2, n: 2, field: "real" },
    },
  ],
  params: {
    a: { kind: "number", default: 1, label: "a (row 0, col 0)" },
    b: { kind: "number", default: 0, label: "b (row 0, col 1)" },
    c: { kind: "number", default: 0, label: "c (row 1, col 0)" },
    d: { kind: "number", default: 1, label: "d (row 1, col 1)" },
  },
  compute: (_inputs, params) => computeMatrix2x2(params),
  explain: {
    what: "A 2×2 real matrix laid out [[a, b], [c, d]].",
    why: "The matrix that transforms 2-vectors — rotation, shear, scaling, all in four numbers.",
    effect: (_inputs, output) => {
      const [[a, b], [c, d]] = output.payload as [[number, number], [number, number]];
      return `Currently [[${String(a)}, ${String(b)}], [${String(c)}, ${String(d)}]].`;
    },
    impact: (_inputs, output) => {
      const [[a, b], [c, d]] = output.payload as [[number, number], [number, number]];
      const det = (a * d - b * c).toPrecision(4);
      return `det = ${det}; the unit square's area scales by this factor under M.`;
    },
  },
};
