import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload } from "~/math/types";
import { GeometryError, lineFromTwoPoints, subtract } from "../geometry";

export const PerpendicularBisectorBlock: BlockDefinition = {
  id: "geom.perpendicular-bisector",
  label: "Perp. Bisector",
  symbol: "⊥",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "p1", label: "P₁", type: { kind: "Point", n: 2 } },
    { id: "p2", label: "P₂", type: { kind: "Point", n: 2 } },
  ],
  outputs: [{ id: "line", label: "Bisector", type: { kind: "Line", n: 2 } }],
  params: {},
  compute(inputs): MathValue {
    const p1Val = inputs.p1;
    const p2Val = inputs.p2;
    if (p1Val === undefined) throw new GeometryError("geom.perpendicular-bisector: P₁ is required");
    if (p2Val === undefined) throw new GeometryError("geom.perpendicular-bisector: P₂ is required");

    const p1 = p1Val.payload as PointPayload;
    const p2 = p2Val.payload as PointPayload;

    if (p1.length !== p2.length) {
      throw new GeometryError(
        `geom.perpendicular-bisector: dimension mismatch (${p1.length}D vs ${p2.length}D)`,
      );
    }
    if (p1.length !== 2) {
      throw new GeometryError("geom.perpendicular-bisector: only 2D points supported");
    }

    // Midpoint
    const mid: PointPayload = [
      ((p1[0] ?? 0) + (p2[0] ?? 0)) / 2,
      ((p1[1] ?? 0) + (p2[1] ?? 0)) / 2,
    ];

    // Perpendicular direction: rotate the segment direction by 90°
    // Segment direction (un-normalised): d = p2 - p1 = (dx, dy)
    // Perp direction: (-dy, dx) — already perpendicular; lineFromTwoPoints will normalise
    const d = subtract(p2, p1);
    const dx = d[0] ?? 0;
    const dy = d[1] ?? 0;
    // Build a second point along the perpendicular direction from mid
    const perpPt: PointPayload = [(mid[0] ?? 0) - dy, (mid[1] ?? 0) + dx];

    const payload = lineFromTwoPoints(mid, perpPt);

    return {
      type: { kind: "Line", n: 2 },
      payload,
      provenance: {
        blockId: "geom.perpendicular-bisector",
        inputs: ["p1", "p2"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Constructs the perpendicular bisector of segment P₁P₂: the line through the midpoint perpendicular to the segment.",
    why: "The perpendicular bisector is equidistant from both endpoints and is the key construction in circumcircle, Voronoi, and reflective symmetry algorithms.",
    effect: (inputs) => {
      if (inputs.p1 === undefined || inputs.p2 === undefined)
        return "Connect two points to construct their perpendicular bisector.";
      const fmt = (p: PointPayload) => `(${p.map((c) => c.toFixed(2)).join(", ")})`;
      return `Perpendicular bisector of ${fmt(inputs.p1.payload as PointPayload)} and ${fmt(inputs.p2.payload as PointPayload)}.`;
    },
    impact: (_inputs, _output) =>
      "Outputs a Line value for use in intersection and construction blocks.",
  },
};
