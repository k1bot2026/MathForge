import type { BlockDefinition } from "~/blocks/types";
import type { LinePayload, MathValue, PointPayload, PolygonPayload } from "~/math/types";
import { GeometryError } from "../geometry";

export const GlideBlock: BlockDefinition = {
  id: "geom.glide",
  label: "Glide Reflection",
  symbol: "G",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "shape", label: "Shape", type: { kind: "Point", n: 2 } },
    { id: "line", label: "Mirror Line", type: { kind: "Line", n: 2 } },
  ],
  outputs: [
    {
      id: "result",
      label: "Glide Image",
      type: (inputTypes) => inputTypes.shape ?? { kind: "Point", n: 2 },
    },
  ],
  params: {
    dx: { kind: "number", default: 0, label: "Translation dx" },
    dy: { kind: "number", default: 0, label: "Translation dy" },
  },
  compute(inputs, params): MathValue {
    const shapeVal = inputs.shape;
    const lineVal = inputs.line;
    if (shapeVal === undefined) throw new GeometryError("geom.glide: shape is required");
    if (lineVal === undefined) throw new GeometryError("geom.glide: mirror line is required");

    const dx = typeof params.dx === "number" ? params.dx : 0;
    const dy = typeof params.dy === "number" ? params.dy : 0;
    const mirror = lineVal.payload as LinePayload;

    const kind = shapeVal.type.kind;

    if (kind === "Point") {
      const p = shapeVal.payload as PointPayload;
      return {
        type: shapeVal.type,
        payload: glidePoint(p as number[], dx, dy, mirror),
        provenance: makeProvenance(),
      };
    }

    if (kind === "Polygon") {
      const verts = shapeVal.payload as PolygonPayload;
      return {
        type: shapeVal.type,
        payload: verts.map((v) => glidePoint(v as number[], dx, dy, mirror)) as PolygonPayload,
        provenance: makeProvenance(),
      };
    }

    throw new GeometryError(
      `geom.glide: unsupported shape type "${kind}" (supported: Point, Polygon)`,
    );
  },
  explain: {
    what: "Applies a glide reflection: first translates the shape by (dx, dy), then reflects across the given mirror line.",
    why: "Glide reflection is the fourth type of 2D isometry (after translation, rotation, reflection) and appears in frieze and wallpaper symmetry groups.",
    effect: (inputs) => {
      if (!inputs.shape || !inputs.line)
        return "Connect a Shape and Mirror Line to apply a glide reflection.";
      return `Glide-reflected ${inputs.shape.type.kind}: translated then reflected.`;
    },
    impact: (_inputs, _output) => "Outputs the same shape type after the glide reflection.",
  },
};

function reflectPoint2D(p: number[], mirror: LinePayload): number[] {
  const px = p[0] ?? 0;
  const py = p[1] ?? 0;
  const ax = mirror.point[0] ?? 0;
  const ay = mirror.point[1] ?? 0;
  const dirx = mirror.direction[0] ?? 0;
  const diry = mirror.direction[1] ?? 0;
  const vx = px - ax;
  const vy = py - ay;
  const t = vx * dirx + vy * diry;
  const projX = ax + t * dirx;
  const projY = ay + t * diry;
  return [2 * projX - px, 2 * projY - py];
}

function glidePoint(p: number[], dx: number, dy: number, mirror: LinePayload): number[] {
  const translated = [(p[0] ?? 0) + dx, (p[1] ?? 0) + dy];
  return reflectPoint2D(translated, mirror);
}

function makeProvenance() {
  return {
    blockId: "geom.glide",
    inputs: ["shape", "line"],
    computedAt: Date.now(),
    engine: "native" as const,
  };
}
