// Revised simplex method (tableau form) for LP in standard form:
//   minimize cᵀx  subject to  Ax ≤ b,  x ≥ 0
//
// Converts to slack form: Ax + s = b, minimizes cᵀx.
// Uses Bland's rule for pivot selection to guarantee termination.
// Returns { x, objectiveValue } or throws SimplexError on infeasibility/unboundedness.

export class SimplexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimplexError";
  }
}

const EPS = 1e-10;
const MAX_ITER = 10_000;

export type SimplexResult = {
  x: ReadonlyArray<number>;
  objectiveValue: number;
};

export function solveLP(
  c: ReadonlyArray<number>,
  A: ReadonlyArray<ReadonlyArray<number>>,
  b: ReadonlyArray<number>,
): SimplexResult {
  const m = b.length; // constraints
  const n = c.length; // variables

  if (A.length !== m) {
    throw new SimplexError(`A has ${A.length} rows but b has ${m} entries`);
  }

  // Require b ≥ 0 (standard assumption after converting ≤ to = with slacks).
  for (let i = 0; i < m; i++) {
    if ((b[i] ?? 0) < -EPS) {
      throw new SimplexError(
        `opt.simplex requires b ≥ 0 in all constraints (b[${i}] = ${b[i]}). ` +
          "Negate the constraint row to put it in standard form.",
      );
    }
  }

  // Build the tableau: [A | I | b]
  // Rows: m constraint rows + 1 objective row
  // Cols: n original vars + m slack vars + 1 RHS
  const cols = n + m + 1;
  const tableau: number[][] = [];

  for (let i = 0; i < m; i++) {
    const row = new Array<number>(cols).fill(0);
    for (let j = 0; j < n; j++) {
      row[j] = A[i]?.[j] ?? 0;
    }
    row[n + i] = 1; // slack variable
    row[cols - 1] = b[i] ?? 0;
    tableau.push(row);
  }

  // Objective row: store c directly (minimize cᵀx).
  // Pivot on columns where reduced cost < 0 (entering variable improves objective).
  // RHS accumulates the objective value as pivots eliminate basic variable costs.
  const objRow = new Array<number>(cols).fill(0);
  for (let j = 0; j < n; j++) {
    objRow[j] = c[j] ?? 0;
  }
  tableau.push(objRow);

  // Basis: initially the slack variables (columns n..n+m-1)
  const basis = Array.from({ length: m }, (_, i) => n + i);

  // Simplex iterations
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const obj = tableau[m];
    if (obj === undefined) break;

    // Bland's rule: choose the leftmost column with negative reduced cost
    let pivotCol = -1;
    for (let j = 0; j < n + m; j++) {
      if ((obj[j] ?? 0) < -EPS) {
        pivotCol = j;
        break;
      }
    }
    if (pivotCol === -1) break; // optimal

    // Minimum ratio test
    let pivotRow = -1;
    let minRatio = Infinity;
    for (let i = 0; i < m; i++) {
      const row = tableau[i];
      if (row === undefined) continue;
      const elem = row[pivotCol] ?? 0;
      if (elem > EPS) {
        const rhs = row[cols - 1] ?? 0;
        const ratio = rhs / elem;
        if (ratio < minRatio - EPS) {
          minRatio = ratio;
          pivotRow = i;
        }
      }
    }

    if (pivotRow === -1) {
      throw new SimplexError("opt.simplex: LP is unbounded");
    }

    basis[pivotRow] = pivotCol;

    // Pivot: normalize pivot row
    const pivotRow_ = tableau[pivotRow];
    if (pivotRow_ === undefined) break;
    const pivotElem = pivotRow_[pivotCol] ?? 1;
    for (let j = 0; j < cols; j++) {
      pivotRow_[j] = (pivotRow_[j] ?? 0) / pivotElem;
    }

    // Eliminate pivot column from all other rows (including objective row)
    for (let i = 0; i <= m; i++) {
      if (i === pivotRow) continue;
      const row = tableau[i];
      if (row === undefined) continue;
      const factor = row[pivotCol] ?? 0;
      if (Math.abs(factor) < EPS) continue;
      for (let j = 0; j < cols; j++) {
        row[j] = (row[j] ?? 0) - factor * (pivotRow_[j] ?? 0);
      }
    }
  }

  // Extract solution
  const x = new Array<number>(n).fill(0);
  for (let i = 0; i < m; i++) {
    const bv = basis[i];
    if (bv !== undefined && bv < n) {
      const row = tableau[i];
      x[bv] = row?.[cols - 1] ?? 0;
    }
  }

  // Objective value: the objective row RHS tracks -z (row operations negate it),
  // so the true minimum value is the negative of the stored RHS.
  const objRow2 = tableau[m];
  const objectiveValue = -(objRow2?.[cols - 1] ?? 0);

  return { x, objectiveValue };
}
