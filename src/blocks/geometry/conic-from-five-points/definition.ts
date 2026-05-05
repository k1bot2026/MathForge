import type { BlockDefinition } from "~/blocks/types";
import type { ConicPayload, MathValue, PointPayload } from "~/math/types";
import { GeometryError } from "../geometry";

/**
 * Solve for the null vector of a 5×6 matrix M (rows = points, cols = [A,B,C,D,E,F]).
 * Uses partial-pivot Gauss-Jordan to reduce to row echelon form, then back-substitutes
 * the one free variable. Returns [A,B,C,D,E,F] normalised so the largest coefficient = 1.
 */
function solveConic(M: number[][]): [number, number, number, number, number, number] {
  const rows = 5;
  const cols = 6;
  // Augment with a zero RHS (homogeneous system)
  const aug: number[][] = M.map((row) => [...row, 0]);

  // Forward elimination with partial pivoting — reduce to row echelon
  let pivotRow = 0;
  const pivotCols: number[] = [];
  for (let col = 0; col < cols && pivotRow < rows; col++) {
    // Find max magnitude in this column below pivotRow
    let maxR = pivotRow;
    for (let r = pivotRow + 1; r < rows; r++) {
      if (Math.abs(aug[r]?.[col] ?? 0) > Math.abs(aug[maxR]?.[col] ?? 0)) maxR = r;
    }
    if (Math.abs(aug[maxR]?.[col] ?? 0) < 1e-12) continue; // no pivot this col
    // Swap
    const tmp = aug[pivotRow] ?? [];
    aug[pivotRow] = aug[maxR] ?? [];
    aug[maxR] = tmp;
    // Normalise pivot row
    const p = aug[pivotRow]?.[col] ?? 1;
    for (let j = col; j <= cols; j++) {
      (aug[pivotRow] ?? [])[j] = (aug[pivotRow]?.[j] ?? 0) / p;
    }
    // Eliminate below
    for (let r = 0; r < rows; r++) {
      if (r === pivotRow) continue;
      const factor = aug[r]?.[col] ?? 0;
      for (let j = col; j <= cols; j++) {
        (aug[r] ?? [])[j] = (aug[r]?.[j] ?? 0) - factor * (aug[pivotRow]?.[j] ?? 0);
      }
    }
    pivotCols.push(col);
    pivotRow++;
  }

  if (pivotRow !== 5) {
    throw new GeometryError(
      "geom.conic-from-five-points: points are degenerate — no unique conic can be fitted",
    );
  }

  // One free variable: the column NOT in pivotCols
  const freeCol = [0, 1, 2, 3, 4, 5].find((c) => !pivotCols.includes(c)) ?? 5;

  // Set free variable = 1, back-substitute to find pivot variables
  const sol: number[] = [0, 0, 0, 0, 0, 0];
  sol[freeCol] = 1;
  for (let i = 0; i < 5; i++) {
    const pc = pivotCols[i] ?? 0;
    // aug[i][pc] = 1 (after RREF); sol[pc] = -aug[i][freeCol] * sol[freeCol]
    sol[pc] = -(aug[i]?.[freeCol] ?? 0) * 1;
  }

  // Normalise so largest absolute coefficient = 1
  const maxAbs = Math.max(...sol.map(Math.abs));
  if (maxAbs < 1e-15) {
    throw new GeometryError(
      "geom.conic-from-five-points: points are degenerate — no unique conic can be fitted",
    );
  }
  const norm = sol.map((v) => v / maxAbs);

  return [norm[0] ?? 0, norm[1] ?? 0, norm[2] ?? 0, norm[3] ?? 0, norm[4] ?? 0, norm[5] ?? 0];
}

export const ConicFromFivePointsBlock: BlockDefinition = {
  id: "geom.conic-from-five-points",
  label: "Conic from 5 Points",
  symbol: "⌒",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "p1", label: "P₁", type: { kind: "Point", n: 2 } },
    { id: "p2", label: "P₂", type: { kind: "Point", n: 2 } },
    { id: "p3", label: "P₃", type: { kind: "Point", n: 2 } },
    { id: "p4", label: "P₄", type: { kind: "Point", n: 2 } },
    { id: "p5", label: "P₅", type: { kind: "Point", n: 2 } },
  ],
  outputs: [{ id: "conic", label: "Conic", type: { kind: "Conic" } }],
  params: {},
  compute(inputs): MathValue {
    const vals = [inputs.p1, inputs.p2, inputs.p3, inputs.p4, inputs.p5];
    for (let i = 0; i < 5; i++) {
      if (vals[i] === undefined)
        throw new GeometryError(`geom.conic-from-five-points: P${i + 1} is required`);
    }

    const points = vals.map((v) => {
      const p = v?.payload as PointPayload;
      if (p.length !== 2) {
        throw new GeometryError("geom.conic-from-five-points: only 2D points supported");
      }
      return [p[0] ?? 0, p[1] ?? 0] as [number, number];
    });

    // Build 5×6 matrix: each row [x², xy, y², x, y, 1]
    const M: number[][] = points.map(([x, y]) => [x * x, x * y, y * y, x, y, 1]);

    const [A, B, C, D, E, F] = solveConic(M);
    const conic: ConicPayload = { A, B, C, D, E, F };

    return {
      type: { kind: "Conic" },
      payload: conic,
      provenance: {
        blockId: "geom.conic-from-five-points",
        inputs: ["p1", "p2", "p3", "p4", "p5"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Fits the unique conic section Ax²+Bxy+Cy²+Dx+Ey+F=0 through five 2D points. Solves the 5×6 homogeneous linear system for the null vector via Gauss-Jordan elimination with partial pivoting.",
    why: "Five points uniquely determine a conic (by Bézout's theorem). This is the key primitive for conic classification and Apollonius constructions.",
    effect: (inputs) => {
      const count = [inputs.p1, inputs.p2, inputs.p3, inputs.p4, inputs.p5].filter(
        (v) => v !== undefined,
      ).length;
      return count < 5
        ? `Connect ${5 - count} more point${count === 4 ? "" : "s"} to fit a conic.`
        : "Fitting conic through 5 points.";
    },
    impact: (_inputs, _output) =>
      "Outputs a Conic value for classification, intersection, and visualization.",
  },
};
