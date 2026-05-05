import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload } from "~/math/types";
import { GeometryError } from "../geometry";

export const RegularPolygonBlock: BlockDefinition = {
  id: "geom.regular-polygon",
  label: "Regular Polygon",
  symbol: "⬡",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [{ id: "center", label: "Center", type: { kind: "Point", n: 2 } }],
  outputs: [{ id: "polygon", label: "Polygon", type: { kind: "Polygon" } }],
  params: {
    n: { kind: "string", label: "Sides", default: "6" },
    radius: { kind: "string", label: "Circumradius", default: "1" },
  },
  compute(inputs, params): MathValue {
    const centerVal = inputs.center;
    if (centerVal === undefined)
      throw new GeometryError("geom.regular-polygon: center is required");

    const center = centerVal.payload as PointPayload;
    if (center.length !== 2) {
      throw new GeometryError("geom.regular-polygon: only 2D centers supported");
    }

    const nRaw = params.n ?? "6";
    const rRaw = params.radius ?? "1";

    const n = Math.round(Number(nRaw));
    const r = Number(rRaw);

    if (!Number.isFinite(n) || Number.isNaN(n) || n < 3) {
      throw new GeometryError(`geom.regular-polygon: n must be an integer ≥ 3 (got ${nRaw})`);
    }
    if (!Number.isFinite(r) || r <= 0) {
      throw new GeometryError(`geom.regular-polygon: radius must be positive (got ${rRaw})`);
    }

    const cx = center[0] ?? 0;
    const cy = center[1] ?? 0;

    // First vertex at angle 0 (pointing right); vertices ordered counter-clockwise.
    const vertices = Array.from({ length: n }, (_, i) => {
      const angle = (2 * Math.PI * i) / n;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });

    return {
      type: { kind: "Polygon" },
      payload: vertices,
      provenance: {
        blockId: "geom.regular-polygon",
        inputs: ["center"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Constructs a regular n-gon inscribed in a circle of given circumradius centered at the given point. Vertices are ordered counter-clockwise starting at angle 0.",
    why: "Regular polygons are the canonical test objects for transformation invariants and the building blocks of tilings and fractal constructions.",
    effect: (inputs, _output) => {
      if (inputs.center === undefined) return "Connect a center point and set n and radius.";
      const center = inputs.center.payload as PointPayload;
      return `Regular polygon centered at (${(center[0] ?? 0).toFixed(2)}, ${(center[1] ?? 0).toFixed(2)}).`;
    },
    impact: (_inputs, _output) =>
      "Outputs a Polygon value for use in measurement and visualization blocks.",
  },
};
