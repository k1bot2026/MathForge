import type { BlockDefinition } from "~/blocks/types";
import type { MathType } from "~/math/types";
import { computeMatVec } from "./compute";

export const MatVecBlock: BlockDefinition = {
  id: "la.matvec",
  label: "Matrix × vector",
  symbol: "M·v",
  category: "operation",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "mathjs",
  color: "operation",
  inputs: [
    {
      id: "M",
      label: "M",
      type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" },
    },
    {
      id: "v",
      label: "v",
      type: { kind: "Vector", n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "Mv",
      label: "M·v",
      type: (inputTypes): MathType => {
        const M = inputTypes.M;
        if (M !== undefined && M.kind === "Matrix") {
          return { kind: "Vector", n: M.m, field: "real" };
        }
        return { kind: "Vector", n: "any", field: "real" };
      },
    },
  ],
  compute: (inputs) => computeMatVec(inputs),
  explain: {
    what: "Applies a matrix to a vector — the linear transformation in action.",
    why: "Each output coordinate is a dot product of one row of M with v.",
    effect: (inputs, output) => {
      const M = inputs.M?.payload as ReadonlyArray<ReadonlyArray<number>> | undefined;
      const out = output.payload as ReadonlyArray<number>;
      if (M === undefined) return `Result: [${out.join(", ")}].`;
      return `Took a ${M.length}×${M[0]?.length ?? 0} matrix into a ${out.length}-vector.`;
    },
    impact: (_inputs, output) => {
      const out = output.payload as ReadonlyArray<number>;
      return `Downstream blocks see [${out.join(", ")}].`;
    },
  },
};
