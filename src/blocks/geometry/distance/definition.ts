import type { BlockDefinition } from "~/blocks/types";
import type { LinePayload, MathValue, PointPayload } from "~/math/types";
import { distance as euclideanDist, GeometryError } from "../geometry";

export const DistanceBlock: BlockDefinition = {
  id: "geom.distance",
  label: "Distance",
  symbol: "d",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "a", label: "A", type: { kind: "Point", n: "any" } },
    { id: "b", label: "B", type: { kind: "Point", n: "any" } },
  ],
  outputs: [
    {
      id: "distance",
      label: "Distance",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const aVal = inputs.a;
    const bVal = inputs.b;
    if (aVal === undefined) throw new GeometryError("geom.distance: A is required");
    if (bVal === undefined) throw new GeometryError("geom.distance: B is required");

    const aKind = aVal.type.kind;
    const bKind = bVal.type.kind;

    let dist: number;

    if (aKind === "Point" && bKind === "Point") {
      // Point-to-point Euclidean distance
      const pa = aVal.payload as PointPayload;
      const pb = bVal.payload as PointPayload;
      dist = euclideanDist(pa, pb);
    } else if (aKind === "Point" && bKind === "Line") {
      // Point-to-line: |ax₀ + by₀ + c| / sqrt(a²+b²), using normalised implicit form
      const pt = aVal.payload as PointPayload;
      const line = bVal.payload as LinePayload;
      dist = pointToLineDist(pt, line);
    } else if (aKind === "Line" && bKind === "Point") {
      const pt = bVal.payload as PointPayload;
      const line = aVal.payload as LinePayload;
      dist = pointToLineDist(pt, line);
    } else {
      throw new GeometryError(
        `geom.distance: unsupported combination ${aKind}–${bKind} (supported: Point–Point, Point–Line)`,
      );
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: dist,
      provenance: {
        blockId: "geom.distance",
        inputs: ["a", "b"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the distance between two geometric objects. Supports: Point–Point (Euclidean), Point–Line (perpendicular distance).",
    why: "Distance is the fundamental metric of Euclidean geometry, underlying all proximity, congruence, and optimisation computations.",
    impact: (_inputs, _output) => "Outputs a Scalar (real, approximate) representing the distance.",
  },
};

function pointToLineDist(pt: PointPayload, line: LinePayload): number {
  if (line.implicit !== undefined) {
    // Use the normalised implicit form: normal = (a,b) is already unit-length
    const { a, b, c } = line.implicit;
    const x = pt[0] ?? 0;
    const y = pt[1] ?? 0;
    // If normal is unit-length (which lineFromTwoPoints / lineFromEquation guarantee), denom = 1
    const normalLen = Math.sqrt(a * a + b * b);
    return Math.abs(a * x + b * y + c) / (normalLen < 1e-15 ? 1 : normalLen);
  }
  // Parametric fallback: project pt onto line, measure residual
  const lp = line.point;
  const ld = line.direction;
  const lx = lp[0] ?? 0;
  const ly = lp[1] ?? 0;
  const dx = (pt[0] ?? 0) - lx;
  const dy = (pt[1] ?? 0) - ly;
  const dirx = ld[0] ?? 0;
  const diry = ld[1] ?? 0;
  const t = dx * dirx + dy * diry;
  const projX = lx + t * dirx;
  const projY = ly + t * diry;
  return Math.sqrt(((pt[0] ?? 0) - projX) ** 2 + ((pt[1] ?? 0) - projY) ** 2);
}
