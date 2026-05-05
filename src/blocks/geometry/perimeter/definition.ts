import type { BlockDefinition } from "~/blocks/types";
import type { CirclePayload, MathValue, PolygonPayload } from "~/math/types";
import { distance, GeometryError } from "../geometry";

export const PerimeterBlock: BlockDefinition = {
  id: "geom.perimeter",
  label: "Perimeter",
  symbol: "P",
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
      id: "perimeter",
      label: "Perimeter",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const shapeVal = inputs.shape;
    if (shapeVal === undefined) throw new GeometryError("geom.perimeter: shape is required");

    let perimeter: number;
    const kind = shapeVal.type.kind;

    if (kind === "Polygon") {
      perimeter = polygonPerimeter(shapeVal.payload as PolygonPayload);
    } else if (kind === "Circle") {
      const c = shapeVal.payload as CirclePayload;
      perimeter = 2 * Math.PI * c.radius;
    } else {
      throw new GeometryError(
        `geom.perimeter: unsupported shape type "${kind}" (supported: Polygon, Circle)`,
      );
    }

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: perimeter,
      provenance: {
        blockId: "geom.perimeter",
        inputs: ["shape"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the perimeter of a Polygon (sum of side lengths) or circumference of a Circle (2πr).",
    why: "Perimeter underlies isoperimetric problems, fence-optimization, and any boundary-length measurement.",
    effect: (inputs) => {
      if (inputs.shape === undefined)
        return "Connect a Polygon or Circle to compute its perimeter.";
      const kind = inputs.shape.type.kind;
      if (kind === "Polygon") return "Sum of all side lengths (closed polygon).";
      if (kind === "Circle") return "Circumference of the circle (2πr).";
      return "Perimeter of the shape.";
    },
    impact: (_inputs, _output) =>
      "Outputs a Scalar (real, approximate) representing the perimeter.",
  },
};

function polygonPerimeter(vertices: PolygonPayload): number {
  const n = vertices.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const curr = vertices[i] ?? [];
    const next = vertices[(i + 1) % n] ?? [];
    total += distance(curr as number[], next as number[]);
  }
  return total;
}
