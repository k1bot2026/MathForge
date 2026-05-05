import type { BlockDefinition } from "~/blocks/types";
import type { CirclePayload, LinePayload, MathValue } from "~/math/types";
import { GeometryError } from "../geometry";

const TANGENT_EPSILON = 1e-9;

export const IntersectionBlock: BlockDefinition = {
  id: "geom.intersection",
  label: "Intersection",
  symbol: "∩",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "a", label: "A", type: { kind: "Line", n: 2 } },
    { id: "b", label: "B", type: { kind: "Line", n: 2 } },
  ],
  outputs: [
    {
      id: "points",
      label: "Intersection Points",
      type: { kind: "Set", element: { kind: "Point", n: 2 } },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const aVal = inputs.a;
    const bVal = inputs.b;
    if (aVal === undefined) throw new GeometryError("geom.intersection: A is required");
    if (bVal === undefined) throw new GeometryError("geom.intersection: B is required");

    const aKind = aVal.type.kind;
    const bKind = bVal.type.kind;

    let points: number[][];

    if (aKind === "Line" && bKind === "Line") {
      points = lineLine(aVal.payload as LinePayload, bVal.payload as LinePayload);
    } else if (aKind === "Line" && bKind === "Circle") {
      points = lineCircle(aVal.payload as LinePayload, bVal.payload as CirclePayload);
    } else if (aKind === "Circle" && bKind === "Line") {
      points = lineCircle(bVal.payload as LinePayload, aVal.payload as CirclePayload);
    } else if (aKind === "Circle" && bKind === "Circle") {
      points = circleCircle(aVal.payload as CirclePayload, bVal.payload as CirclePayload);
    } else {
      throw new GeometryError(
        `geom.intersection: unsupported combination ${aKind}–${bKind} (supported: Line–Line, Line–Circle, Circle–Circle)`,
      );
    }

    return {
      type: { kind: "Set", element: { kind: "Point", n: 2 } },
      payload: points,
      provenance: {
        blockId: "geom.intersection",
        inputs: ["a", "b"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes intersection points of two geometric objects. Supports: Line–Line (0 or 1 point), Line–Circle (0, 1, or 2 points), Circle–Circle (0, 1, or 2 points).",
    why: "Intersection is the fundamental operation of Euclidean constructions — straightedge and compass reduce to line-line, line-circle, and circle-circle intersections.",
    effect: (inputs) => {
      if (!inputs.a || !inputs.b) return "Connect two geometric objects to find intersections.";
      return `Intersection of ${inputs.a.type.kind} and ${inputs.b.type.kind}.`;
    },
    impact: (_inputs, _output) =>
      "Outputs a Set<Point(n=2)>. Empty set if no intersection, singleton if tangent.",
  },
};

function lineLine(l1: LinePayload, l2: LinePayload): number[][] {
  const dx1 = l1.direction[0] ?? 0;
  const dy1 = l1.direction[1] ?? 0;
  const dx2 = l2.direction[0] ?? 0;
  const dy2 = l2.direction[1] ?? 0;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-15) return [];
  const bx = (l2.point[0] ?? 0) - (l1.point[0] ?? 0);
  const by = (l2.point[1] ?? 0) - (l1.point[1] ?? 0);
  const t = (bx * dy2 - by * dx2) / denom;
  const ix = (l1.point[0] ?? 0) + t * dx1;
  const iy = (l1.point[1] ?? 0) + t * dy1;
  return [[ix, iy]];
}

function lineCircle(line: LinePayload, circle: CirclePayload): number[][] {
  const cx = circle.center[0] ?? 0;
  const cy = circle.center[1] ?? 0;
  const r = circle.radius;
  const dx = line.direction[0] ?? 0;
  const dy = line.direction[1] ?? 0;
  const ox = (line.point[0] ?? 0) - cx;
  const oy = (line.point[1] ?? 0) - cy;

  // Parametric: (ox + t*dx)² + (oy + t*dy)² = r²
  const a = dx * dx + dy * dy; // = 1 if direction is unit
  const b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - r * r;
  const disc = b * b - 4 * a * c;

  if (disc < -TANGENT_EPSILON) return [];
  if (disc < TANGENT_EPSILON) {
    const t = -b / (2 * a);
    return [[cx + (line.point[0] ?? 0) - cx + t * dx, cy + (line.point[1] ?? 0) - cy + t * dy]];
  }
  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  const p1 = [(line.point[0] ?? 0) + t1 * dx, (line.point[1] ?? 0) + t1 * dy];
  const p2 = [(line.point[0] ?? 0) + t2 * dx, (line.point[1] ?? 0) + t2 * dy];
  return [p1, p2];
}

function circleCircle(c1: CirclePayload, c2: CirclePayload): number[][] {
  const x1 = c1.center[0] ?? 0;
  const y1 = c1.center[1] ?? 0;
  const x2 = c2.center[0] ?? 0;
  const y2 = c2.center[1] ?? 0;
  const r1 = c1.radius;
  const r2 = c2.radius;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d < 1e-15) return []; // concentric
  if (d > r1 + r2 + TANGENT_EPSILON) return []; // too far apart
  if (d < Math.abs(r1 - r2) - TANGENT_EPSILON) return []; // one inside other

  // Radical axis distance from c1 along c1→c2
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;

  if (h2 < -TANGENT_EPSILON) return [];

  const midX = x1 + (a / d) * dx;
  const midY = y1 + (a / d) * dy;

  if (h2 < TANGENT_EPSILON) return [[midX, midY]];

  const h = Math.sqrt(h2);
  const perpX = (h / d) * dy;
  const perpY = (h / d) * dx;
  return [
    [midX + perpX, midY - perpY],
    [midX - perpX, midY + perpY],
  ];
}
