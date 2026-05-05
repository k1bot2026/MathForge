import type { BlockDefinition } from "~/blocks/types";
import type { CirclePayload, MathValue, PolygonPayload } from "~/math/types";
import { GeometryError } from "../geometry";

export const AreaBlock: BlockDefinition = {
  id: "geom.area",
  label: "Area",
  symbol: "A",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "shape",
      label: "Shape",
      type: { kind: "Polygon" },
    },
  ],
  outputs: [
    {
      id: "area",
      label: "Area",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const shapeVal = inputs.shape;
    if (shapeVal === undefined) throw new GeometryError("geom.area: shape is required");

    let area: number;
    const kind = shapeVal.type.kind;

    if (kind === "Polygon") {
      area = shoelaceArea(shapeVal.payload as PolygonPayload);
    } else if (kind === "Circle") {
      const c = shapeVal.payload as CirclePayload;
      area = Math.PI * c.radius * c.radius;
    } else {
      throw new GeometryError(
        `geom.area: unsupported shape type "${kind}" (supported: Polygon, Circle)`,
      );
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: area,
      provenance: {
        blockId: "geom.area",
        inputs: ["shape"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the area of a Polygon (shoelace formula) or Circle (πr²). Result is always non-negative.",
    why: "Area is the fundamental 2D measure underlying perimeter-area inequalities, integration, and polygon classification.",
    effect: (inputs) => {
      if (inputs.shape === undefined) return "Connect a Polygon or Circle to compute its area.";
      const kind = inputs.shape.type.kind;
      if (kind === "Polygon") return "Area of the polygon (shoelace formula).";
      if (kind === "Circle") return "Area of the circle (πr²).";
      return "Area of the shape.";
    },
    impact: (_inputs, _output) => "Outputs a Scalar (real, approximate) representing the area.",
  },
};

/**
 * Shoelace formula: A = ½|Σ(xᵢ yᵢ₊₁ − xᵢ₊₁ yᵢ)|
 * Works for any simple polygon (CW or CCW winding).
 */
function shoelaceArea(vertices: PolygonPayload): number {
  const n = vertices.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const curr = vertices[i] ?? [];
    const next = vertices[(i + 1) % n] ?? [];
    sum += (curr[0] ?? 0) * (next[1] ?? 0) - (next[0] ?? 0) * (curr[1] ?? 0);
  }
  return Math.abs(sum) / 2;
}
