import type { BlockDefinition } from "~/blocks/types";
import type {
  MathValue,
  MatrixPayload,
  PointPayload,
  PolygonPayload,
  ScalarPayload,
  VectorPayload,
} from "~/math/types";
import { GeometryError } from "../geometry";

export const AffineBlock: BlockDefinition = {
  id: "geom.affine",
  label: "Affine Transform",
  symbol: "A",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "shape", label: "Shape", type: { kind: "Point", n: "any" } },
    { id: "matrix", label: "Matrix", type: { kind: "Matrix", m: "any", n: "any", field: "real" } },
    {
      id: "translation",
      label: "Translation (optional)",
      type: { kind: "Vector", n: "any", field: "real" },
      required: false,
    },
  ],
  outputs: [
    {
      id: "result",
      label: "Transformed",
      type: (inputTypes) => inputTypes.shape ?? { kind: "Point", n: 2 },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const shapeVal = inputs.shape;
    const matrixVal = inputs.matrix;
    if (shapeVal === undefined) throw new GeometryError("geom.affine: shape is required");
    if (matrixVal === undefined) throw new GeometryError("geom.affine: matrix is required");

    const mat = matrixVal.payload as MatrixPayload;
    const translation = inputs.translation
      ? (inputs.translation.payload as VectorPayload)
      : undefined;

    const kind = shapeVal.type.kind;

    if (kind === "Point") {
      return {
        type: shapeVal.type,
        payload: applyAffine(shapeVal.payload as PointPayload, mat, translation),
        provenance: makeProvenance(),
      };
    }

    if (kind === "Polygon") {
      const verts = shapeVal.payload as PolygonPayload;
      return {
        type: shapeVal.type,
        payload: verts.map((v) => applyAffine(v, mat, translation)) as PolygonPayload,
        provenance: makeProvenance(),
      };
    }

    throw new GeometryError(
      `geom.affine: unsupported shape type "${kind}" (supported: Point, Polygon)`,
    );
  },
  explain: {
    what: "Applies an affine transformation (matrix multiplication + optional translation) to a Point or Polygon.",
    why: "Affine maps are the most general linear-preserving transformations, encompassing rotation, reflection, scaling, shear, and projection simultaneously.",
    effect: (inputs) => {
      if (!inputs.shape || !inputs.matrix)
        return "Connect a Shape and Matrix to apply an affine transformation.";
      return `Affine-transformed ${inputs.shape.type.kind} via matrix product + optional translation.`;
    },
    impact: (_inputs, _output) =>
      "Outputs the same shape type with coordinates transformed by the matrix.",
  },
};

function applyAffine(
  p: PointPayload | ReadonlyArray<ScalarPayload>,
  mat: MatrixPayload,
  translation: VectorPayload | undefined,
): number[] {
  const rows = mat.length;
  const result: number[] = Array.from({ length: rows }, (_, i) => {
    const row = mat[i] ?? [];
    let sum = 0;
    for (let j = 0; j < row.length; j++) {
      sum += ((row[j] as number) ?? 0) * ((p[j] as number) ?? 0);
    }
    return sum + (translation ? ((translation[i] as number) ?? 0) : 0);
  });
  return result;
}

function makeProvenance() {
  return {
    blockId: "geom.affine",
    inputs: ["shape", "matrix", "translation"],
    computedAt: Date.now(),
    engine: "native" as const,
  };
}
