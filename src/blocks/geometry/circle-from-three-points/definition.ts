import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload } from "~/math/types";
import { GeometryError } from "../geometry";

/**
 * Circumcircle of three non-collinear 2D points.
 *
 * Solved by the perpendicular-bisector system:
 *   The center (h, k) satisfies |P1 - C|² = |P2 - C|² = |P3 - C|²
 * Expanding and subtracting pairs gives two linear equations in h, k.
 * Determinant of the 2×2 system equals twice the signed area of triangle
 * P1P2P3; it is zero iff the points are collinear.
 */
export const CircleFromThreePointsBlock: BlockDefinition = {
  id: "geom.circle-from-three-points",
  label: "Circumcircle",
  symbol: "⊙",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "p1", label: "P₁", type: { kind: "Point", n: 2 } },
    { id: "p2", label: "P₂", type: { kind: "Point", n: 2 } },
    { id: "p3", label: "P₃", type: { kind: "Point", n: 2 } },
  ],
  outputs: [{ id: "circle", label: "Circle", type: { kind: "Circle" } }],
  params: {},
  compute(inputs): MathValue {
    const p1Val = inputs.p1;
    const p2Val = inputs.p2;
    const p3Val = inputs.p3;
    if (p1Val === undefined)
      throw new GeometryError("geom.circle-from-three-points: P₁ is required");
    if (p2Val === undefined)
      throw new GeometryError("geom.circle-from-three-points: P₂ is required");
    if (p3Val === undefined)
      throw new GeometryError("geom.circle-from-three-points: P₃ is required");

    const p1 = p1Val.payload as PointPayload;
    const p2 = p2Val.payload as PointPayload;
    const p3 = p3Val.payload as PointPayload;

    if (p1.length !== 2 || p2.length !== 2 || p3.length !== 2) {
      throw new GeometryError("geom.circle-from-three-points: only 2D points supported");
    }

    const x1 = p1[0] ?? 0,
      y1 = p1[1] ?? 0;
    const x2 = p2[0] ?? 0,
      y2 = p2[1] ?? 0;
    const x3 = p3[0] ?? 0,
      y3 = p3[1] ?? 0;

    // System: (x2-x1)*h + (y2-y1)*k = (x2²-x1² + y2²-y1²) / 2
    //         (x3-x1)*h + (y3-y1)*k = (x3²-x1² + y3²-y1²) / 2
    const a11 = x2 - x1,
      a12 = y2 - y1;
    const a21 = x3 - x1,
      a22 = y3 - y1;
    const b1 = (x2 * x2 - x1 * x1 + y2 * y2 - y1 * y1) / 2;
    const b2 = (x3 * x3 - x1 * x1 + y3 * y3 - y1 * y1) / 2;

    const det = a11 * a22 - a12 * a21;
    if (Math.abs(det) < 1e-12) {
      throw new GeometryError(
        "geom.circle-from-three-points: points are collinear — no circumcircle exists",
      );
    }

    const h = (b1 * a22 - b2 * a12) / det;
    const k = (a11 * b2 - a21 * b1) / det;

    const dx = x1 - h,
      dy = y1 - k;
    const radius = Math.sqrt(dx * dx + dy * dy);

    return {
      type: { kind: "Circle" },
      payload: { center: [h, k], radius },
      provenance: {
        blockId: "geom.circle-from-three-points",
        inputs: ["p1", "p2", "p3"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Constructs the unique circle passing through three non-collinear 2D points (circumcircle). Solved via the perpendicular-bisector linear system.",
    why: "The circumcircle is fundamental to Delaunay triangulation, the Apollonius problem, and classical triangle geometry.",
    effect: (inputs) => {
      if (inputs.p1 === undefined || inputs.p2 === undefined || inputs.p3 === undefined)
        return "Connect three points to construct their circumcircle.";
      const fmt = (p: PointPayload) => `(${p.map((c) => c.toFixed(2)).join(", ")})`;
      return `Circumcircle of ${fmt(inputs.p1.payload as PointPayload)}, ${fmt(inputs.p2.payload as PointPayload)}, ${fmt(inputs.p3.payload as PointPayload)}.`;
    },
    impact: (_inputs, _output) =>
      "Outputs a Circle value for use in intersection, measurement, and visualization blocks.",
  },
};
