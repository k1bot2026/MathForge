import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload } from "~/math/types";
import { GeometryError, lineFromTwoPoints } from "../geometry";

export const LineFromPointsBlock: BlockDefinition = {
  id: "geom.line-from-points",
  label: "Line from Points",
  symbol: "→",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "p1",
      label: "P₁",
      type: { kind: "Point", n: "any" },
    },
    {
      id: "p2",
      label: "P₂",
      type: { kind: "Point", n: "any" },
    },
  ],
  outputs: [
    {
      id: "line",
      label: "Line",
      type: { kind: "Line", n: 2 },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const p1Val = inputs.p1;
    const p2Val = inputs.p2;
    if (p1Val === undefined) throw new GeometryError("geom.line-from-points: P₁ is required");
    if (p2Val === undefined) throw new GeometryError("geom.line-from-points: P₂ is required");

    const p1 = p1Val.payload as PointPayload;
    const p2 = p2Val.payload as PointPayload;

    if (p1.length !== p2.length) {
      throw new GeometryError(
        `geom.line-from-points: P₁ and P₂ must have the same dimension (${p1.length} ≠ ${p2.length})`,
      );
    }
    if (p1.length < 2 || p1.length > 3) {
      throw new GeometryError(
        `geom.line-from-points: only 2D and 3D lines supported (got ${p1.length}D)`,
      );
    }

    const n = p1.length as 2 | 3;
    const payload = lineFromTwoPoints(p1, p2);

    return {
      type: { kind: "Line", n },
      payload,
      provenance: {
        blockId: "geom.line-from-points",
        inputs: ["p1", "p2"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Constructs a line through two distinct points P₁ and P₂. Stores in parametric form (point + unit direction). Caches implicit ax+by+c=0 form for 2D lines.",
    why: "The canonical line through two points is the foundation for intersection, perpendicular bisector, and angle bisector constructions.",
    effect: (inputs) => {
      if (inputs.p1 === undefined || inputs.p2 === undefined)
        return "Connect two points to construct a line.";
      const p1 = inputs.p1.payload as PointPayload;
      const p2 = inputs.p2.payload as PointPayload;
      const fmt = (p: PointPayload) => `(${p.map((c) => c.toFixed(2)).join(", ")})`;
      return `Line through ${fmt(p1)} and ${fmt(p2)}.`;
    },
    impact: (_inputs, _output) =>
      "Outputs a Line value for use in construction and measurement blocks.",
  },
};
