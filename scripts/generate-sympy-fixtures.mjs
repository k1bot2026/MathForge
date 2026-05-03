/**
 * SymPy fixture generator — runs once offline, writes JSON to
 * tests/fixtures/sympy/. Vitest tests then load these files for
 * cross-engine comparison without touching a browser Worker.
 *
 * Usage:
 *   node scripts/generate-sympy-fixtures.mjs
 *
 * The script must be re-run whenever the SymPy reference values need to
 * change (e.g. new blocks, extended parameter ranges). Commit the
 * resulting JSON files alongside any new cross-engine tests.
 *
 * To add a new fixture set:
 *   1. Write a new async function `generate<Name>(py)` below.
 *   2. Call it in `main()` and write its result to a new
 *      `tests/fixtures/sympy/<name>.json` file.
 *   3. Add a corresponding typed accessor to `tests/sympy-reference.ts`.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPyodide } from "pyodide";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = resolve(ROOT, "tests/fixtures/sympy");
const PYODIDE_INDEX = resolve(
  ROOT,
  "node_modules/.pnpm/pyodide@0.29.3/node_modules/pyodide/",
);

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Write a fixture JSON file, pretty-printed for easy diffing. */
function writeFixture(name, data) {
  const path = resolve(FIXTURES_DIR, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`  wrote ${path.replace(ROOT + "/", "")}`);
}

// ──────────────────────────────────────────────────────────────────────────
// la.vector — dot product and norm fixtures
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference values for:
 *   - dot product: a · b
 *   - L2 norm:     ||a||
 *
 * Inputs are integer vectors of length 1–4 in range [-8, 8].
 * Exact rational arithmetic in SymPy so results are exact integers or Floats.
 */
async function generateVectorArithmetic(py) {
  const cases = [];

  // Hand-picked cases that cover boundary values and interesting geometry.
  const pairs = [
    // [a, b]
    [[0], [0]],
    [[1], [1]],
    [[-1], [1]],
    [[3], [-4]],
    [[1, 0], [0, 1]],
    [[3, 4], [3, 4]],
    [[3, 4], [-4, 3]],
    [[1, 2, 3], [4, 5, 6]],
    [[-1, -2], [1, 2]],
    [[0, 0, 0], [1, 2, 3]],
    [[2, -3, 5], [-1, 4, -2]],
    [[1, 0, 0, 0], [0, 1, 0, 0]],
    [[1, 2, 3, 4], [4, 3, 2, 1]],
    [[7, -8], [8, 7]],
    [[-5, 0], [0, -5]],
  ];

  for (const [a, b] of pairs) {
    const result = py.runPython(`
from sympy import Matrix, sqrt, Rational, nsimplify
import json

a = Matrix(${JSON.stringify(a)})
b = Matrix(${JSON.stringify(b)})

dot = int(a.dot(b))
# norm squared as exact integer to avoid irrational sqrt serialisation
norm_a_sq = int(a.dot(a))
norm_b_sq = int(b.dot(b))

json.dumps({"dot": dot, "normASq": norm_a_sq, "normBSq": norm_b_sq})
`);
    const parsed = JSON.parse(result);
    cases.push({ a, b, ...parsed });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference dot-product and squared-norm values computed by SymPy 1.13.x with exact integer arithmetic.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.matrix — arithmetic identity fixtures
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference values for:
 *   - matrix multiplication: A · B
 *   - matrix-vector product: A · v
 *   - transpose:             A^T
 *   - trace:                 tr(A)  (square matrices only)
 *   - determinant:           det(A) (square matrices only)
 *
 * All inputs are integer matrices to guarantee exact SymPy results.
 * Sizes: 1×1 through 4×4 for square ops; 2×3 × 3×2 for non-square matmul.
 */
async function generateMatrixArithmetic(py) {
  const cases = [];

  const matrixInputs = [
    // square 1×1
    {
      A: [[3]],
      B: [[7]],
      v: [2],
    },
    // square 2×2
    {
      A: [
        [1, 2],
        [3, 4],
      ],
      B: [
        [5, 6],
        [7, 8],
      ],
      v: [1, -1],
    },
    {
      A: [
        [0, -1],
        [1, 0],
      ],
      B: [
        [0, 1],
        [-1, 0],
      ],
      v: [1, 0],
    },
    {
      A: [
        [2, -3],
        [-1, 4],
      ],
      B: [
        [1, 0],
        [0, 1],
      ],
      v: [5, -2],
    },
    // square 3×3
    {
      A: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      B: [
        [9, 8, 7],
        [6, 5, 4],
        [3, 2, 1],
      ],
      v: [1, 0, -1],
    },
    {
      A: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      B: [
        [2, 3, 4],
        [5, 6, 7],
        [8, 9, 10],
      ],
      v: [3, -2, 1],
    },
    // square 4×4
    {
      A: [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
      ],
      B: [
        [16, 15, 14, 13],
        [12, 11, 10, 9],
        [8, 7, 6, 5],
        [4, 3, 2, 1],
      ],
      v: [1, -1, 1, -1],
    },
  ];

  for (const { A, B, v } of matrixInputs) {
    const result = py.runPython(`
from sympy import Matrix
import json

A = Matrix(${JSON.stringify(A)})
B = Matrix(${JSON.stringify(B)})
v = Matrix(${JSON.stringify(v)})

AB = A * B
Av = A * v
At = A.T
tr_A = int(A.trace())
det_A = int(A.det())

def mat_to_list(m):
    return [[int(m[r, c]) for c in range(m.cols)] for r in range(m.rows)]

def vec_to_list(m):
    return [int(m[i, 0]) for i in range(m.rows)]

json.dumps({
  "AB": mat_to_list(AB),
  "Av": vec_to_list(Av),
  "At": mat_to_list(At),
  "trA": tr_A,
  "detA": det_A
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      A,
      B,
      v,
      AB: parsed.AB,
      Av: parsed.Av,
      At: parsed.At,
      trA: parsed.trA,
      detA: parsed.detA,
    });
  }

  // Non-square matmul: A is m×k, B is k×n
  const nonSquareCases = [
    {
      A: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      B: [
        [7, 8],
        [9, 10],
        [11, 12],
      ],
    },
    {
      A: [
        [1, 0, -1],
        [0, 2, 1],
      ],
      B: [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
    },
  ];

  const nonSquareResults = [];
  for (const { A, B } of nonSquareCases) {
    const result = py.runPython(`
from sympy import Matrix
import json
A = Matrix(${JSON.stringify(A)})
B = Matrix(${JSON.stringify(B)})
AB = A * B
json.dumps({"AB": [[int(AB[r, c]) for c in range(AB.cols)] for r in range(AB.rows)]})
`);
    const parsed = JSON.parse(result);
    nonSquareResults.push({ A, B, AB: parsed.AB });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference matrix-multiplication, matvec, transpose, trace, and determinant values computed by SymPy 1.13.x with exact integer arithmetic.",
    squareCases: cases,
    nonSquareCases: nonSquareResults,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.det multiplicativity — det(A·B) === det(A) · det(B)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference values verifying the multiplicativity of det:
 *   det(A · B) = det(A) · det(B)
 *
 * Covers square matrix sizes 2×2 through 4×4 with integer entries.
 * Uses invertible pairs so det values are interesting (non-zero).
 * Each case records: A, B, det(A), det(B), A·B, det(A·B).
 */
async function generateDetMultiplicativity(py) {
  const matrixPairs = [
    // 2×2 — various non-singular cases
    {
      A: [
        [1, 2],
        [3, 5],
      ],
      B: [
        [2, 1],
        [1, 3],
      ],
    },
    {
      A: [
        [2, -1],
        [1, 3],
      ],
      B: [
        [3, 2],
        [-1, 1],
      ],
    },
    {
      A: [
        [1, 0],
        [0, -1],
      ],
      B: [
        [4, 3],
        [2, 1],
      ],
    },
    {
      A: [
        [5, 2],
        [3, 1],
      ],
      B: [
        [1, -2],
        [-3, 5],
      ],
    },
    // 3×3
    {
      A: [
        [1, 0, 1],
        [0, 2, 0],
        [1, 0, 3],
      ],
      B: [
        [2, 1, 0],
        [1, 3, 1],
        [0, 1, 2],
      ],
    },
    {
      A: [
        [1, 2, 3],
        [0, 1, 4],
        [5, 6, 0],
      ],
      B: [
        [1, 0, 0],
        [0, 2, 0],
        [0, 0, 3],
      ],
    },
    // 4×4
    {
      A: [
        [1, 0, 0, 1],
        [0, 2, 0, 0],
        [0, 0, 3, 0],
        [1, 0, 0, 4],
      ],
      B: [
        [2, 1, 0, 0],
        [1, 3, 1, 0],
        [0, 1, 2, 1],
        [0, 0, 1, 3],
      ],
    },
    // singular pair — det should be 0 on both sides
    {
      A: [
        [1, 2],
        [2, 4],
      ],
      B: [
        [3, 1],
        [1, 2],
      ],
    },
  ];

  const cases = [];
  for (const { A, B } of matrixPairs) {
    const result = py.runPython(`
from sympy import Matrix
import json

A = Matrix(${JSON.stringify(A)})
B = Matrix(${JSON.stringify(B)})
AB = A * B

det_A = int(A.det())
det_B = int(B.det())
det_AB = int(AB.det())

def mat_to_list(m):
    return [[int(m[r, c]) for c in range(m.cols)] for r in range(m.rows)]

json.dumps({
  "detA": det_A,
  "detB": det_B,
  "AB": mat_to_list(AB),
  "detAB": det_AB
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      A,
      B,
      detA: parsed.detA,
      detB: parsed.detB,
      AB: parsed.AB,
      detAB: parsed.detAB,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference values for det(A·B) = det(A)·det(B) computed by SymPy 1.13.x. Covers 2×2 through 4×4 integer matrices including a singular pair.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.add / la.sub / la.trace — element-wise and diagonal fixtures
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference values for:
 *   - element-wise addition:    A + B
 *   - element-wise subtraction: A - B
 *   - trace:                    tr(A) (square matrices only)
 *
 * All inputs are integer matrices so SymPy returns exact integers.
 * Shapes covered: 1×1, 2×2, 2×3 (non-square), 3×3, 4×4.
 */
async function generateAddSubTrace(py) {
  const pairs = [
    // 1×1
    { A: [[3]], B: [[7]] },
    { A: [[-2]], B: [[2]] },
    // 2×2
    {
      A: [
        [1, 2],
        [3, 4],
      ],
      B: [
        [5, 6],
        [7, 8],
      ],
    },
    {
      A: [
        [0, -1],
        [1, 0],
      ],
      B: [
        [0, 1],
        [-1, 0],
      ],
    },
    {
      A: [
        [3, -2],
        [1, 5],
      ],
      B: [
        [-3, 2],
        [-1, -5],
      ],
    },
    // 2×3 (non-square — no trace)
    {
      A: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      B: [
        [7, 8, 9],
        [1, 2, 3],
      ],
    },
    {
      A: [
        [0, -1, 2],
        [-3, 4, -5],
      ],
      B: [
        [1, 0, -1],
        [2, -3, 4],
      ],
    },
    // 3×3
    {
      A: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      B: [
        [9, 8, 7],
        [6, 5, 4],
        [3, 2, 1],
      ],
    },
    {
      A: [
        [2, 0, 0],
        [0, 3, 0],
        [0, 0, 5],
      ],
      B: [
        [-1, 1, 0],
        [0, -1, 1],
        [1, 0, -1],
      ],
    },
    // 4×4
    {
      A: [
        [1, 0, 0, 1],
        [0, 2, 0, 0],
        [0, 0, 3, 0],
        [1, 0, 0, 4],
      ],
      B: [
        [0, 1, 0, 0],
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [0, 0, 1, 0],
      ],
    },
  ];

  const cases = [];
  for (const { A, B } of pairs) {
    const result = py.runPython(`
from sympy import Matrix
import json

A = Matrix(${JSON.stringify(A)})
B = Matrix(${JSON.stringify(B)})

ApB = A + B
AmB = A - B

def mat_to_list(m):
    return [[int(m[r, c]) for c in range(m.cols)] for r in range(m.rows)]

payload = {
  "ApB": mat_to_list(ApB),
  "AmB": mat_to_list(AmB),
}

# trace is only defined for square matrices
is_square = A.rows == A.cols
if is_square:
    payload["trA"] = int(A.trace())
    payload["trB"] = int(B.trace())
    payload["trApB"] = int(ApB.trace())

json.dumps(payload)
`);
    const parsed = JSON.parse(result);
    const entry = { A, B, ApB: parsed.ApB, AmB: parsed.AmB };
    if (parsed.trA !== undefined) {
      Object.assign(entry, {
        trA: parsed.trA,
        trB: parsed.trB,
        trApB: parsed.trApB,
      });
    }
    cases.push(entry);
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference values for A+B, A-B, and tr(A) computed by SymPy 1.13.x with exact integer arithmetic. Covers 1×1, 2×2, 2×3, 3×3, 4×4 integer matrices.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.transpose — exact reference values for the involution property
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference (A, Aᵀ) pairs for la.transpose cross-engine tests.
 * Covers square sizes 2×2, 3×3, 4×4 plus non-square 2×3 and 3×2.
 * Each case records: A, At (Aᵀ computed by SymPy).
 * SymPy guarantees exact integer results for integer inputs.
 */
async function generateTransposeCases(py) {
  const matrices = [
    // 2×2
    [
      [1, 2],
      [3, 4],
    ],
    [
      [0, -1],
      [1, 0],
    ],
    [
      [5, -3],
      [2, 7],
    ],
    // 3×3
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [2, -1, 3],
      [0, 4, -2],
      [1, 1, 5],
    ],
    // 4×4
    [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ],
    // 2×3 non-square
    [
      [1, 2, 3],
      [4, 5, 6],
    ],
    // 3×2 non-square
    [
      [1, 4],
      [2, 5],
      [3, 6],
    ],
    // 1×4 row vector (edge: becomes 4×1)
    [[1, -2, 3, -4]],
  ];

  const cases = [];
  for (const A of matrices) {
    const result = py.runPython(`
from sympy import Matrix
import json

A = Matrix(${JSON.stringify(A)})
At = A.T

def mat_to_list(m):
    return [[int(m[r, c]) for c in range(m.cols)] for r in range(m.rows)]

json.dumps({"At": mat_to_list(At)})
`);
    const parsed = JSON.parse(result);
    cases.push({ A, At: parsed.At });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference (A, Aᵀ) pairs computed by SymPy 1.13.x with exact integer arithmetic. Covers 2×2, 3×3, 4×4 square matrices plus 2×3, 3×2, 1×4 non-square cases.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.inverse — A⁻¹ reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference (A, A⁻¹) pairs for la.inverse cross-engine tests.
 *
 * Strategy: use unimodular matrices (|det|=1) and matrices with |det|=2
 * so the inverse entries are exact integers or halves — representable as
 * IEEE 754 doubles without rounding error. SymPy returns rational entries;
 * we convert to float (Rational → float → JSON) for the fixture.
 *
 * Sizes: 1×1, 2×2, 3×3, 4×4 (one each at a minimum).
 */
async function generateInverseCases(py) {
  const matrices = [
    // 1×1
    [[2]],
    [[-3]],
    // 2×2, det=1 (unimodular — inverse is exact integers)
    [
      [1, 2],
      [0, 1],
    ],
    [
      [1, 0],
      [3, 1],
    ],
    // 2×2, det=2 — inverse has halves (exact floats)
    [
      [2, 0],
      [0, 2],
    ],
    [
      [2, 1],
      [1, 1],
    ],
    // 3×3, det=1
    [
      [1, 0, 1],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    // 3×3, det=2
    [
      [2, 1, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    // 4×4, det=1
    [
      [1, 0, 0, 1],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ],
  ];

  const cases = [];
  for (const A of matrices) {
    const result = py.runPython(`
from sympy import Matrix, Rational
import json

A = Matrix(${JSON.stringify(A)})
Ainv = A.inv()

def mat_to_floats(m):
    return [[float(m[r, c]) for c in range(m.cols)] for r in range(m.rows)]

det_A = int(A.det())

json.dumps({
  "Ainv": mat_to_floats(Ainv),
  "detA": det_A
})
`);
    const parsed = JSON.parse(result);
    cases.push({ A, Ainv: parsed.Ainv, detA: parsed.detA });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference A⁻¹ values computed by SymPy 1.13.x. Uses unimodular (|det|=1) and |det|=2 matrices so inverse entries are exact floats. Covers 1×1, 2×2, 3×3, 4×4.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.rref / la.rank — row-reduced echelon form reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference (A, rref(A), rank(A)) triples for la.rref and la.rank
 * cross-engine tests. Covers:
 *   - full-rank square matrices (RREF = I)
 *   - rank-deficient square matrices (RREF has zero rows)
 *   - non-square matrices (fat and tall)
 *   - zero matrix (RREF = zero, rank = 0)
 */
async function generateRrefRankCases(py) {
  const matrices = [
    // 1×1 invertible
    [[3]],
    // 1×1 zero
    [[0]],
    // 2×2 full rank
    [
      [1, 2],
      [3, 4],
    ],
    // 2×2 rank 1 (rows proportional)
    [
      [1, 2],
      [2, 4],
    ],
    // 2×2 all zeros
    [
      [0, 0],
      [0, 0],
    ],
    // 3×3 full rank (identity)
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    // 3×3 rank 2
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    // 3×3 rank 1
    [
      [1, 2, 3],
      [2, 4, 6],
      [3, 6, 9],
    ],
    // 2×3 full row rank (rank 2)
    [
      [1, 0, 2],
      [0, 1, 3],
    ],
    // 3×2 full column rank (rank 2)
    [
      [1, 0],
      [0, 1],
      [2, 3],
    ],
    // 4×4 rank 3
    [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ],
  ];

  const cases = [];
  for (const A of matrices) {
    const result = py.runPython(`
from sympy import Matrix
import json

A = Matrix(${JSON.stringify(A)})
rref_mat, pivots = A.rref()
rank_A = len(pivots)

def mat_to_floats(m):
    return [[float(m[r, c]) for c in range(m.cols)] for r in range(m.rows)]

json.dumps({
  "rref": mat_to_floats(rref_mat),
  "rank": rank_A,
  "pivots": list(pivots)
})
`);
    const parsed = JSON.parse(result);
    cases.push({ A, rref: parsed.rref, rank: parsed.rank, pivots: parsed.pivots });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference rref(A) and rank(A) values computed by SymPy 1.13.x. Covers full-rank, rank-deficient, non-square, and zero matrices.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.lu — LU decomposition reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference (A, L, U, P) tuples for la.lu cross-engine tests.
 *
 * Strategy: use integer matrices where P·A = L·U holds exactly.
 * SymPy's Matrix.LUdecomposition() returns exact rational L and U; we
 * convert to float (exact for the halves/integers that arise here).
 * P is stored as the full permutation matrix (n×n, integer 0/1).
 *
 * Sizes: 1×1, 2×2, 3×3, 4×4. Include one case requiring row-swap (P ≠ I).
 */
async function generateLuCases(py) {
  const matrices = [
    // 1×1
    [[4]],
    // 2×2 — no pivot needed
    [
      [2, 1],
      [4, 3],
    ],
    // 2×2 — pivot swap (first entry is 0)
    [
      [0, 1],
      [2, 3],
    ],
    // 2×2 upper-triangular already
    [
      [3, 5],
      [0, 2],
    ],
    // 3×3 — general case
    [
      [2, 1, 1],
      [4, 3, 3],
      [8, 7, 9],
    ],
    // 3×3 — requires row-swap
    [
      [0, 2, 1],
      [3, 1, 2],
      [6, 4, 5],
    ],
    // 3×3 — identity
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    // 4×4
    [
      [1, 0, 0, 1],
      [0, 2, 0, 0],
      [0, 0, 3, 0],
      [1, 0, 0, 4],
    ],
  ];

  const cases = [];
  for (const A of matrices) {
    const result = py.runPython(`
from sympy import Matrix
import json

A = Matrix(${JSON.stringify(A)})
L_sym, U_sym, perm = A.LUdecomposition()

n = A.rows

# Build the full permutation matrix from the perm list.
# SymPy returns perm as a list of (row_from, row_to) swap pairs applied in order.
# We reconstruct P by applying those swaps to the identity.
import copy
P_rows = list(range(n))
for (r1, r2) in perm:
    P_rows[r1], P_rows[r2] = P_rows[r2], P_rows[r1]

P_mat = [[1 if P_rows[i] == j else 0 for j in range(n)] for i in range(n)]

def mat_to_floats(m):
    return [[float(m[r, c]) for c in range(m.cols)] for r in range(m.rows)]

json.dumps({
  "L": mat_to_floats(L_sym),
  "U": mat_to_floats(U_sym),
  "P": P_mat
})
`);
    const parsed = JSON.parse(result);
    cases.push({ A, L: parsed.L, U: parsed.U, P: parsed.P });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference LU decomposition values (L, U, P) computed by SymPy 1.13.x. P·A = L·U holds exactly. Covers 1×1 through 4×4 integer matrices including pivot-swap cases.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.qr — QR decomposition reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference (A, Q, R) tuples for la.qr cross-engine tests.
 *
 * Strategy: SymPy's Matrix.QRdecomposition() returns exact rational Q and R
 * for integer inputs. We store as floats (most are irrational — that's fine;
 * the test uses tolerance-based comparison). Covers square and rectangular
 * (m≥n) matrices. Includes one rank-deficient case so R has a zero on diagonal.
 */
async function generateQrCases(py) {
  const matrices = [
    // 1×1
    [[3]],
    // 2×2 — generic
    [
      [1, 2],
      [3, 4],
    ],
    // 2×2 — already orthogonal (Q=I)
    [
      [1, 0],
      [0, 1],
    ],
    // 2×2 — rank-deficient (cols proportional → R[1][1]=0)
    [
      [1, 2],
      [2, 4],
    ],
    // 3×3 — full rank
    [
      [1, 2, 3],
      [0, 1, 4],
      [5, 6, 0],
    ],
    // 3×2 — rectangular (m>n)
    [
      [1, 2],
      [3, 4],
      [5, 6],
    ],
    // 4×3 — rectangular
    [
      [1, 0, 1],
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    // 3×3 — rank-deficient (rank 2)
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
  ];

  const cases = [];
  for (const A of matrices) {
    const result = py.runPython(`
from sympy import Matrix
import json

A = Matrix(${JSON.stringify(A)})
Q_sym, R_sym = A.QRdecomposition()

def mat_to_floats(m):
    return [[float(m[r, c]) for c in range(m.cols)] for r in range(m.rows)]

json.dumps({
  "Q": mat_to_floats(Q_sym),
  "R": mat_to_floats(R_sym)
})
`);
    const parsed = JSON.parse(result);
    cases.push({ A, Q: parsed.Q, R: parsed.R });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference QR decomposition values (Q, R) computed by SymPy 1.13.x. Q·R = A, Qᵀ·Q = I. Covers square, rectangular, and rank-deficient integer matrices.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.eigen — eigendecomposition reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference (A, eigenvalues, eigenvectors) for la.eigen cross-engine tests.
 *
 * Strategy: use cherry-picked symmetric and diagonalizable integer matrices
 * whose eigenvalues are rational (often integers). SymPy's Matrix.eigenvects()
 * returns exact values; we convert eigenvalues to float and eigenvectors to
 * float column matrices. The test checks A·v = λ·v within tolerance.
 */
async function generateEigenCases(py) {
  // Only matrices with all-real, rational eigenvalues
  const matrices = [
    // 1×1 — eigenvalue is the scalar itself
    [[5]],
    [[-3]],
    // 2×2 diagonal
    [
      [2, 0],
      [0, 3],
    ],
    // 2×2 symmetric with integer eigenvalues
    [
      [3, 1],
      [1, 3],
    ],
    // 2×2 — eigenvalues 1 and -1
    [
      [0, 1],
      [1, 0],
    ],
    // 3×3 diagonal
    [
      [1, 0, 0],
      [0, 2, 0],
      [0, 0, 3],
    ],
    // 3×3 symmetric with integer eigenvalues
    [
      [2, 1, 0],
      [1, 2, 1],
      [0, 1, 2],
    ],
    // 3×3 — all eigenvalues 0 (nilpotent-ish, actually all zero)
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  ];

  const cases = [];
  for (const A of matrices) {
    const result = py.runPython(`
from sympy import Matrix
import json

A = Matrix(${JSON.stringify(A)})
eigvects = A.eigenvects()

# eigenvects() returns list of (eigenvalue, multiplicity, [eigenvectors])
# Flatten into one entry per eigenvalue (expanding by multiplicity)
eigenvalues = []
eigenvectors = []  # each is a column vector as a list

for (lam, mult, vecs) in eigvects:
    lam_f = float(lam)
    for vec in vecs:
        # Normalize the eigenvector to unit length
        norm = float(vec.norm())
        if norm < 1e-12:
            normalized = [0.0] * vec.rows
        else:
            normalized = [float(vec[i, 0]) / norm for i in range(vec.rows)]
        eigenvalues.append(lam_f)
        eigenvectors.append(normalized)
    # If multiplicity > len(vecs) the matrix is defective — skip (not in our test set)

json.dumps({
  "eigenvalues": eigenvalues,
  "eigenvectors": eigenvectors
})
`);
    const parsed = JSON.parse(result);
    cases.push({ A, eigenvalues: parsed.eigenvalues, eigenvectors: parsed.eigenvectors });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference eigenvalues and unit eigenvectors computed by SymPy 1.13.x for cherry-picked matrices with real rational eigenvalues. A·v = λ·v verified per case.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.solve — linear system Ax=b reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference (A, b, x) triples for la.solve cross-engine tests.
 *
 * Strategy: use unimodular or small-det integer matrices so SymPy's exact
 * solution x = A⁻¹·b has entries that are integers or exact halves —
 * representable as IEEE 754 doubles without rounding error.
 */
async function generateSolveCases(py) {
  const systems = [
    // 1×1
    { A: [[2]], b: [6] },
    { A: [[-3]], b: [9] },
    // 2×2 — det=1
    { A: [[1, 2], [0, 1]], b: [5, 3] },
    { A: [[1, 0], [3, 1]], b: [4, 7] },
    // 2×2 — det=2
    { A: [[2, 0], [0, 2]], b: [4, 6] },
    { A: [[2, 1], [1, 1]], b: [3, 2] },
    // 3×3 — det=1
    {
      A: [
        [1, 0, 1],
        [0, 1, 0],
        [0, 0, 1],
      ],
      b: [3, 2, 1],
    },
    {
      A: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
      b: [4, 5, 2],
    },
    // 3×3 — det=2
    {
      A: [
        [2, 1, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
      b: [3, 2, 1],
    },
    // 4×4 — det=1
    {
      A: [
        [1, 0, 0, 1],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
      b: [3, 1, 2, 4],
    },
  ];

  const cases = [];
  for (const { A, b } of systems) {
    const result = py.runPython(`
from sympy import Matrix
import json

A = Matrix(${JSON.stringify(A)})
b = Matrix(${JSON.stringify(b)})
x = A.solve(b)

json.dumps({
  "x": [float(x[i, 0]) for i in range(x.rows)]
})
`);
    const parsed = JSON.parse(result);
    cases.push({ A, b, x: parsed.x });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference solutions x to Ax=b computed by SymPy 1.13.x using exact arithmetic. Uses unimodular and |det|=2 matrices so solutions are exact floats. Covers 1×1 through 4×4.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.svd — singular value decomposition reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference (A, singularValues) pairs for la.svd cross-engine tests.
 *
 * Strategy: store only sorted singular values (σ₁ ≥ σ₂ ≥ … ≥ 0). U and V are
 * not stored because sign conventions differ between implementations; the
 * reconstruction property (U·Σ·Vᵀ ≈ A) is verified by the property-based
 * tests in svd.test.ts. The cross-engine test here confirms σ values match.
 *
 * We compute σᵢ = √(λᵢ(AᵀA)) numerically via SymPy to avoid irrational sqrt
 * serialisation issues.  Covers square (1×1 – 4×4), non-square (2×3, 3×2),
 * and rank-deficient matrices.
 */
async function generateSvdCases(py) {
  const matrices = [
    // 1×1
    [[3]],
    [[-5]],
    // 2×2 — full rank
    [
      [1, 2],
      [3, 4],
    ],
    // 2×2 — diagonal
    [
      [3, 0],
      [0, 2],
    ],
    // 2×2 — rank 1 (one zero singular value)
    [
      [1, 2],
      [2, 4],
    ],
    // 2×2 — zero matrix
    [
      [0, 0],
      [0, 0],
    ],
    // 3×3 — full rank
    [
      [1, 2, 3],
      [0, 1, 4],
      [5, 6, 0],
    ],
    // 3×3 — rank 2
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
    // 3×3 — identity
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    // 2×3 non-square (m < n)
    [
      [1, 2, 3],
      [4, 5, 6],
    ],
    // 3×2 non-square (m > n)
    [
      [1, 2],
      [3, 4],
      [5, 6],
    ],
    // 4×4 — general
    [
      [1, 0, 0, 1],
      [0, 2, 0, 0],
      [0, 0, 3, 0],
      [1, 0, 0, 4],
    ],
  ];

  const cases = [];
  for (const A of matrices) {
    const Ajs = JSON.stringify(A);
    const result = py.runPython(
      "from sympy import Matrix, re, im, N\n" +
        "import json, math\n" +
        `A = Matrix(${Ajs})\n` +
        "AtA = A.T * A\n" +
        "# eigenvals() may return symbolic complex for PSD matrices; take real part.\n" +
        "raw = AtA.eigenvals(multiple=True)\n" +
        "lambdas = sorted([float(re(N(ev))) for ev in raw], reverse=True)\n" +
        "k = min(A.rows, A.cols)\n" +
        "sigmas = [math.sqrt(max(0.0, lam)) for lam in lambdas[:k]]\n" +
        'json.dumps({"singularValues": sigmas})',
    );
    const parsed = JSON.parse(result);
    cases.push({ A, singularValues: parsed.singularValues });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference singular values computed by SymPy 1.13.x for la.svd cross-engine tests. σᵢ = √(λᵢ(AᵀA)) evaluated numerically via N(). Values in descending order. Covers square (1×1 – 4×4), non-square (2×3, 3×2), and rank-deficient matrices.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.basis-change — P⁻¹·T·P similarity transformation reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference (T, P, result) triples for la.basis-change cross-engine tests.
 *
 * Strategy: use unimodular P (|det|=1) so P⁻¹ has exact integer entries.
 * The result P⁻¹·T·P is then exact rational; we convert to float (exact
 * for integer and half entries). Key invariant: tr(result) = tr(T) and
 * det(result) = det(T) (similarity preserves trace and determinant).
 *
 * Sizes: 2×2, 3×3, 4×4. Includes identity T and diagonal T cases.
 */
async function generateBasisChangeCases(py) {
  const systems = [
    // 2×2 — unimodular P, general T
    {
      T: [
        [3, 1],
        [0, 2],
      ],
      P: [
        [1, 1],
        [0, 1],
      ],
    },
    // 2×2 — T = identity (result should equal identity regardless of P)
    {
      T: [
        [1, 0],
        [0, 1],
      ],
      P: [
        [2, 1],
        [1, 1],
      ],
    },
    // 2×2 — diagonal T
    {
      T: [
        [3, 0],
        [0, 5],
      ],
      P: [
        [1, 2],
        [0, 1],
      ],
    },
    // 2×2 — symmetric T
    {
      T: [
        [2, 1],
        [1, 3],
      ],
      P: [
        [1, 0],
        [2, 1],
      ],
    },
    // 3×3 — unimodular P (upper triangular with ones on diagonal)
    {
      T: [
        [1, 2, 0],
        [0, 3, 1],
        [0, 0, 2],
      ],
      P: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 1],
      ],
    },
    // 3×3 — diagonal T
    {
      T: [
        [2, 0, 0],
        [0, 3, 0],
        [0, 0, 5],
      ],
      P: [
        [1, 0, 1],
        [0, 1, 0],
        [0, 0, 1],
      ],
    },
    // 4×4 — identity P (result = T)
    {
      T: [
        [1, 2, 3, 4],
        [0, 2, 1, 0],
        [0, 0, 3, 1],
        [0, 0, 0, 4],
      ],
      P: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
    },
  ];

  const cases = [];
  for (const { T, P } of systems) {
    const result = py.runPython(`
from sympy import Matrix
import json

T = Matrix(${JSON.stringify(T)})
P = Matrix(${JSON.stringify(P)})
Pinv = P.inv()
result = Pinv * T * P

def mat_to_floats(m):
    return [[float(m[r, c]) for c in range(m.cols)] for r in range(m.rows)]

tr_T = float(T.trace())
det_T = int(T.det())

json.dumps({
  "result": mat_to_floats(result),
  "trT": tr_T,
  "detT": det_T
})
`);
    const parsed = JSON.parse(result);
    cases.push({ T, P, result: parsed.result, trT: parsed.trT, detT: parsed.detT });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference P⁻¹·T·P values computed by SymPy 1.13.x. Uses unimodular P so result entries are exact floats. Covers 2×2, 3×3, 4×4. tr(result)=tr(T) and det(result)=det(T) verified.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────
// la.kernel — null space basis
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference values for la.kernel (null space basis).
 *
 * For each matrix A, SymPy computes the null space basis vectors.
 * We store: A, the rank, the nullity (= n - rank), and the kernel
 * matrix K (columns = basis vectors) as floats.
 *
 * Key invariants the test will verify:
 *   1. nullity(A) = n - rank(A)  (rank-nullity theorem)
 *   2. A · K ≈ 0  (each column of K is in the null space)
 *   3. number of columns of K matches nullity
 *
 * Matrices use small integers. We include full-rank, rank-deficient,
 * and zero-rank (all-zero) cases, plus rectangular matrices.
 */
async function generateKernelCases(py) {
  const matrices = [
    // Full-rank square (trivial null space)
    { A: [[1, 0], [0, 1]], label: "2×2 identity" },
    { A: [[1, 2], [3, 4]], label: "2×2 invertible" },
    { A: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], label: "3×3 identity" },
    // Rank-deficient square
    { A: [[1, 2], [2, 4]], label: "2×2 rank-1" },
    { A: [[1, 1, 1], [2, 2, 2], [3, 3, 3]], label: "3×3 rank-1" },
    { A: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], label: "3×3 rank-2" },
    // All-zero
    { A: [[0, 0], [0, 0]], label: "2×2 zero" },
    // Wide rectangular (more columns than rows — always has non-trivial kernel)
    { A: [[1, 0, 2], [0, 1, 3]], label: "2×3 full row rank" },
    { A: [[1, 2, 3, 4], [5, 6, 7, 8]], label: "2×4 rank-2" },
    // Tall rectangular
    { A: [[1, 0], [0, 1], [1, 1]], label: "3×2 full column rank" },
    { A: [[1, 2], [2, 4], [3, 6]], label: "3×2 rank-1" },
  ];

  const cases = [];
  for (const { A } of matrices) {
    const result = py.runPython(`
from sympy import Matrix
import json
A = Matrix(${JSON.stringify(A)})
rank = A.rank()
ns = A.nullspace()
# Normalise to float — nullspace() returns rational exact vectors
def vec_to_floats(v):
    return [float(v[i]) for i in range(v.rows)]
kernel_cols = [vec_to_floats(v) for v in ns]
# Transpose to row-major matrix (n rows x nullity cols)
n = A.cols
nullity = n - rank
if nullity == 0:
    kernel_matrix = []
else:
    kernel_matrix = [[kernel_cols[j][i] for j in range(nullity)] for i in range(n)]
json.dumps({
    "rank": rank,
    "nullity": nullity,
    "K": kernel_matrix
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      A,
      rank: parsed.rank,
      nullity: parsed.nullity,
      K: parsed.K,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description: "Reference null space bases from SymPy A.nullspace(). K columns form a basis for ker(A). Invariants: A·K ≈ 0, nullity = n - rank.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.image — column space basis
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference values for la.image (column space basis).
 *
 * For each matrix A, SymPy computes the column space via A.columnspace().
 * We store: A, rank, and the SymPy column space basis columns as floats.
 *
 * Note: our implementation returns pivot columns from the original A,
 * which span the same space as SymPy's (possibly orthogonalized) basis.
 * Tests verify column count matches rank and all columns are in span(A),
 * NOT direct column equality with SymPy.
 */
async function generateImageCases(py) {
  const matrices = [
    // Full-rank square (image = full column space)
    { A: [[1, 0], [0, 1]] },
    { A: [[1, 2], [3, 4]] },
    { A: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
    // Rank-deficient square
    { A: [[1, 2], [2, 4]] },
    { A: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] },
    // All-zero (empty image)
    { A: [[0, 0], [0, 0]] },
    // Wide rectangular
    { A: [[1, 0, 2], [0, 1, 3]] },
    { A: [[1, 2, 3, 4], [5, 6, 7, 8]] },
    // Tall rectangular
    { A: [[1, 0], [0, 1], [1, 1]] },
    { A: [[1, 2], [2, 4], [3, 6]] },
  ];

  const cases = [];
  for (const { A } of matrices) {
    const result = py.runPython(`
from sympy import Matrix
import json
A = Matrix(${JSON.stringify(A)})
rank = A.rank()
cs = A.columnspace()
def vec_to_floats(v):
    return [float(v[i]) for i in range(v.rows)]
image_cols = [vec_to_floats(v) for v in cs]
m = A.rows
if rank == 0:
    image_matrix = []
else:
    image_matrix = [[image_cols[j][i] for j in range(rank)] for i in range(m)]
json.dumps({
    "rank": rank,
    "Im": image_matrix
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      A,
      rank: parsed.rank,
      Im: parsed.Im,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description: "Reference column space dimension from SymPy A.columnspace(). Rank = number of columns. Tests verify column count and that columns lie in span(A).",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// la.project — orthogonal projection onto column space of A
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference values for la.project.
 *
 * For each (A, v) pair, SymPy computes P·v = A·(AᵀA)⁻¹·Aᵀ·v.
 * We use full-column-rank matrices so AᵀA is invertible.
 *
 * Key invariants the test will verify:
 *   1. P·v matches SymPy exactly (same formula).
 *   2. P(P·v) ≈ P·v — idempotence.
 *   3. v − P·v is orthogonal to all columns of A.
 */
async function generateProjectCases(py) {
  const systems = [
    // 1D subspace of R² (project onto a line)
    { A: [[1], [0]], v: [3, 4] },
    { A: [[1], [1]], v: [1, 3] },
    // 2D full-rank square (projection = identity)
    { A: [[1, 0], [0, 1]], v: [2, 5] },
    { A: [[1, 1], [0, 1]], v: [3, 7] },
    // 1D subspace of R³
    { A: [[1], [0], [0]], v: [2, 3, 4] },
    { A: [[1], [1], [1]], v: [1, 2, 3] },
    // 2D subspace of R³
    { A: [[1, 0], [0, 1], [0, 0]], v: [5, 6, 7] },
    { A: [[1, 0], [0, 1], [1, 0]], v: [2, 4, 6] },
    // 2D subspace of R⁴
    { A: [[1, 0], [0, 1], [0, 0], [0, 0]], v: [1, 2, 3, 4] },
    // Diagonal subspace
    { A: [[1, 0], [0, 2], [0, 0]], v: [3, 5, 7] },
  ];

  const cases = [];
  for (const { A, v } of systems) {
    const result = py.runPython(`
from sympy import Matrix
import json
A = Matrix(${JSON.stringify(A)})
v = Matrix(${JSON.stringify(v)})
At = A.T
AtA = At * A
AtAinv = AtA.inv()
Pv = A * AtAinv * At * v
def vec_to_floats(vec):
    return [float(vec[i]) for i in range(vec.rows)]
json.dumps({"Pv": vec_to_floats(Pv)})
`);
    const parsed = JSON.parse(result);
    cases.push({ A, v, Pv: parsed.Pv });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description: "Reference A·(AᵀA)⁻¹·Aᵀ·v projections from SymPy (exact rational arithmetic). Invariants: matches our output, idempotence P(Pv)=Pv, v-Pv ⊥ A.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// stats.bernoulli — discrete two-outcome distribution
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference values for stats.bernoulli.
 *
 * Uses sympy.stats with rational p values so moments are exact fractions.
 * Each case records:
 *   - p: success probability (rational)
 *   - moments: { mean, variance, m1, m2, m3, m4 } — E[X^k] for k=1..4
 *   - pmf: [{ x, value }] at x=0 and x=1
 *   - cdf: [{ x, value }] at x=-1, 0, 0.5, 1, 2
 *
 * All values stored as floats for easy numeric comparison in tests.
 * Rational exact form is derivable from p directly: mean=p, var=p(1-p).
 */
async function generateBernoulliCases(py) {
  // Rational p values — all produce exact rational moments.
  // Avoid p=0 and p=1 edge cases in the main set; add them separately.
  const params = [
    { p: "Rational(1, 4)", pFloat: 0.25 },
    { p: "Rational(1, 2)", pFloat: 0.5 },
    { p: "Rational(3, 4)", pFloat: 0.75 },
    { p: "Rational(1, 3)", pFloat: 1 / 3 },
    { p: "Rational(2, 3)", pFloat: 2 / 3 },
    { p: "Rational(1, 5)", pFloat: 0.2 },
    { p: "Rational(4, 5)", pFloat: 0.8 },
    { p: "Rational(0, 1)", pFloat: 0.0 },
    { p: "Rational(1, 1)", pFloat: 1.0 },
  ];

  const cases = [];
  for (const { p, pFloat } of params) {
    const result = py.runPython(`
from sympy import Rational
from sympy.stats import Bernoulli, E, variance, density, P
import json

p_val = ${p}
X = Bernoulli('X', p_val)

mean_val = float(E(X))
var_val = float(variance(X))

# Raw moments E[X^k] — for Bernoulli: E[X^k] = p for all k >= 1
m1 = float(E(X**1))
m2 = float(E(X**2))
m3 = float(E(X**3))
m4 = float(E(X**4))

# PMF: density(X) returns the distribution object; .pmf(k) evaluates it.
dist = density(X)
pmf0 = float(dist.pmf(0))
pmf1 = float(dist.pmf(1))

# CDF: use P(X <= x) for arbitrary evaluation points.
cdf_neg = float(P(X <= -1))
cdf_0   = float(P(X <= 0))
cdf_half = float(P(X <= Rational(1, 2)))
cdf_1   = float(P(X <= 1))
cdf_2   = float(P(X <= 2))

json.dumps({
  "mean": mean_val,
  "variance": var_val,
  "m1": m1, "m2": m2, "m3": m3, "m4": m4,
  "pmf": [{"x": 0, "value": pmf0}, {"x": 1, "value": pmf1}],
  "cdf": [
    {"x": -1, "value": cdf_neg},
    {"x": 0,  "value": cdf_0},
    {"x": 0.5, "value": cdf_half},
    {"x": 1,  "value": cdf_1},
    {"x": 2,  "value": cdf_2}
  ]
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      family: "Bernoulli",
      parameters: { p: pFloat },
      moments: {
        mean: parsed.mean,
        variance: parsed.variance,
        m1: parsed.m1,
        m2: parsed.m2,
        m3: parsed.m3,
        m4: parsed.m4,
      },
      pmf: parsed.pmf,
      cdf: parsed.cdf,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference moments and density/CDF samples for Bernoulli(p) from sympy.stats. " +
      "Parameters chosen to produce exact rational moments. " +
      "Invariants: mean=p, variance=p(1-p), pmf(0)=1-p, pmf(1)=p, CDF is a step function.",
    cases,
  };
}

async function main() {
  console.log("Loading Pyodide…");
  const py = await loadPyodide({ indexURL: PYODIDE_INDEX + "/" });

  console.log("Loading SymPy…");
  await py.loadPackage("sympy");
  const version = py.runPython("import sympy; sympy.__version__");
  console.log(`SymPy ${version} ready.`);

  mkdirSync(FIXTURES_DIR, { recursive: true });

  console.log("\nGenerating la.vector fixtures…");
  const vectorFixture = await generateVectorArithmetic(py);
  writeFixture("la-vector", vectorFixture);

  console.log("\nGenerating la.matrix fixtures…");
  const matrixFixture = await generateMatrixArithmetic(py);
  writeFixture("la-matrix", matrixFixture);

  console.log("\nGenerating la.transpose fixtures…");
  const transposeFixture = await generateTransposeCases(py);
  writeFixture("la-transpose", transposeFixture);

  console.log("\nGenerating la.det multiplicativity fixtures…");
  const detFixture = await generateDetMultiplicativity(py);
  writeFixture("la-det-multiplicativity", detFixture);

  console.log("\nGenerating la.add / la.sub / la.trace fixtures…");
  const addSubTraceFixture = await generateAddSubTrace(py);
  writeFixture("la-add-sub-trace", addSubTraceFixture);

  console.log("\nGenerating la.inverse fixtures…");
  const inverseFixture = await generateInverseCases(py);
  writeFixture("la-inverse", inverseFixture);

  console.log("\nGenerating la.rref / la.rank fixtures…");
  const rrefRankFixture = await generateRrefRankCases(py);
  writeFixture("la-rref-rank", rrefRankFixture);

  console.log("\nGenerating la.lu fixtures…");
  const luFixture = await generateLuCases(py);
  writeFixture("la-lu", luFixture);

  console.log("\nGenerating la.qr fixtures…");
  const qrFixture = await generateQrCases(py);
  writeFixture("la-qr", qrFixture);

  console.log("\nGenerating la.eigen fixtures…");
  const eigenFixture = await generateEigenCases(py);
  writeFixture("la-eigen", eigenFixture);

  console.log("\nGenerating la.solve fixtures…");
  const solveFixture = await generateSolveCases(py);
  writeFixture("la-solve", solveFixture);

  console.log("\nGenerating la.svd fixtures…");
  const svdFixture = await generateSvdCases(py);
  writeFixture("la-svd", svdFixture);

  console.log("\nGenerating la.basis-change fixtures…");
  const basisChangeFixture = await generateBasisChangeCases(py);
  writeFixture("la-basis-change", basisChangeFixture);

  console.log("\nGenerating la.kernel fixtures…");
  const kernelFixture = await generateKernelCases(py);
  writeFixture("la-kernel", kernelFixture);

  console.log("\nGenerating la.image fixtures…");
  const imageFixture = await generateImageCases(py);
  writeFixture("la-image", imageFixture);

  console.log("\nGenerating la.project fixtures…");
  const projectFixture = await generateProjectCases(py);
  writeFixture("la-project", projectFixture);

  console.log("\nGenerating stats.bernoulli fixtures…");
  const bernoulliFixture = await generateBernoulliCases(py);
  writeFixture("stats-bernoulli", bernoulliFixture);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
