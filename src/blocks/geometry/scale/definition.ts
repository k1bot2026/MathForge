import type { BlockDefinition } from "~/blocks/types";
import type {
  CirclePayload,
  LinePayload,
  MathValue,
  PointPayload,
  PolygonPayload,
} from "~/math/types";
import { GeometryError } from "../geometry";

export const ScaleBlock: BlockDefinition = {
  id: "geom.scale",
  label: "Scale",
  symbol: "S",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "shape", label: "Shape", type: { kind: "Point", n: "any" } },
    { id: "center", label: "Center", type: { kind: "Point", n: 2 } },
  ],
  outputs: [
    {
      id: "result",
      label: "Scaled",
      type: (inputTypes) => inputTypes.shape ?? { kind: "Point", n: 2 },
    },
  ],
  params: {
    factor: { kind: "number", default: 1, label: "Scale Factor" },
  },
  compute(inputs, params): MathValue {
    const shapeVal = inputs.shape;
    const centerVal = inputs.center;
    if (shapeVal === undefined) throw new GeometryError("geom.scale: shape is required");
    if (centerVal === undefined) throw new GeometryError("geom.scale: center is required");

    const k = typeof params.factor === "number" ? params.factor : 1;
    const cx = (centerVal.payload as PointPayload)[0] ?? 0;
    const cy = (centerVal.payload as PointPayload)[1] ?? 0;

    const kind = shapeVal.type.kind;

    if (kind === "Point") {
      return {
        type: shapeVal.type,
        payload: scalePoint(shapeVal.payload as number[], cx, cy, k),
        provenance: makeProvenance(),
      };
    }

    if (kind === "Line") {
      const line = shapeVal.payload as LinePayload;
      const newAnchor = scalePoint(line.point as number[], cx, cy, k);
      // Direction is unchanged (scaling is an affine map, direction vectors don't scale)
      return {
        type: shapeVal.type,
        payload: { point: newAnchor, direction: line.direction } as LinePayload,
        provenance: makeProvenance(),
      };
    }

    if (kind === "Circle") {
      const circle = shapeVal.payload as CirclePayload;
      return {
        type: shapeVal.type,
        payload: {
          center: scalePoint(circle.center as number[], cx, cy, k),
          radius: circle.radius * Math.abs(k),
        } as CirclePayload,
        provenance: makeProvenance(),
      };
    }

    if (kind === "Polygon") {
      const verts = shapeVal.payload as PolygonPayload;
      return {
        type: shapeVal.type,
        payload: verts.map((v) => scalePoint(v as number[], cx, cy, k)) as PolygonPayload,
        provenance: makeProvenance(),
      };
    }

    throw new GeometryError(
      `geom.scale: unsupported shape type "${kind}" (supported: Point, Line, Circle, Polygon)`,
    );
  },
  explain: {
    what: "Scales a geometric object (Point, Line, Circle, or Polygon) about a center by a scalar factor.",
    why: "Scaling (homothety) is the fundamental similarity transformation; compositions of scalings and rotations generate all direct similarities.",
    effect: (inputs) => {
      if (!inputs.shape || !inputs.center) return "Connect a Shape and Center to scale.";
      return `Scaled ${inputs.shape.type.kind} about the center point.`;
    },
    impact: (_inputs, _output) =>
      "Outputs the same shape type with coordinates scaled about the center.",
  },
};

function scalePoint(p: number[], cx: number, cy: number, k: number): number[] {
  const dx = (p[0] ?? 0) - cx;
  const dy = (p[1] ?? 0) - cy;
  return [cx + k * dx, cy + k * dy];
}

function makeProvenance() {
  return {
    blockId: "geom.scale",
    inputs: ["shape", "center"],
    computedAt: Date.now(),
    engine: "native" as const,
  };
}
