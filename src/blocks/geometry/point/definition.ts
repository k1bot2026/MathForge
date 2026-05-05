import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { GeometryError } from "../geometry";

export const PointBlock: BlockDefinition = {
  id: "geom.point",
  label: "Point",
  symbol: "P",
  category: "source",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [
    {
      id: "point",
      label: "P (point)",
      type: { kind: "Point", n: "any" },
    },
  ],
  params: {
    coords: {
      kind: "string",
      default: "0, 0",
      label: "Coordinates (comma-separated)",
    },
  },
  compute(_inputs, params): MathValue {
    const raw = typeof params.coords === "string" ? params.coords : "0, 0";
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parts.length < 1) {
      throw new GeometryError("geom.point: at least one coordinate is required");
    }

    const coords: number[] = parts.map((s, i) => {
      const v = Number(s);
      if (!Number.isFinite(v)) {
        throw new GeometryError(`geom.point: coordinate ${i + 1} is not a finite number ("${s}")`);
      }
      return v;
    });

    const n = coords.length;
    return {
      type: { kind: "Point", n },
      payload: coords,
      provenance: {
        blockId: "geom.point",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Defines a point in n-dimensional space from a comma-separated list of coordinates.",
    why: "A named, typed point can be passed into construction blocks (geom.line-from-points, geom.circle, etc.) and measurement blocks (geom.distance, geom.midpoint).",
    effect: (_inputs, output) => {
      const coords = output.payload as ReadonlyArray<number>;
      const label = coords.map((c) => c.toFixed(3)).join(", ");
      return `Point in ℝ${coords.length}: (${label})`;
    },
    impact: (_inputs, output) => {
      const coords = output.payload as ReadonlyArray<number>;
      return `Outputs a Point<${coords.length}> value.`;
    },
  },
};
