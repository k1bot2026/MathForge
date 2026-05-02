import type { BlockDefinition } from "~/blocks/types";
import type { MathType } from "~/math/types";
import { computeTranspose } from "./compute";

export const TransposeBlock: BlockDefinition = {
  id: "la.transpose",
  label: "Transpose",
  symbol: "Aᵀ",
  category: "operation",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "A",
      label: "A",
      type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "At",
      label: "Aᵀ",
      type: (inputTypes): MathType => {
        const A = inputTypes.A;
        if (A !== undefined && A.kind === "Matrix") {
          return { kind: "Matrix", m: A.n, n: A.m, field: "real" };
        }
        return { kind: "Matrix", m: "any", n: "any", field: "real" };
      },
    },
  ],
  compute: (inputs) => computeTranspose(inputs),
  explain: {
    what: "Transposes a matrix A, swapping its rows and columns to produce Aᵀ.",
    why: "Transposition converts row vectors to column vectors and vice versa — a fundamental operation underlying dot products, symmetric matrices, and the adjoint.",
    effect: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Output is ${String(t.m)}×${String(t.n)}.`;
    },
    impact: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Downstream blocks see a ${String(t.m)}×${String(t.n)} matrix — note rows and columns are swapped from the input.`;
    },
  },
};
