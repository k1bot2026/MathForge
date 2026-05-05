import type { BlockDefinition } from "~/blocks/types";
import type { LinePayload, MathValue, PointPayload } from "~/math/types";
import { GeometryError } from "../geometry";

export const ProjectBlock: BlockDefinition = {
  id: "geom.project",
  label: "Project",
  symbol: "π",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "point", label: "Point", type: { kind: "Point", n: "any" } },
    { id: "line", label: "Line", type: { kind: "Line", n: 2 } },
  ],
  outputs: [
    {
      id: "projection",
      label: "Projection",
      type: { kind: "Point", n: 2 },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const pointVal = inputs.point;
    const lineVal = inputs.line;
    if (pointVal === undefined) throw new GeometryError("geom.project: point is required");
    if (lineVal === undefined) throw new GeometryError("geom.project: line is required");

    const p = pointVal.payload as PointPayload;
    const line = lineVal.payload as LinePayload;

    const ax = line.point[0] ?? 0;
    const ay = line.point[1] ?? 0;
    const dx = line.direction[0] ?? 0;
    const dy = line.direction[1] ?? 0;
    const px = (p[0] as number) ?? 0;
    const py = (p[1] as number) ?? 0;

    // t = dot(p - anchor, direction)
    const t = (px - ax) * dx + (py - ay) * dy;
    const projX = ax + t * dx;
    const projY = ay + t * dy;

    return {
      type: { kind: "Point", n: 2 },
      payload: [projX, projY],
      provenance: {
        blockId: "geom.project",
        inputs: ["point", "line"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the orthogonal projection of a point onto a line (the closest point on the line to the given point).",
    why: "Orthogonal projection underlies distance-from-line computation, component extraction, and least-squares interpretations.",
    effect: (inputs) => {
      if (!inputs.point || !inputs.line)
        return "Connect a Point and a Line to compute the orthogonal projection.";
      return "Foot of the perpendicular from the point to the line.";
    },
    impact: (_inputs, _output) => "Outputs a Point(n=2) — the foot of the perpendicular.",
  },
};
