import type { BlockDefinition } from "~/blocks/types";
import type {
  CirclePayload,
  LinePayload,
  MathValue,
  PointPayload,
  PolygonPayload,
} from "~/math/types";
import { GeometryError, lineFromTwoPoints } from "../geometry";

export const RotateBlock: BlockDefinition = {
  id: "geom.rotate",
  label: "Rotate",
  symbol: "R",
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
      label: "Rotated",
      type: (inputTypes) => inputTypes.shape ?? { kind: "Point", n: 2 },
    },
  ],
  params: {
    angle: { kind: "number", default: 0, label: "Angle (rad)" },
  },
  compute(inputs, params): MathValue {
    const shapeVal = inputs.shape;
    const centerVal = inputs.center;
    if (shapeVal === undefined) throw new GeometryError("geom.rotate: shape is required");
    if (centerVal === undefined) throw new GeometryError("geom.rotate: center is required");

    const angle = typeof params.angle === "number" ? params.angle : 0;
    const cx = (centerVal.payload as PointPayload)[0] ?? 0;
    const cy = (centerVal.payload as PointPayload)[1] ?? 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const kind = shapeVal.type.kind;

    if (kind === "Point") {
      const p = shapeVal.payload as PointPayload;
      return {
        type: shapeVal.type,
        payload: rotatePoint(p as number[], cx, cy, cos, sin),
        provenance: makeProvenance(),
      };
    }

    if (kind === "Line") {
      const line = shapeVal.payload as LinePayload;
      const newAnchor = rotatePoint(line.point as number[], cx, cy, cos, sin);
      const dx = line.direction[0] ?? 0;
      const dy = line.direction[1] ?? 0;
      const newDirection = [cos * dx - sin * dy, sin * dx + cos * dy];
      // Recompute from two points to get fresh implicit form
      const secondPoint = [
        (newAnchor[0] ?? 0) + (newDirection[0] ?? 0),
        (newAnchor[1] ?? 0) + (newDirection[1] ?? 0),
      ];
      return {
        type: shapeVal.type,
        payload: lineFromTwoPoints(newAnchor, secondPoint as number[]),
        provenance: makeProvenance(),
      };
    }

    if (kind === "Circle") {
      const circle = shapeVal.payload as CirclePayload;
      return {
        type: shapeVal.type,
        payload: {
          center: rotatePoint(circle.center as number[], cx, cy, cos, sin),
          radius: circle.radius,
        } as CirclePayload,
        provenance: makeProvenance(),
      };
    }

    if (kind === "Polygon") {
      const verts = shapeVal.payload as PolygonPayload;
      return {
        type: shapeVal.type,
        payload: verts.map((v) => rotatePoint(v as number[], cx, cy, cos, sin)) as PolygonPayload,
        provenance: makeProvenance(),
      };
    }

    throw new GeometryError(
      `geom.rotate: unsupported shape type "${kind}" (supported: Point, Line, Circle, Polygon)`,
    );
  },
  explain: {
    what: "Rotates a geometric object (Point, Line, Circle, or Polygon) about a center point by an angle in radians.",
    why: "Rotation is a fundamental rigid transformation; composing rotations generates SO(2) symmetries.",
    effect: (inputs) => {
      if (!inputs.shape || !inputs.center) return "Connect a Shape and Center to rotate.";
      return `Rotated ${inputs.shape.type.kind} about the center point.`;
    },
    impact: (_inputs, _output) =>
      "Outputs the same shape type with coordinates rotated about the center.",
  },
};

function rotatePoint(p: number[], cx: number, cy: number, cos: number, sin: number): number[] {
  const dx = (p[0] ?? 0) - cx;
  const dy = (p[1] ?? 0) - cy;
  return [cx + cos * dx - sin * dy, cy + sin * dx + cos * dy];
}

function makeProvenance() {
  return {
    blockId: "geom.rotate",
    inputs: ["shape", "center"],
    computedAt: Date.now(),
    engine: "native" as const,
  };
}
