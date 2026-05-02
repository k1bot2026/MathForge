import type { BlockDefinition } from "~/blocks/types";
import type { MathType } from "~/math/types";
import { computeSub } from "./compute";

export const SubBlock: BlockDefinition = {
  id: "la.sub",
  label: "Matrix subtraction",
  symbol: "A−B",
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
      id: "diff",
      label: "A−B",
      type: (inputTypes): MathType => {
        const A = inputTypes.A;
        if (A !== undefined && A.kind === "Matrix") {
          return { kind: "Matrix", m: A.m, n: A.n, field: "real" };
        }
        return { kind: "Matrix", m: "any", n: "any", field: "real" };
      },
    },
  ],
  compute: (inputs) => computeSub(inputs),
  explain: {
    what: "Subtracts matrix B from A entry-by-entry.",
    why: "Elementwise subtraction is the inverse of addition and appears in residuals, finite differences, and gradient updates.",
    effect: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Output is ${String(t.m)}×${String(t.n)}.`;
    },
    impact: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Downstream blocks see a ${String(t.m)}×${String(t.n)} matrix — each entry is the elementwise difference.`;
    },
  },
};
