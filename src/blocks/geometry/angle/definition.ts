import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload } from "~/math/types";
import { dot, GeometryError, norm, subtract } from "../geometry";

export const AngleBlock: BlockDefinition = {
  id: "geom.angle",
  label: "Angle",
  symbol: "∠",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "a", label: "A", type: { kind: "Point", n: "any" } },
    { id: "b", label: "Vertex", type: { kind: "Point", n: "any" } },
    { id: "c", label: "C", type: { kind: "Point", n: "any" } },
  ],
  outputs: [
    {
      id: "angle",
      label: "Angle (rad)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const aVal = inputs.a;
    const bVal = inputs.b;
    const cVal = inputs.c;
    if (bVal === undefined) throw new GeometryError("geom.angle: vertex B is required");
    if (aVal === undefined) throw new GeometryError("geom.angle: A is required");
    if (cVal === undefined) throw new GeometryError("geom.angle: C is required");

    const pA = aVal.payload as PointPayload;
    const pB = bVal.payload as PointPayload;
    const pC = cVal.payload as PointPayload;

    // Angle ∠ABC: at vertex B, between rays BA and BC
    const arm1 = subtract(pA, pB);
    const arm2 = subtract(pC, pB);
    const n1 = norm(arm1);
    const n2 = norm(arm2);

    if (n1 < 1e-12) throw new GeometryError("geom.angle: A is too close to B");
    if (n2 < 1e-12) throw new GeometryError("geom.angle: C is too close to B");

    // cos θ = (arm1 · arm2) / (|arm1| |arm2|)
    const cosTheta = Math.max(-1, Math.min(1, dot(arm1, arm2) / (n1 * n2)));
    const theta = Math.acos(cosTheta);

    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: theta,
      provenance: {
        blockId: "geom.angle",
        inputs: ["a", "b", "c"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the angle ∠ABC at vertex B between rays BA and BC. Result is in radians ∈ [0, π].",
    why: "The interior angle is the central quantity in polygon classification, trigonometric identities, and rotation measurements.",
    effect: (inputs) => {
      if (inputs.a === undefined || inputs.b === undefined || inputs.c === undefined)
        return "Connect three points (A, Vertex, C) to compute the angle at the vertex.";
      return "Angle at the vertex in radians.";
    },
    impact: (_inputs, _output) =>
      "Outputs a Scalar (radians) usable in measurement and transformation blocks.",
  },
};
