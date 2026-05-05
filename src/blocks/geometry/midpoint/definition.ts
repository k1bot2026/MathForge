import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload } from "~/math/types";
import { GeometryError } from "../geometry";

export const MidpointBlock: BlockDefinition = {
  id: "geom.midpoint",
  label: "Midpoint",
  symbol: "M",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "p1", label: "P₁", type: { kind: "Point", n: "any" } },
    { id: "p2", label: "P₂", type: { kind: "Point", n: "any" } },
  ],
  outputs: [
    {
      id: "midpoint",
      label: "Midpoint",
      type: (inputTypes) => {
        const p1Type = inputTypes.p1;
        const n = p1Type?.kind === "Point" ? p1Type.n : 2;
        return { kind: "Point", n };
      },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const p1Val = inputs.p1;
    const p2Val = inputs.p2;
    if (p1Val === undefined) throw new GeometryError("geom.midpoint: P₁ is required");
    if (p2Val === undefined) throw new GeometryError("geom.midpoint: P₂ is required");

    const p1 = p1Val.payload as PointPayload;
    const p2 = p2Val.payload as PointPayload;

    if (p1.length !== p2.length) {
      throw new GeometryError(`geom.midpoint: dimension mismatch (${p1.length}D vs ${p2.length}D)`);
    }

    const mid = p1.map((c, i) => (c + (p2[i] ?? 0)) / 2);
    const n = p1.length;

    return {
      type: { kind: "Point", n },
      payload: mid,
      provenance: {
        blockId: "geom.midpoint",
        inputs: ["p1", "p2"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the midpoint between two points of the same dimension.",
    why: "The midpoint is the fundamental primitive for bisection, constructing perpendicular bisectors, and dividing segments.",
    effect: (inputs) => {
      if (inputs.p1 === undefined || inputs.p2 === undefined)
        return "Connect two points to compute their midpoint.";
      const fmt = (p: PointPayload) => `(${p.map((c) => c.toFixed(2)).join(", ")})`;
      return `Midpoint of ${fmt(inputs.p1.payload as PointPayload)} and ${fmt(inputs.p2.payload as PointPayload)}.`;
    },
    impact: (_inputs, _output) =>
      "Outputs a Point value usable in any construction or measurement block.",
  },
};
