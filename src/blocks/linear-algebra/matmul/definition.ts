import type { BlockDefinition } from "~/blocks/types";
import type { MathType } from "~/math/types";
import { computeMatMul } from "./compute";

export const MatMulBlock: BlockDefinition = {
  id: "la.matmul",
  label: "Matrix × matrix",
  symbol: "A·B",
  category: "operation",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "mathjs",
  color: "operation",
  inputs: [
    {
      id: "A",
      label: "A",
      type: { kind: "Matrix", m: { var: "m" }, n: { var: "k" }, field: "real" },
    },
    {
      id: "B",
      label: "B",
      type: { kind: "Matrix", m: { var: "k" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "AB",
      label: "A·B",
      type: (inputTypes): MathType => {
        const A = inputTypes.A;
        const B = inputTypes.B;
        if (A?.kind === "Matrix" && B?.kind === "Matrix") {
          return { kind: "Matrix", m: A.m, n: B.n, field: "real" };
        }
        return { kind: "Matrix", m: "any", n: "any", field: "real" };
      },
    },
  ],
  compute: (inputs) => computeMatMul(inputs),
  explain: {
    what: "Multiplies two matrices: each entry of A·B is a dot product of a row of A and a column of B.",
    why: "Composes two linear transformations into one.",
    effect: (inputs, output) => {
      const A = inputs.A?.payload as ReadonlyArray<ReadonlyArray<number>> | undefined;
      const B = inputs.B?.payload as ReadonlyArray<ReadonlyArray<number>> | undefined;
      const out = output.payload as ReadonlyArray<ReadonlyArray<number>>;
      if (A === undefined || B === undefined) {
        return `Produced a ${out.length}×${out[0]?.length ?? 0} matrix.`;
      }
      return `Combined a ${A.length}×${A[0]?.length ?? 0} matrix with a ${B.length}×${B[0]?.length ?? 0} matrix to form a ${out.length}×${out[0]?.length ?? 0} matrix.`;
    },
    impact: (_inputs, output) => {
      const out = output.payload as ReadonlyArray<ReadonlyArray<number>>;
      return `Downstream blocks see this as a ${out.length}×${out[0]?.length ?? 0} real matrix.`;
    },
  },
};
