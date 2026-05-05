import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PolygonPayload } from "~/math/types";
import { GeometryError } from "../geometry";

export const CentroidBlock: BlockDefinition = {
  id: "geom.centroid",
  label: "Centroid",
  symbol: "G",
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
      id: "centroid",
      label: "Centroid",
      type: (inputTypes) => {
        const t = inputTypes.shape;
        const n = t?.kind === "Polygon" ? 2 : 2;
        return { kind: "Point", n };
      },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const shapeVal = inputs.shape;
    if (shapeVal === undefined) throw new GeometryError("geom.centroid: shape is required");

    const kind = shapeVal.type.kind;
    if (kind !== "Polygon") {
      throw new GeometryError(
        `geom.centroid: unsupported shape type "${kind}" (supported: Polygon)`,
      );
    }

    const verts = shapeVal.payload as PolygonPayload;
    const n = verts.length;
    if (n === 0) throw new GeometryError("geom.centroid: polygon has no vertices");

    const dim = (verts[0] ?? []).length;
    const centroid = Array.from({ length: dim }, (_, d) => {
      const sum = verts.reduce((acc, v) => acc + ((v as number[])[d] ?? 0), 0);
      return sum / n;
    });

    return {
      type: { kind: "Point", n: dim },
      payload: centroid,
      provenance: {
        blockId: "geom.centroid",
        inputs: ["shape"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the centroid (centre of mass) of a polygon as the arithmetic mean of its vertices.",
    why: "The centroid is the balance point of a uniform polygon and is central in moment-of-inertia calculations and computational geometry.",
    effect: (inputs) => {
      if (inputs.shape === undefined) return "Connect a Polygon to compute its centroid.";
      return "Centroid point (mean of all vertices).";
    },
    impact: (_inputs, _output) => "Outputs a Point at the centroid of the polygon.",
  },
};
