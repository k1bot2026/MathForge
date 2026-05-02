import type { BlockDefinition } from "~/blocks/types";
import type { MathType } from "~/math/types";
import { computeAdd } from "./compute";

export const AddBlock: BlockDefinition = {
  id: "la.add",
  label: "Matrix addition",
  symbol: "A+B",
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
    {
      id: "B",
      label: "B",
      // Same shape variables force m and n to match at connect time.
      type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" },
    },
  ],
  outputs: [
    {
      id: "sum",
      label: "A+B",
      type: (inputTypes): MathType => {
        const A = inputTypes.A;
        if (A !== undefined && A.kind === "Matrix") {
          return { kind: "Matrix", m: A.m, n: A.n, field: "real" };
        }
        return { kind: "Matrix", m: "any", n: "any", field: "real" };
      },
    },
  ],
  compute: (inputs) => computeAdd(inputs),
  explain: {
    what: "Adds two same-shape matrices entry-by-entry.",
    why: "Elementwise addition is the abelian group operation on matrices — it underlies gradient descent, linear combinations, and most incremental update rules.",
    effect: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Output is ${String(t.m)}×${String(t.n)}.`;
    },
    impact: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Downstream blocks see a ${String(t.m)}×${String(t.n)} matrix — each entry is the elementwise sum.`;
    },
  },
};
