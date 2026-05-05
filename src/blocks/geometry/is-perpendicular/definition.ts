import type { BlockDefinition } from "~/blocks/types";
import type { LinePayload, MathValue } from "~/math/types";
import { GeometryError } from "../geometry";

const PERPENDICULAR_EPSILON = 1e-10;

export const IsPerpendicularBlock: BlockDefinition = {
  id: "geom.is-perpendicular?",
  label: "Perpendicular?",
  symbol: "⊥?",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "l1", label: "Line 1", type: { kind: "Line", n: 2 } },
    { id: "l2", label: "Line 2", type: { kind: "Line", n: 2 } },
  ],
  outputs: [
    {
      id: "result",
      label: "Perpendicular?",
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const v1 = inputs.l1;
    const v2 = inputs.l2;
    if (v1 === undefined) throw new GeometryError("geom.is-perpendicular?: Line 1 is required");
    if (v2 === undefined) throw new GeometryError("geom.is-perpendicular?: Line 2 is required");

    const l1 = v1.payload as LinePayload;
    const l2 = v2.payload as LinePayload;

    // Perpendicular iff dot(d1, d2) = 0.
    const dx1 = l1.direction[0] ?? 0;
    const dy1 = l1.direction[1] ?? 0;
    const dx2 = l2.direction[0] ?? 0;
    const dy2 = l2.direction[1] ?? 0;
    const dotProduct = dx1 * dx2 + dy1 * dy2;
    const perpendicular = Math.abs(dotProduct) < PERPENDICULAR_EPSILON;

    return {
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
      payload: perpendicular,
      provenance: {
        blockId: "geom.is-perpendicular?",
        inputs: ["l1", "l2"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Tests whether two 2D lines are perpendicular (dot product of direction vectors is near zero).",
    why: "Perpendicularity is the foundation of right-angle constructions, rectangular grids, and orthogonal decompositions.",
    effect: (inputs) => {
      if (!inputs.l1 || !inputs.l2) return "Connect two Lines to test for perpendicularity.";
      return "True if the lines meet at a right angle; false otherwise.";
    },
    impact: (_inputs, _output) => "Outputs a Scalar(boolean, exact).",
  },
};
