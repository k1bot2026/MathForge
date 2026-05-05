import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload } from "~/math/types";
import { cross3, GeometryError, subtract } from "../geometry";

const COLLINEAR_EPSILON = 1e-10;

export const IsCollinearBlock: BlockDefinition = {
  id: "geom.is-collinear?",
  label: "Collinear?",
  symbol: "∥?",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "a", label: "A", type: { kind: "Point", n: "any" } },
    { id: "b", label: "B", type: { kind: "Point", n: "any" } },
    { id: "c", label: "C", type: { kind: "Point", n: "any" } },
  ],
  outputs: [
    {
      id: "result",
      label: "Collinear?",
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const aVal = inputs.a;
    const bVal = inputs.b;
    const cVal = inputs.c;
    if (aVal === undefined) throw new GeometryError("geom.is-collinear?: A is required");
    if (bVal === undefined) throw new GeometryError("geom.is-collinear?: B is required");
    if (cVal === undefined) throw new GeometryError("geom.is-collinear?: C is required");

    const pa = aVal.payload as PointPayload;
    const pb = bVal.payload as PointPayload;
    const pc = cVal.payload as PointPayload;

    const ab = subtract(pb, pa);
    const ac = subtract(pc, pa);

    let collinear: boolean;
    if (pa.length === 3) {
      // 3D: cross product must be (near) zero
      const cross = cross3(ab, ac);
      const mag = Math.sqrt(cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2);
      collinear = mag < COLLINEAR_EPSILON;
    } else {
      // 2D (or projected): 2D cross product = ab.x*ac.y - ab.y*ac.x
      const abx = ab[0] ?? 0;
      const aby = ab[1] ?? 0;
      const acx = ac[0] ?? 0;
      const acy = ac[1] ?? 0;
      collinear = Math.abs(abx * acy - aby * acx) < COLLINEAR_EPSILON;
    }

    return {
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
      payload: collinear,
      provenance: {
        blockId: "geom.is-collinear?",
        inputs: ["a", "b", "c"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Tests whether three points A, B, C are collinear (lie on a common line) within a tolerance of 1e-10.",
    why: "Collinearity underlies degenerate-case detection, polygon validity checks, and geometric proof verification.",
    effect: (inputs) => {
      if (!inputs.a || !inputs.b || !inputs.c)
        return "Connect three Points to test for collinearity.";
      return "True if A, B, C are collinear; false otherwise.";
    },
    impact: (_inputs, _output) => "Outputs a Scalar(boolean, exact).",
  },
};
