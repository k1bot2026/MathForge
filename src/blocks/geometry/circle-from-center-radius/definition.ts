import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload } from "~/math/types";
import { GeometryError } from "../geometry";

export const CircleFromCenterRadiusBlock: BlockDefinition = {
  id: "geom.circle-from-center-radius",
  label: "Circle",
  symbol: "○",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "center",
      label: "Center",
      type: { kind: "Point", n: 2 },
    },
  ],
  outputs: [
    {
      id: "circle",
      label: "Circle",
      type: { kind: "Circle" },
    },
  ],
  params: {
    radius: { kind: "string", label: "Radius", default: "1" },
  },
  compute(inputs, params): MathValue {
    const centerVal = inputs.center;
    if (centerVal === undefined)
      throw new GeometryError("geom.circle-from-center-radius: center is required");

    const center = centerVal.payload as PointPayload;
    if (center.length !== 2) {
      throw new GeometryError(
        `geom.circle-from-center-radius: only 2D circles supported (got ${center.length}D center)`,
      );
    }

    const radiusRaw = params.radius ?? "1";
    const radius = Number(radiusRaw);
    if (!Number.isFinite(radius) || Number.isNaN(radius)) {
      throw new GeometryError(
        `geom.circle-from-center-radius: radius is not a valid number: ${radiusRaw}`,
      );
    }
    if (radius <= 0) {
      throw new GeometryError(
        `geom.circle-from-center-radius: radius must be positive (got ${radius})`,
      );
    }

    return {
      type: { kind: "Circle" },
      payload: { center, radius },
      provenance: {
        blockId: "geom.circle-from-center-radius",
        inputs: ["center"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Constructs a 2D circle from a center point and a radius.",
    why: "The center-radius form is the canonical circle representation, directly usable for distance, intersection, and area computations.",
    effect: (inputs) => {
      if (inputs.center === undefined) return "Connect a center point and set a radius.";
      const center = inputs.center.payload as PointPayload;
      const fmt = (p: PointPayload) => `(${p.map((c) => c.toFixed(2)).join(", ")})`;
      return `Circle centered at ${fmt(center)}.`;
    },
    impact: (_inputs, _output) =>
      "Outputs a Circle value for use in intersection, measurement, and visualization blocks.",
  },
};
