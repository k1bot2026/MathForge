import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, MatrixPayload } from "~/math/types";
import { GeometryError } from "../geometry";

export const ComposeBlock: BlockDefinition = {
  id: "geom.compose",
  label: "Compose Transforms",
  symbol: "∘",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "A",
      label: "Transform A",
      type: { kind: "Matrix", m: "any", n: "any", field: "real" },
    },
    {
      id: "B",
      label: "Transform B",
      type: { kind: "Matrix", m: "any", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "result",
      label: "A ∘ B",
      type: { kind: "Matrix", m: "any", n: "any", field: "real" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const aVal = inputs.A;
    const bVal = inputs.B;
    if (aVal === undefined) throw new GeometryError("geom.compose: A is required");
    if (bVal === undefined) throw new GeometryError("geom.compose: B is required");

    const A = aVal.payload as MatrixPayload;
    const B = bVal.payload as MatrixPayload;

    const aRows = A.length;
    const aCols = (A[0] ?? []).length;
    const bRows = B.length;
    const bCols = (B[0] ?? []).length;

    if (aCols !== bRows) {
      throw new GeometryError(
        `geom.compose: incompatible dimensions ${aRows}×${aCols} ∘ ${bRows}×${bCols}`,
      );
    }

    const result: number[][] = Array.from({ length: aRows }, (_, i) =>
      Array.from({ length: bCols }, (_, j) => {
        let sum = 0;
        for (let k = 0; k < aCols; k++) {
          sum += (((A[i] ?? [])[k] as number) ?? 0) * (((B[k] ?? [])[j] as number) ?? 0);
        }
        return sum;
      }),
    );

    return {
      type: { kind: "Matrix", m: aRows, n: bCols, field: "real" },
      payload: result as MatrixPayload,
      provenance: {
        blockId: "geom.compose",
        inputs: ["A", "B"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Composes two linear transformations represented as matrices: computes A·B (apply B first, then A).",
    why: "Composing transformations as matrix products lets you chain rotations, reflections, and shears into a single operation, which is more efficient than applying each separately.",
    effect: (inputs) => {
      if (!inputs.A || !inputs.B) return "Connect two transformation matrices to compose them.";
      const aType = inputs.A.type;
      const bType = inputs.B.type;
      if (aType.kind !== "Matrix" || bType.kind !== "Matrix") return "Connect two matrices.";
      return `Composing ${aType.m}×${aType.n} ∘ ${bType.m}×${bType.n} → ${aType.m}×${bType.n} matrix.`;
    },
    impact: (_inputs, _output) =>
      "Outputs the composed transformation matrix A·B. Connect to geom.affine to apply it.",
  },
};
