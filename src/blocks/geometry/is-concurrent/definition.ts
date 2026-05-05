import type { BlockDefinition } from "~/blocks/types";
import type { LinePayload, MathValue } from "~/math/types";
import { GeometryError } from "../geometry";

const CONCURRENT_EPSILON = 1e-9;

/**
 * Finds the intersection of two 2D parametric lines (if any).
 * Returns [t, s] for line1(t) = point + t*dir, or null if parallel.
 */
function intersect2D(p1: LinePayload, p2: LinePayload): [number, number] | null {
  const dx = p1.direction[0] ?? 0;
  const dy = p1.direction[1] ?? 0;
  const ex = p2.direction[0] ?? 0;
  const ey = p2.direction[1] ?? 0;
  const denom = dx * ey - dy * ex;
  if (Math.abs(denom) < 1e-15) return null;
  const bx = (p2.point[0] ?? 0) - (p1.point[0] ?? 0);
  const by = (p2.point[1] ?? 0) - (p1.point[1] ?? 0);
  const t = (bx * ey - by * ex) / denom;
  const s = (bx * dy - by * dx) / denom;
  return [t, s];
}

export const IsConcurrentBlock: BlockDefinition = {
  id: "geom.is-concurrent?",
  label: "Concurrent?",
  symbol: "⊕?",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "l1", label: "Line 1", type: { kind: "Line", n: 2 } },
    { id: "l2", label: "Line 2", type: { kind: "Line", n: 2 } },
    { id: "l3", label: "Line 3", type: { kind: "Line", n: 2 } },
  ],
  outputs: [
    {
      id: "result",
      label: "Concurrent?",
      type: { kind: "Scalar", field: "boolean", precision: "exact" },
    },
  ],
  params: {},
  compute(inputs): MathValue {
    const v1 = inputs.l1;
    const v2 = inputs.l2;
    const v3 = inputs.l3;
    if (v1 === undefined) throw new GeometryError("geom.is-concurrent?: Line 1 is required");
    if (v2 === undefined) throw new GeometryError("geom.is-concurrent?: Line 2 is required");
    if (v3 === undefined) throw new GeometryError("geom.is-concurrent?: Line 3 is required");

    const line1 = v1.payload as LinePayload;
    const line2 = v2.payload as LinePayload;
    const line3 = v3.payload as LinePayload;

    // Find intersection of l1 and l2
    const ts = intersect2D(line1, line2);
    if (ts === null) {
      // l1 ∥ l2: concurrent only if l3 is also parallel to both and all three are the same line
      // (degenerate case — treat as not concurrent)
      return makeResult(false);
    }
    const [t] = ts;
    const ix = (line1.point[0] ?? 0) + t * (line1.direction[0] ?? 0);
    const iy = (line1.point[1] ?? 0) + t * (line1.direction[1] ?? 0);

    // Check if l3 passes through (ix, iy)
    // Point on l3: line3.point + s * line3.direction = (ix, iy)
    // Cross product of (ix-px, iy-py) with direction should be near zero
    const px = line3.point[0] ?? 0;
    const py = line3.point[1] ?? 0;
    const dx = line3.direction[0] ?? 0;
    const dy = line3.direction[1] ?? 0;
    const cross = (ix - px) * dy - (iy - py) * dx;
    const concurrent = Math.abs(cross) < CONCURRENT_EPSILON;

    return makeResult(concurrent);
  },
  explain: {
    what: "Tests whether three 2D lines are concurrent (all pass through a single common point).",
    why: "Concurrence characterises classical constructions: medians, altitudes, and angle bisectors of a triangle are concurrent at the centroid, orthocentre, and incentre respectively.",
    effect: (inputs) => {
      if (!inputs.l1 || !inputs.l2 || !inputs.l3)
        return "Connect three Lines to test for concurrence.";
      return "True if all three lines share a common point; false otherwise.";
    },
    impact: (_inputs, _output) => "Outputs a Scalar(boolean, exact).",
  },
};

function makeResult(value: boolean): MathValue {
  return {
    type: { kind: "Scalar", field: "boolean", precision: "exact" },
    payload: value,
    provenance: {
      blockId: "geom.is-concurrent?",
      inputs: ["l1", "l2", "l3"],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
