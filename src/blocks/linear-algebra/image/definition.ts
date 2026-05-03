import type { BlockDefinition } from "~/blocks/types";
import { computeImage } from "./compute";

export const ImageBlock: BlockDefinition = {
  id: "la.image",
  label: "Image (Column Space)",
  symbol: "im(A)",
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
      id: "B",
      label: "im(A)",
      // Output shape is m×r where r = rank(A).
      // r is not statically known, so use "any" for the column dimension.
      type: { kind: "Matrix", m: { var: "m" }, n: "any", field: "real" },
    },
  ],
  compute: (inputs) => computeImage(inputs),
  explain: {
    what: "Computes a basis for the column space (image) of A: the set of all vectors A·x. Output is an m×r matrix whose columns are the pivot columns of A, where r = rank(A).",
    why: "The image captures all reachable outputs of the linear map. Its dimension (rank) determines whether Ax=b has any solution at all. Dual to the kernel via the rank-nullity theorem.",
    effect: (_inputs, output) => {
      const rows = output.payload as number[][];
      const r = rows[0]?.length ?? 0;
      const m = rows.length;
      if (r === 0) return `A is the zero map — image is {0}, rank = 0.`;
      return `Column space has dimension ${r} (rank). Output is ${m}×${r} matrix; each column is a basis vector.`;
    },
    impact: () => "rank(A) + nullity(A) = n (rank-nullity theorem).",
  },
};
