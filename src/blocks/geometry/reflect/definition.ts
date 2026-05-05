import type { BlockDefinition } from "~/blocks/types";
import type {
  CirclePayload,
  LinePayload,
  MathValue,
  PointPayload,
  PolygonPayload,
} from "~/math/types";
import { GeometryError, lineFromTwoPoints } from "../geometry";

export const ReflectBlock: BlockDefinition = {
  id: "geom.reflect",
  label: "Reflect",
  symbol: "M",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "shape", label: "Shape", type: { kind: "Point", n: "any" } },
    { id: "line", label: "Mirror Line", type: { kind: "Line", n: 2 } },
  ],
  outputs: [
    {
      id: "result",
      label: "Reflected",
      type: (inputTypes) => inputTypes.shape ?? { kind: "Point", n: 2 },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const shapeVal = inputs.shape;
    const lineVal = inputs.line;
    if (shapeVal === undefined) throw new GeometryError("geom.reflect: shape is required");
    if (lineVal === undefined) throw new GeometryError("geom.reflect: mirror line is required");

    const mirror = lineVal.payload as LinePayload;
    const kind = shapeVal.type.kind;

    if (kind === "Point") {
      return {
        type: shapeVal.type,
        payload: reflectPoint(shapeVal.payload as PointPayload, mirror),
        provenance: makeProvenance(),
      };
    }

    if (kind === "Line") {
      const line = shapeVal.payload as LinePayload;
      const newAnchor = reflectPoint(line.point as number[], mirror);
      const tipPoint = (line.point as number[]).map((c, i) => c + (line.direction[i] ?? 0));
      const newTip = reflectPoint(tipPoint, mirror);
      return {
        type: shapeVal.type,
        payload: lineFromTwoPoints(newAnchor, newTip),
        provenance: makeProvenance(),
      };
    }

    if (kind === "Circle") {
      const circle = shapeVal.payload as CirclePayload;
      return {
        type: shapeVal.type,
        payload: {
          center: reflectPoint(circle.center as number[], mirror),
          radius: circle.radius,
        } as CirclePayload,
        provenance: makeProvenance(),
      };
    }

    if (kind === "Polygon") {
      const verts = shapeVal.payload as PolygonPayload;
      return {
        type: shapeVal.type,
        payload: verts.map((v) => reflectPoint(v as number[], mirror)) as PolygonPayload,
        provenance: makeProvenance(),
      };
    }

    throw new GeometryError(
      `geom.reflect: unsupported shape type "${kind}" (supported: Point, Line, Circle, Polygon)`,
    );
  },
  explain: {
    what: "Reflects a geometric object (Point, Line, Circle, or Polygon) across a mirror line.",
    why: "Reflection generates the other orientation class of isometries (indirect/improper symmetries); every isometry is a composition of at most 3 reflections.",
    effect: (inputs) => {
      if (!inputs.shape || !inputs.line) return "Connect a Shape and Mirror Line to reflect.";
      return `Reflected ${inputs.shape.type.kind} across the mirror line.`;
    },
    impact: (_inputs, _output) =>
      "Outputs the same shape type with coordinates reflected across the line.",
  },
};

/**
 * Reflect a 2D point p across a line given by anchor + direction.
 * Formula: p' = 2 * proj(p onto line) - p
 */
function reflectPoint(p: number[] | ReadonlyArray<number>, mirror: LinePayload): number[] {
  const px = (p[0] as number) ?? 0;
  const py = (p[1] as number) ?? 0;
  const ax = mirror.point[0] ?? 0;
  const ay = mirror.point[1] ?? 0;
  const dx = mirror.direction[0] ?? 0;
  const dy = mirror.direction[1] ?? 0;
  // Vector from anchor to p
  const vx = px - ax;
  const vy = py - ay;
  // Projection onto direction (unit vector)
  const t = vx * dx + vy * dy;
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  // Reflect: p' = 2*proj - p
  return [2 * projX - px, 2 * projY - py];
}

function makeProvenance() {
  return {
    blockId: "geom.reflect",
    inputs: ["shape", "line"],
    computedAt: Date.now(),
    engine: "native" as const,
  };
}
