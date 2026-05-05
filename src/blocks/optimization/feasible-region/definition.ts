import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, SetPayload, VectorPayload } from "~/math/types";

export class FeasibleRegionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeasibleRegionError";
  }
}

const EPS = 1e-9;

function makeVector2(x: number, y: number): MathValue {
  return {
    type: { kind: "Vector", n: 2, field: "real" },
    payload: [x, y] as VectorPayload,
    provenance: {
      blockId: "opt.feasible-region",
      inputs: [],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}

// Solve 2×2 linear system [a,b;c,d][x;y] = [e;f]
function solve2x2(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): [number, number] | null {
  const det = a * d - b * c;
  if (Math.abs(det) < EPS) return null;
  return [(e * d - b * f) / det, (a * f - e * c) / det];
}

function isFeasible(
  x: number,
  y: number,
  A: ReadonlyArray<ReadonlyArray<number>>,
  b: ReadonlyArray<number>,
): boolean {
  if (x < -EPS || y < -EPS) return false;
  for (let i = 0; i < A.length; i++) {
    const lhs = (A[i]?.[0] ?? 0) * x + (A[i]?.[1] ?? 0) * y;
    if (lhs > (b[i] ?? 0) + EPS) return false;
  }
  return true;
}

// Deduplicate vertices by proximity (tolerance EPS)
function dedup(pts: [number, number][]): [number, number][] {
  const result: [number, number][] = [];
  for (const p of pts) {
    const dup = result.some((q) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6);
    if (!dup) result.push(p);
  }
  return result;
}

// Sort counterclockwise by angle around centroid
function sortCCW(pts: [number, number][]): [number, number][] {
  if (pts.length === 0) return pts;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [...pts].sort(
    (a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx),
  );
}

function computeVertices(
  A: ReadonlyArray<ReadonlyArray<number>>,
  b: ReadonlyArray<number>,
): [number, number][] {
  const m = A.length;
  const candidates: [number, number][] = [];

  // Constraint lines: A[i][0]*x + A[i][1]*y = b[i]
  // Axis lines: x = 0 (i.e., 1*x + 0*y = 0), y = 0 (i.e., 0*x + 1*y = 0)

  // Extended constraint set includes the two axis bounds
  const extA: ReadonlyArray<ReadonlyArray<number>> = [
    ...A,
    [1, 0], // x1 = some_value (used for intersection only)
    [0, 1], // x2 = some_value
  ];
  const extB: ReadonlyArray<number> = [...b, 0, 0];
  const total = extA.length;

  // Intersect every pair of constraint hyperplanes
  for (let i = 0; i < total; i++) {
    for (let j = i + 1; j < total; j++) {
      const pt = solve2x2(
        extA[i]?.[0] ?? 0,
        extA[i]?.[1] ?? 0,
        extA[j]?.[0] ?? 0,
        extA[j]?.[1] ?? 0,
        extB[i] ?? 0,
        extB[j] ?? 0,
      );
      if (pt !== null && isFeasible(pt[0], pt[1], A, b)) {
        candidates.push(pt);
      }
    }
  }

  // Check origin explicitly (it's always a candidate if feasible)
  if (isFeasible(0, 0, A, b)) {
    candidates.push([0, 0]);
  }

  // Also check intersections of each constraint with axes
  for (let i = 0; i < m; i++) {
    const a0 = extA[i]?.[0] ?? 0;
    const a1 = extA[i]?.[1] ?? 0;
    const bi = extB[i] ?? 0;
    // Intersection with x1=0: a1*x2 = bi → x2 = bi/a1
    if (Math.abs(a1) > EPS) {
      const x2 = bi / a1;
      if (isFeasible(0, x2, A, b)) candidates.push([0, x2]);
    }
    // Intersection with x2=0: a0*x1 = bi → x1 = bi/a0
    if (Math.abs(a0) > EPS) {
      const x1 = bi / a0;
      if (isFeasible(x1, 0, A, b)) candidates.push([x1, 0]);
    }
  }

  return sortCCW(dedup(candidates));
}

const LP_TYPE = {
  kind: "Tuple" as const,
  elements: [
    { kind: "Vector" as const, n: "any" as const, field: "real" as const },
    { kind: "Matrix" as const, m: "any" as const, n: "any" as const, field: "real" as const },
    { kind: "Vector" as const, n: "any" as const, field: "real" as const },
  ],
};

export const FeasibleRegionBlock: BlockDefinition = {
  id: "opt.feasible-region",
  label: "Feasible Region",
  symbol: "FR",
  category: "operation",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    {
      id: "lp",
      label: "LP (2D)",
      type: LP_TYPE,
    },
  ],
  outputs: [
    {
      id: "vertices",
      label: "Vertices",
      type: {
        kind: "Set",
        element: { kind: "Vector", n: 2, field: "real" },
      },
    },
  ],
  compute(inputs): MathValue {
    const lp = inputs.lp;
    if (lp === undefined)
      throw new FeasibleRegionError("opt.feasible-region: LP input is required");

    const [cVal, AVal, bVal] = lp.payload as [MathValue, MathValue, MathValue];
    if (cVal === undefined || AVal === undefined || bVal === undefined) {
      throw new FeasibleRegionError("opt.feasible-region: LP Tuple must contain (c, A, b)");
    }

    const c = cVal.payload as ReadonlyArray<number>;
    const A = AVal.payload as ReadonlyArray<ReadonlyArray<number>>;
    const b = bVal.payload as ReadonlyArray<number>;

    if (c.length !== 2) {
      throw new FeasibleRegionError(
        `opt.feasible-region: only 2-variable LPs are supported (got n=${c.length})`,
      );
    }

    const rawVertices = computeVertices(A, b);

    const vertexValues: ReadonlyArray<MathValue> = rawVertices.map(([x, y]) => makeVector2(x, y));

    return {
      type: { kind: "Set", element: { kind: "Vector", n: 2, field: "real" } },
      payload: vertexValues as SetPayload,
      provenance: {
        blockId: "opt.feasible-region",
        inputs: ["lp"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Computes the vertices of the feasible polytope for a 2D LP (x ∈ ℝ²). Finds all intersections of constraint hyperplanes, keeps those satisfying Ax ≤ b and x ≥ 0, and returns them sorted counterclockwise.",
    why: "The feasible region of a bounded 2D LP is a convex polygon. Its vertices are where the optimal solution must lie (fundamental theorem of LP). Wire to viz.feasible-polytope to render the region.",
    effect: (inputs) => {
      if (inputs.lp === undefined)
        return "Connect a 2D LP (from opt.lp-standard with n=2) to port lp.";
      const [cVal, , bVal] = inputs.lp.payload as [MathValue, MathValue, MathValue];
      const n = cVal ? (cVal.payload as ReadonlyArray<number>).length : 0;
      const m = bVal ? (bVal.payload as ReadonlyArray<number>).length : 0;
      return `2D LP: ${n} variables, ${m} constraints. Computing feasible polytope vertices.`;
    },
    impact: (_inputs, output) => {
      const count = (output.payload as SetPayload).length;
      return `Feasible polytope has ${count} vertices.`;
    },
  },
};
