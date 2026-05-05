import type { BlockDefinition } from "~/blocks/types";
import type {
  CirclePayload,
  LinePayload,
  MathValue,
  PointPayload,
  PolygonPayload,
  VectorPayload,
} from "~/math/types";
import { GeometryError } from "../geometry";

export const TranslateBlock: BlockDefinition = {
  id: "geom.translate",
  label: "Translate",
  symbol: "T",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "shape", label: "Shape", type: { kind: "Point", n: "any" } },
    { id: "vector", label: "Vector", type: { kind: "Vector", n: "any", field: "real" } },
  ],
  outputs: [
    {
      id: "result",
      label: "Translated",
      type: (inputTypes) => {
        const t = inputTypes.shape;
        if (t) return t;
        return { kind: "Point", n: 2 };
      },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const shapeVal = inputs.shape;
    const vecVal = inputs.vector;
    if (shapeVal === undefined) throw new GeometryError("geom.translate: shape is required");
    if (vecVal === undefined) throw new GeometryError("geom.translate: vector is required");

    const v = vecVal.payload as VectorPayload;
    const kind = shapeVal.type.kind;

    if (kind === "Point") {
      const p = shapeVal.payload as PointPayload;
      const translated = p.map((c, i) => (c as number) + ((v[i] as number) ?? 0));
      return {
        type: shapeVal.type,
        payload: translated,
        provenance: makeProvenance(),
      };
    }

    if (kind === "Line") {
      const line = shapeVal.payload as LinePayload;
      const newPoint = (line.point as number[]).map((c, i) => c + ((v[i] as number) ?? 0));
      const result: LinePayload = { point: newPoint, direction: line.direction };
      if (line.implicit) {
        const dx = (v[0] as number) ?? 0;
        const dy = (v[1] as number) ?? 0;
        const { a, b, c } = line.implicit;
        result.implicit = { a, b, c: c - a * dx - b * dy };
      }
      return {
        type: shapeVal.type,
        payload: result,
        provenance: makeProvenance(),
      };
    }

    if (kind === "Circle") {
      const circle = shapeVal.payload as CirclePayload;
      const newCenter = (circle.center as number[]).map((c, i) => c + ((v[i] as number) ?? 0));
      return {
        type: shapeVal.type,
        payload: { center: newCenter, radius: circle.radius } as CirclePayload,
        provenance: makeProvenance(),
      };
    }

    if (kind === "Polygon") {
      const verts = shapeVal.payload as PolygonPayload;
      const translated = verts.map((vertex) =>
        (vertex as number[]).map((c, i) => c + ((v[i] as number) ?? 0)),
      );
      return {
        type: shapeVal.type,
        payload: translated as PolygonPayload,
        provenance: makeProvenance(),
      };
    }

    throw new GeometryError(
      `geom.translate: unsupported shape type "${kind}" (supported: Point, Line, Circle, Polygon)`,
    );
  },
  explain: {
    what: "Translates a geometric object (Point, Line, Circle, or Polygon) by a displacement vector.",
    why: "Translation is the simplest rigid transformation; it preserves shape, size, and orientation.",
    effect: (inputs) => {
      if (!inputs.shape || !inputs.vector) return "Connect a Shape and a Vector to translate.";
      return `Translated ${inputs.shape.type.kind} by the given vector.`;
    },
    impact: (_inputs, _output) =>
      "Outputs the same shape type with coordinates shifted by the vector.",
  },
};

function makeProvenance() {
  return {
    blockId: "geom.translate",
    inputs: ["shape", "vector"],
    computedAt: Date.now(),
    engine: "native" as const,
  };
}
