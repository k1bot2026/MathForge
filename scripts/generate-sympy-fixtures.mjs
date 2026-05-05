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

// ──────────────────────────────────────────────────────────────────────────
// stats.binomial — moments and pmf/CDF samples
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference moments and density/CDF samples for Binomial(n, p).
 * Parameters chosen so moments are exact rationals in SymPy.
 */
async function generateBinomialCases(py) {
  const params = [
    { n: 1, p: "Rational(1, 2)", pFloat: 0.5 },
    { n: 5, p: "Rational(1, 3)", pFloat: 1 / 3 },
    { n: 5, p: "Rational(2, 3)", pFloat: 2 / 3 },
    { n: 10, p: "Rational(1, 4)", pFloat: 0.25 },
    { n: 10, p: "Rational(3, 4)", pFloat: 0.75 },
    { n: 20, p: "Rational(1, 2)", pFloat: 0.5 },
    { n: 3, p: "Rational(0, 1)", pFloat: 0.0 },
    { n: 4, p: "Rational(1, 1)", pFloat: 1.0 },
  ];

  const cases = [];
  for (const { n, p, pFloat } of params) {
    const result = py.runPython(`
from sympy import Rational
from sympy.stats import Binomial, E, variance, density, P
import json

n_val = ${n}
p_val = ${p}
X = Binomial('X', n_val, p_val)

mean_val = float(E(X))
var_val = float(variance(X))

dist = density(X)
# pmf at k=0 and k=n
pmf0 = float(dist.pmf(0))
pmfN = float(dist.pmf(n_val))
pmfMid = float(dist.pmf(n_val // 2))

# CDF at -1, 0, n//2, n, n+1
cdf_neg  = float(P(X <= -1))
cdf_0    = float(P(X <= 0))
cdf_mid  = float(P(X <= n_val // 2))
cdf_n    = float(P(X <= n_val))
cdf_nP1  = float(P(X <= n_val + 1))

json.dumps({
  "mean": mean_val,
  "variance": var_val,
  "pmf": [{"x": 0, "value": pmf0}, {"x": n_val // 2, "value": pmfMid}, {"x": n_val, "value": pmfN}],
  "cdf": [
    {"x": -1,        "value": cdf_neg},
    {"x": 0,         "value": cdf_0},
    {"x": n_val // 2,"value": cdf_mid},
    {"x": n_val,     "value": cdf_n},
    {"x": n_val + 1, "value": cdf_nP1}
  ]
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      family: "Binomial",
      parameters: { n, p: pFloat },
      moments: { mean: parsed.mean, variance: parsed.variance },
      pmf: parsed.pmf,
      cdf: parsed.cdf,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference moments and density/CDF samples for Binomial(n,p) from sympy.stats. " +
      "Invariants: mean=np, variance=np(1-p), CDF(n)=1, CDF(-1)=0.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// stats.uniform — moments and PDF/CDF samples
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference moments and density/CDF samples for Uniform(a, b).
 */
async function generateUniformCases(py) {
  const params = [
    { a: "0", b: "1", aFloat: 0, bFloat: 1 },
    { a: "0", b: "2", aFloat: 0, bFloat: 2 },
    { a: "-1", b: "1", aFloat: -1, bFloat: 1 },
    { a: "1", b: "4", aFloat: 1, bFloat: 4 },
    { a: "Rational(-1, 2)", b: "Rational(1, 2)", aFloat: -0.5, bFloat: 0.5 },
    { a: "2", b: "5", aFloat: 2, bFloat: 5 },
  ];

  const cases = [];
  for (const { a, b, aFloat, bFloat } of params) {
    const result = py.runPython(`
from sympy import Rational
from sympy.stats import Uniform, E, variance, density, P
import json

a_val = ${a}
b_val = ${b}
X = Uniform('X', a_val, b_val)

mean_val = float(E(X))
var_val  = float(variance(X))

# PDF at midpoint = 1/(b-a); at a and b boundaries
mid = (a_val + b_val) / 2
pdf_mid  = float(density(X)(mid))
pdf_lo   = float(density(X)(a_val))
pdf_hi   = float(density(X)(b_val))

# CDF: F(a)=0, F(mid)=0.5, F(b)=1
cdf_lo   = float(P(X <= a_val))
cdf_mid  = float(P(X <= mid))
cdf_hi   = float(P(X <= b_val))

json.dumps({
  "mean": mean_val,
  "variance": var_val,
  "pdf": [{"x": float(a_val), "value": pdf_lo}, {"x": float(mid), "value": pdf_mid}, {"x": float(b_val), "value": pdf_hi}],
  "cdf": [{"x": float(a_val), "value": cdf_lo}, {"x": float(mid), "value": cdf_mid}, {"x": float(b_val), "value": cdf_hi}]
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      family: "Uniform",
      parameters: { a: aFloat, b: bFloat },
      moments: { mean: parsed.mean, variance: parsed.variance },
      pdf: parsed.pdf,
      cdf: parsed.cdf,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference moments and density/CDF samples for Uniform(a,b) from sympy.stats. " +
      "Invariants: mean=(a+b)/2, variance=(b-a)^2/12, CDF(a)=0, CDF(b)=1.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// stats.normal — moments and PDF/CDF samples
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference moments and density/CDF samples for Normal(mu, sigma).
 */
async function generateNormalCases(py) {
  const params = [
    { mu: "0", sigma: "1", muFloat: 0, sigmaFloat: 1 },
    { mu: "1", sigma: "1", muFloat: 1, sigmaFloat: 1 },
    { mu: "0", sigma: "2", muFloat: 0, sigmaFloat: 2 },
    { mu: "-1", sigma: "Rational(1, 2)", muFloat: -1, sigmaFloat: 0.5 },
    { mu: "3", sigma: "Rational(3, 2)", muFloat: 3, sigmaFloat: 1.5 },
  ];

  const cases = [];
  for (const { mu, sigma, muFloat, sigmaFloat } of params) {
    const result = py.runPython(`
from sympy import Rational, N
from sympy.stats import Normal, E, variance, density, P
import json

mu_val    = ${mu}
sigma_val = ${sigma}
X = Normal('X', mu_val, sigma_val)

mean_val = float(E(X))
var_val  = float(variance(X))

# PDF at mu (peak = 1/(sigma*sqrt(2*pi))), mu ± sigma
from sympy import pi, sqrt, exp
pdf_peak   = float(N(density(X)(mu_val)))
pdf_plus1  = float(N(density(X)(mu_val + sigma_val)))
pdf_minus1 = float(N(density(X)(mu_val - sigma_val)))

# CDF: F(mu)=0.5, F(mu+sigma)~0.8413, F(mu-sigma)~0.1587
cdf_mu     = float(N(P(X <= mu_val)))
cdf_plus1  = float(N(P(X <= mu_val + sigma_val)))
cdf_minus1 = float(N(P(X <= mu_val - sigma_val)))

json.dumps({
  "mean": mean_val,
  "variance": var_val,
  "pdf": [
    {"x": float(mu_val - sigma_val), "value": pdf_minus1},
    {"x": float(mu_val),             "value": pdf_peak},
    {"x": float(mu_val + sigma_val), "value": pdf_plus1}
  ],
  "cdf": [
    {"x": float(mu_val - sigma_val), "value": cdf_minus1},
    {"x": float(mu_val),             "value": cdf_mu},
    {"x": float(mu_val + sigma_val), "value": cdf_plus1}
  ]
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      family: "Normal",
      parameters: { mu: muFloat, sigma: sigmaFloat },
      moments: { mean: parsed.mean, variance: parsed.variance },
      pdf: parsed.pdf,
      cdf: parsed.cdf,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference moments and density/CDF samples for Normal(mu,sigma) from sympy.stats. " +
      "Invariants: mean=mu, variance=sigma^2, skewness=0, excessKurtosis=0, CDF(mu)=0.5.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// stats.poisson — moments and pmf/CDF samples
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference moments and density/CDF samples for Poisson(lambda).
 */
async function generatePoissonCases(py) {
  const params = [
    { lambda: "1", lambdaFloat: 1 },
    { lambda: "2", lambdaFloat: 2 },
    { lambda: "5", lambdaFloat: 5 },
    { lambda: "10", lambdaFloat: 10 },
    { lambda: "Rational(1, 2)", lambdaFloat: 0.5 },
    { lambda: "Rational(3, 2)", lambdaFloat: 1.5 },
  ];

  const cases = [];
  for (const { lambda, lambdaFloat } of params) {
    const result = py.runPython(`
from sympy import Rational, N, floor
from sympy.stats import Poisson, E, variance, density, P
import json

lam = ${lambda}
X = Poisson('X', lam)

mean_val = float(E(X))
var_val  = float(variance(X))

dist = density(X)
# For discrete sympy.stats distributions, use .pmf() via dict lookup or pdf()
# Poisson density dict keys are Integer objects; evaluate via P(X = k)
from sympy import Eq
k0   = 0
kMod = int(float(lam))
pmf0    = float(N(P(Eq(X, k0))))
pmfMod  = float(N(P(Eq(X, kMod))))
pmfMod1 = float(N(P(Eq(X, kMod + 1))))

# CDF at k0 and kMod
cdf0    = float(N(P(X <= k0)))
cdfMod  = float(N(P(X <= kMod)))

json.dumps({
  "mean": mean_val,
  "variance": var_val,
  "pmf": [
    {"x": k0,       "value": pmf0},
    {"x": kMod,     "value": pmfMod},
    {"x": kMod + 1, "value": pmfMod1}
  ],
  "cdf": [
    {"x": k0,   "value": cdf0},
    {"x": kMod, "value": cdfMod}
  ]
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      family: "Poisson",
      parameters: { lambda: lambdaFloat },
      moments: { mean: parsed.mean, variance: parsed.variance },
      pmf: parsed.pmf,
      cdf: parsed.cdf,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference moments and density/CDF samples for Poisson(lambda) from sympy.stats. " +
      "Invariants: mean=lambda, variance=lambda, skewness=1/sqrt(lambda), excessKurtosis=1/lambda.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// stats.beta — moments and PDF/CDF samples
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference moments and density/CDF samples for Beta(alpha, beta).
 * Uses sympy.stats Beta (not to be confused with sympy.stats.Beta which is
 * the shape-rate parameterisation — this is the standard [0,1] Beta dist).
 */
async function generateBetaCases(py) {
  const params = [
    { alpha: "1", beta: "1", aF: 1, bF: 1 },
    { alpha: "2", beta: "2", aF: 2, bF: 2 },
    { alpha: "2", beta: "5", aF: 2, bF: 5 },
    { alpha: "5", beta: "2", aF: 5, bF: 2 },
    { alpha: "Rational(1, 2)", beta: "Rational(1, 2)", aF: 0.5, bF: 0.5 },
    { alpha: "Rational(1, 2)", beta: "Rational(3, 2)", aF: 0.5, bF: 1.5 },
    { alpha: "3", beta: "7", aF: 3, bF: 7 },
  ];

  const cases = [];
  for (const { alpha, beta, aF, bF } of params) {
    const result = py.runPython(`
from sympy import Rational, N
from sympy.stats import Beta, E, variance, density, P
import json

a_val = ${alpha}
b_val = ${beta}
X = Beta('X', a_val, b_val)

mean_val = float(E(X))
var_val  = float(variance(X))

# CDF: F(0)=0, F(0.5)=midpoint, F(1)=1
cdf_0   = float(N(P(X <= 0)))
cdf_half = float(N(P(X <= Rational(1, 2))))
cdf_1   = float(N(P(X <= 1)))

json.dumps({
  "mean": mean_val,
  "variance": var_val,
  "cdf": [
    {"x": 0,   "value": cdf_0},
    {"x": 0.5, "value": cdf_half},
    {"x": 1,   "value": cdf_1}
  ]
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      family: "Beta",
      parameters: { alpha: aF, beta: bF },
      moments: { mean: parsed.mean, variance: parsed.variance },
      cdf: parsed.cdf,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference moments and CDF samples for Beta(alpha,beta) from sympy.stats. " +
      "Support [0,1]. Invariants: mean=alpha/(alpha+beta), CDF(0)=0, CDF(1)=1.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// stats.gamma — moments and PDF/CDF samples
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference moments for Gamma(alpha, beta) using shape/rate.
 * SymPy's Gamma(name, k, theta) uses shape k, scale theta; beta (rate) = 1/theta.
 */
async function generateGammaCases(py) {
  const params = [
    { alpha: "1", beta: "1", aF: 1, bF: 1 },
    { alpha: "2", beta: "1", aF: 2, bF: 1 },
    { alpha: "3", beta: "2", aF: 3, bF: 2 },
    { alpha: "Rational(1, 2)", beta: "1", aF: 0.5, bF: 1 },
    { alpha: "5", beta: "Rational(1, 2)", aF: 5, bF: 0.5 },
    { alpha: "Rational(3, 2)", beta: "2", aF: 1.5, bF: 2 },
  ];

  const cases = [];
  for (const { alpha, beta, aF, bF } of params) {
    const result = py.runPython(`
from sympy import Rational, N
from sympy.stats import Gamma, E, variance, P
import json

k_val     = ${alpha}     # shape = alpha
theta_val = 1 / (${beta})  # scale = 1/beta (rate)
X = Gamma('X', k_val, theta_val)

mean_val = float(E(X))
var_val  = float(variance(X))

json.dumps({
  "mean": mean_val,
  "variance": var_val
})
`);
    const parsed = JSON.parse(result);
    cases.push({
      family: "Gamma",
      parameters: { alpha: aF, beta: bF },
      moments: { mean: parsed.mean, variance: parsed.variance },
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference moments for Gamma(alpha,beta) using shape/rate parameterisation from sympy.stats. " +
      "Invariants: mean=alpha/beta, variance=alpha/beta^2.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// stats.posterior — conjugate posterior moments
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates SymPy-verified posterior parameters and moments for all 4 conjugate pairs.
 * SymPy computes E[X] and Var[X] for the analytically-known posterior distribution.
 */
async function generatePosteriorCases(py) {
  const cases = [];

  // Beta–Bernoulli: Beta(α,β) prior + k successes in n trials → Beta(α+k, β+n-k)
  const betaBernoulliCases = [
    { alpha: "Rational(1,1)", beta: "Rational(1,1)", k: 7, n: 10, aF: 1, bF: 1 },
    { alpha: "Rational(2,1)", beta: "Rational(5,1)", k: 3, n: 5, aF: 2, bF: 5 },
    { alpha: "Rational(3,1)", beta: "Rational(7,1)", k: 12, n: 20, aF: 3, bF: 7 },
    { alpha: "Rational(1,2)", beta: "Rational(1,2)", k: 0, n: 5, aF: 0.5, bF: 0.5 },
  ];
  for (const { alpha, beta, k, n, aF, bF } of betaBernoulliCases) {
    const result = py.runPython(`
from sympy import Rational, N
from sympy.stats import Beta as SympyBeta, E, variance
import json
a_post = ${alpha} + ${k}
b_post = ${beta} + ${n - k}
X = SympyBeta('X', a_post, b_post)
mean_val = float(E(X))
var_val  = float(variance(X))
json.dumps({"mean": mean_val, "variance": var_val, "alpha_post": float(a_post), "beta_post": float(b_post)})
`);
    const parsed = JSON.parse(result);
    cases.push({
      conjugatePair: "Beta-Bernoulli",
      prior: { family: "Beta", alpha: aF, beta: bF },
      evidence: { k_hits: k, n_obs: n },
      posterior: {
        family: "Beta",
        alpha: parsed.alpha_post,
        beta: parsed.beta_post,
        moments: { mean: parsed.mean, variance: parsed.variance },
      },
    });
  }

  // Beta–Binomial: same update rule
  const betaBinomialCases = [
    { alpha: "Rational(1,1)", beta: "Rational(1,1)", k: 7, n: 10, aF: 1, bF: 1 },
    { alpha: "Rational(2,1)", beta: "Rational(3,1)", k: 0, n: 5, aF: 2, bF: 3 },
  ];
  for (const { alpha, beta, k, n, aF, bF } of betaBinomialCases) {
    const result = py.runPython(`
from sympy import Rational, N
from sympy.stats import Beta as SympyBeta, E, variance
import json
a_post = ${alpha} + ${k}
b_post = ${beta} + ${n - k}
X = SympyBeta('X', a_post, b_post)
mean_val = float(E(X))
var_val  = float(variance(X))
json.dumps({"mean": mean_val, "variance": var_val, "alpha_post": float(a_post), "beta_post": float(b_post)})
`);
    const parsed = JSON.parse(result);
    cases.push({
      conjugatePair: "Beta-Binomial",
      prior: { family: "Beta", alpha: aF, beta: bF },
      evidence: { k_hits: k, n_obs: n },
      posterior: {
        family: "Beta",
        alpha: parsed.alpha_post,
        beta: parsed.beta_post,
        moments: { mean: parsed.mean, variance: parsed.variance },
      },
    });
  }

  // Normal–Normal: σ_post² = 1/(1/σ₀² + n/σ_lik²), μ_post = σ_post²*(μ₀/σ₀² + n*x̄/σ_lik²)
  const normalNormalCases = [
    { mu0: "0", sigma0: "1", sigmaLik: "2", xObs: "3", n: 5, mu0F: 0, s0F: 1, sLF: 2, xF: 3 },
    { mu0: "1", sigma0: "2", sigmaLik: "1", xObs: "0", n: 10, mu0F: 1, s0F: 2, sLF: 1, xF: 0 },
  ];
  for (const { mu0, sigma0, sigmaLik, xObs, n, mu0F, s0F, sLF, xF } of normalNormalCases) {
    const result = py.runPython(`
from sympy import Rational, N, sqrt
from sympy.stats import Normal as SympyNormal, E, variance
import json
mu0 = ${mu0}; sigma0 = ${sigma0}; sigmaLik = ${sigmaLik}; xObs = ${xObs}; n = ${n}
var0 = sigma0**2; varLik = sigmaLik**2
varPost = 1 / (1/var0 + n/varLik)
muPost  = varPost * (mu0/var0 + n*xObs/varLik)
sigmaPost = sqrt(varPost)
X = SympyNormal('X', muPost, sigmaPost)
mean_val = float(E(X))
var_val  = float(variance(X))
json.dumps({"mean": mean_val, "variance": var_val, "mu_post": float(muPost), "sigma_post": float(sigmaPost)})
`);
    const parsed = JSON.parse(result);
    cases.push({
      conjugatePair: "Normal-Normal",
      prior: { family: "Normal", mu: mu0F, sigma: s0F },
      likelihood: { family: "Normal", sigma: sLF },
      evidence: { x_obs: xF, n_obs: n },
      posterior: {
        family: "Normal",
        mu: parsed.mu_post,
        sigma: parsed.sigma_post,
        moments: { mean: parsed.mean, variance: parsed.variance },
      },
    });
  }

  // Gamma–Poisson: Gamma(α,β) + k events in n periods → Gamma(α+k, β+n)
  const gammaPoissonCases = [
    { alpha: "Rational(2,1)", beta: "Rational(1,1)", k: 8, n: 4, aF: 2, bF: 1 },
    { alpha: "Rational(3,1)", beta: "Rational(2,1)", k: 9, n: 6, aF: 3, bF: 2 },
  ];
  for (const { alpha, beta, k, n, aF, bF } of gammaPoissonCases) {
    const result = py.runPython(`
from sympy import Rational, N
from sympy.stats import Gamma as SympyGamma, E, variance
import json
a_post = ${alpha} + ${k}
b_post = ${beta} + ${n}
# sympy.stats.Gamma uses shape k, scale theta; beta (rate) = 1/theta → theta = 1/b_post
X = SympyGamma('X', a_post, 1/b_post)
mean_val = float(E(X))
var_val  = float(variance(X))
json.dumps({"mean": mean_val, "variance": var_val, "alpha_post": float(a_post), "beta_post": float(b_post)})
`);
    const parsed = JSON.parse(result);
    cases.push({
      conjugatePair: "Gamma-Poisson",
      prior: { family: "Gamma", alpha: aF, beta: bF },
      evidence: { k_hits: k, n_obs: n },
      posterior: {
        family: "Gamma",
        alpha: parsed.alpha_post,
        beta: parsed.beta_post,
        moments: { mean: parsed.mean, variance: parsed.variance },
      },
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "SymPy-verified posterior parameters and moments for all 4 conjugate pairs. " +
      "Beta-Bernoulli, Beta-Binomial, Normal-Normal (known σ), Gamma-Poisson.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// stats.mgf — MGF string expressions from SymPy
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates SymPy MGF string representations for each supported distribution family.
 * The strings are used to verify the pyodide.worker buildMgfCode output.
 */
async function generateMgfCases(py) {
  const cases = [];

  const specs = [
    {
      family: "Bernoulli",
      params: { p: "Rational(3, 10)" },
      pFloat: { p: 0.3 },
      code: `
from sympy import symbols, Rational, exp, expand
t = symbols('t')
p = Rational(3, 10)
mgf = 1 - p + p * exp(t)
str(expand(mgf))
`,
    },
    {
      family: "Binomial",
      params: { n: 5, p: "Rational(1, 3)" },
      pFloat: { n: 5, p: 1 / 3 },
      code: `
from sympy import symbols, Rational, exp, expand
t = symbols('t')
n = 5
p = Rational(1, 3)
mgf = (1 - p + p * exp(t))**n
str(mgf)
`,
    },
    {
      family: "Poisson",
      params: { lambda: 2 },
      pFloat: { lambda: 2 },
      code: `
from sympy import symbols, exp
t = symbols('t')
lam = 2
mgf = exp(lam * (exp(t) - 1))
str(mgf)
`,
    },
    {
      family: "Normal",
      params: { mu: 0, sigma: 1 },
      pFloat: { mu: 0, sigma: 1 },
      code: `
from sympy import symbols, exp
t = symbols('t')
mu = 0; sigma = 1
mgf = exp(mu * t + sigma**2 * t**2 / 2)
str(mgf)
`,
    },
    {
      family: "Gamma",
      params: { alpha: 2, beta: 3 },
      pFloat: { alpha: 2, beta: 3 },
      code: `
from sympy import symbols
t = symbols('t')
alpha = 2; beta = 3
mgf = (1 - t/beta)**(-alpha)
str(mgf)
`,
    },
  ];

  for (const { family, pFloat, code } of specs) {
    const sympyStr = py.runPython(code.trim());
    cases.push({ family, parameters: pFloat, sympyStr });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "SymPy MGF string representations for Bernoulli, Binomial, Poisson, Normal, Gamma. " +
      "Used to verify pyodide.worker buildMgfCode output matches SymPy str() form.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// calc.function — sympify canonicalisation fixtures
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates { inputExpr, variable, canonical } triples for calc.function
 * cross-engine tests. Each pair is validated via SymPy sympify() + str().
 *
 * Covers: polynomials, trig, exp/log, rational expressions, multivariate,
 * and infix→SymPy notation normalisation (^ → **).
 */
async function generateCalcFunctionCases(py) {
  const inputs = [
    { expr: "sin(x)", variable: "x" },
    { expr: "x**2 + 2*x + 1", variable: "x" },
    { expr: "exp(x)", variable: "x" },
    { expr: "log(x)", variable: "x" },
    { expr: "cos(x) + sin(x)", variable: "x" },
    { expr: "x**3 - 3*x", variable: "x" },
    { expr: "1 / (x + 1)", variable: "x" },
    { expr: "sqrt(x)", variable: "x" },
    { expr: "t**2 + t", variable: "t" },
    { expr: "exp(-x**2)", variable: "x" },
  ];

  const cases = [];
  for (const { expr, variable } of inputs) {
    const canonical = py.runPython(`
from sympy import symbols, sympify
${variable} = symbols('${variable}')
str(sympify(${JSON.stringify(expr)}))
`.trim());
    cases.push({ inputExpr: expr, variable, canonical });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "SymPy sympify() canonical str() forms for calc.function cross-engine tests.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// calc.derivative — diff() reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates { expression, variable, diffVar, derivative } objects for
 * calc.derivative cross-engine tests. Covers polynomials, trig, exp/log,
 * chain rule, product rule, and higher-order derivatives.
 */
async function generateCalcDerivativeCases(py) {
  const inputs = [
    { expr: "x**2", variable: "x", diffVar: "x" },
    { expr: "sin(x)", variable: "x", diffVar: "x" },
    { expr: "exp(x)", variable: "x", diffVar: "x" },
    { expr: "log(x)", variable: "x", diffVar: "x" },
    { expr: "x**3 - 3*x + 1", variable: "x", diffVar: "x" },
    { expr: "sin(x) * exp(x)", variable: "x", diffVar: "x" },
    { expr: "cos(x**2)", variable: "x", diffVar: "x" },
    { expr: "1 / (x + 1)", variable: "x", diffVar: "x" },
    { expr: "t**4 - 2*t**2", variable: "t", diffVar: "t" },
    { expr: "sqrt(x)", variable: "x", diffVar: "x" },
  ];

  const cases = [];
  for (const { expr, variable, diffVar } of inputs) {
    const derivative = py.runPython(`
from sympy import symbols, sympify, diff
${variable} = symbols('${variable}')
_expr = sympify(${JSON.stringify(expr)})
str(diff(_expr, ${diffVar}))
`.trim());
    cases.push({ expression: expr, variable, diffVar, derivative });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "SymPy diff() reference derivatives for calc.derivative cross-engine tests.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// calc.integrate — integrate() reference values (indefinite)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates { expression, variable, integVar, integral } objects for
 * calc.integrate cross-engine tests. Covers polynomials, trig, exp,
 * and simple rational functions. No constant of integration.
 */
async function generateCalcIntegrateCases(py) {
  const inputs = [
    { expr: "x**2", variable: "x", integVar: "x" },
    { expr: "sin(x)", variable: "x", integVar: "x" },
    { expr: "exp(x)", variable: "x", integVar: "x" },
    { expr: "cos(x)", variable: "x", integVar: "x" },
    { expr: "x**3 - 3*x", variable: "x", integVar: "x" },
    { expr: "1 / x", variable: "x", integVar: "x" },
    { expr: "exp(-x)", variable: "x", integVar: "x" },
    { expr: "x * exp(x)", variable: "x", integVar: "x" },
    { expr: "t**2 + 1", variable: "t", integVar: "t" },
    { expr: "sin(x) * cos(x)", variable: "x", integVar: "x" },
  ];

  const cases = [];
  for (const { expr, variable, integVar } of inputs) {
    const integral = py.runPython(`
from sympy import symbols, sympify, integrate
${variable} = symbols('${variable}')
_expr = sympify(${JSON.stringify(expr)})
str(integrate(_expr, ${integVar}))
`.trim());
    cases.push({ expression: expr, variable, integVar, integral });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "SymPy integrate() indefinite integral reference values for calc.integrate cross-engine tests.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// calc.limit — limit() reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates { expression, variable, limitVar, point, limit } objects for
 * calc.limit cross-engine tests. Covers finite limits, limits at infinity,
 * and L'Hôpital-form (0/0) cases.
 */
async function generateCalcLimitCases(py) {
  const inputs = [
    { expr: "sin(x)/x", variable: "x", limitVar: "x", point: 0 },
    { expr: "x**2", variable: "x", limitVar: "x", point: 2 },
    { expr: "exp(x)", variable: "x", limitVar: "x", point: 0 },
    { expr: "(1 - cos(x)) / x**2", variable: "x", limitVar: "x", point: 0 },
    { expr: "1/x", variable: "x", limitVar: "x", point: "oo" },
    { expr: "exp(-x)", variable: "x", limitVar: "x", point: "oo" },
    { expr: "(x**2 - 1) / (x - 1)", variable: "x", limitVar: "x", point: 1 },
    { expr: "x * sin(1/x)", variable: "x", limitVar: "x", point: "oo" },
    { expr: "log(x) / x", variable: "x", limitVar: "x", point: "oo" },
    { expr: "(exp(x) - 1) / x", variable: "x", limitVar: "x", point: 0 },
  ];

  const cases = [];
  for (const { expr, variable, limitVar, point } of inputs) {
    const pointStr = typeof point === "string" ? point : String(point);
    const limitVal = py.runPython(`
from sympy import symbols, sympify, limit, oo, zoo
${variable} = symbols('${variable}')
_expr = sympify(${JSON.stringify(expr)})
str(limit(_expr, ${limitVar}, ${pointStr}))
`.trim());
    cases.push({ expression: expr, variable, limitVar, point: pointStr, limit: limitVal });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "SymPy limit() reference values for calc.limit cross-engine tests.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// calc.taylor — series() Taylor expansion reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates { expression, variable, seriesVar, center, order, taylor } objects
 * for calc.taylor cross-engine tests. Uses the same removeO() pattern as the
 * Pyodide worker.
 */
async function generateCalcTaylorCases(py) {
  const inputs = [
    { expr: "sin(x)", variable: "x", seriesVar: "x", center: 0, order: 4 },
    { expr: "cos(x)", variable: "x", seriesVar: "x", center: 0, order: 4 },
    { expr: "exp(x)", variable: "x", seriesVar: "x", center: 0, order: 4 },
    { expr: "log(1 + x)", variable: "x", seriesVar: "x", center: 0, order: 4 },
    { expr: "1 / (1 - x)", variable: "x", seriesVar: "x", center: 0, order: 4 },
    { expr: "sin(x)", variable: "x", seriesVar: "x", center: 0, order: 6 },
    { expr: "exp(x)", variable: "x", seriesVar: "x", center: 0, order: 6 },
    { expr: "x**3 - x", variable: "x", seriesVar: "x", center: 0, order: 4 },
    { expr: "sin(x)", variable: "x", seriesVar: "x", center: 0, order: 2 },
    { expr: "exp(t)", variable: "t", seriesVar: "t", center: 0, order: 4 },
  ];

  const cases = [];
  for (const { expr, variable, seriesVar, center, order } of inputs) {
    const taylorStr = py.runPython(`
from sympy import symbols, sympify, series
${variable} = symbols('${variable}')
_expr = sympify(${JSON.stringify(expr)})
_s = series(_expr, ${seriesVar}, ${center}, ${order + 1}).removeO()
str(_s)
`.trim());
    cases.push({ expression: expr, variable, seriesVar, center, order, taylor: taylorStr });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "SymPy series().removeO() Taylor expansion reference values for calc.taylor cross-engine tests.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// calc.definite-integrate — definiteIntegrate() numeric reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates { expression, variable, integVar, a, b, result } objects for
 * calc.definite-integrate cross-engine tests. Returns exact floats for
 * clean closed-form cases.
 */
async function generateCalcDefiniteIntegrateCases(py) {
  const inputs = [
    { expr: "x**2", variable: "x", integVar: "x", a: 0, b: 1 },
    { expr: "x**2", variable: "x", integVar: "x", a: 0, b: 3 },
    { expr: "sin(x)", variable: "x", integVar: "x", a: 0, b: 3.141592653589793 },
    { expr: "exp(x)", variable: "x", integVar: "x", a: 0, b: 1 },
    { expr: "cos(x)", variable: "x", integVar: "x", a: 0, b: 1.5707963267948966 },
    { expr: "1 / (1 + x**2)", variable: "x", integVar: "x", a: 0, b: 1 },
    { expr: "x * exp(-x)", variable: "x", integVar: "x", a: 0, b: 5 },
    { expr: "x**3", variable: "x", integVar: "x", a: -1, b: 1 },
  ];

  const cases = [];
  for (const { expr, variable, integVar, a, b } of inputs) {
    const result = py.runPython(`
from sympy import symbols, sympify, integrate, N, pi
${variable} = symbols('${variable}')
_expr = sympify(${JSON.stringify(expr)})
_result = integrate(_expr, (${integVar}, ${a}, ${b}))
float(N(_result))
`.trim());
    cases.push({ expression: expr, variable, integVar, a, b, result });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "SymPy definite integral numeric reference values for calc.definite-integrate cross-engine tests.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// calc.series — partial sum reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates { expression, index, from, to, result } objects for
 * calc.series cross-engine tests. Covers geometric series, arithmetic,
 * factorial (converging), and symbolic forms that evaluate to numbers.
 */
async function generateCalcSeriesCases(py) {
  const inputs = [
    // Arithmetic sum: sum_{n=1}^{10} n = 55
    { expr: "n", index: "n", from: 1, to: 10 },
    // Sum of squares: sum_{n=1}^{5} n^2 = 55
    { expr: "n**2", index: "n", from: 1, to: 5 },
    // Geometric: sum_{n=0}^{4} 2^n = 31
    { expr: "2**n", index: "n", from: 0, to: 4 },
    // Geometric: sum_{n=0}^{9} (1/2)^n ≈ 1.998...
    { expr: "(1/2)**n", index: "n", from: 0, to: 9 },
    // Harmonic partial sum: sum_{n=1}^{5} 1/n = 137/60
    { expr: "1/n", index: "n", from: 1, to: 5 },
    // sum_{n=0}^{3} (n+1) = 10
    { expr: "n + 1", index: "n", from: 0, to: 3 },
    // sum_{n=1}^{4} n*(n+1) = 40
    { expr: "n * (n + 1)", index: "n", from: 1, to: 4 },
    // sum_{n=0}^{5} (-1)^n = 1
    { expr: "(-1)**n", index: "n", from: 0, to: 5 },
  ];

  const cases = [];
  for (const { expr, index, from, to } of inputs) {
    const resultStr = py.runPython(`
from sympy import symbols, sympify, Sum
${index} = symbols('${index}')
_a = sympify(${JSON.stringify(expr)})
_s = Sum(_a, (${index}, ${from}, ${to})).doit()
str(_s)
`.trim());
    // Determine if numeric
    const numeric = Number(resultStr);
    cases.push({
      expression: expr,
      index,
      from,
      to,
      result: resultStr,
      numericResult: Number.isFinite(numeric) ? numeric : null,
    });
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "SymPy Sum().doit() partial sum reference values for calc.series cross-engine tests.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.gcd — gcd(a, b) reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference gcd(a, b) values for discrete.gcd cross-engine tests.
 * All values are non-negative integers; SymPy gcd() always returns non-negative.
 * Covers: coprime pairs, equal inputs, one-zero, small primes, composite pairs.
 */
async function generateGcdCases(py) {
  const pairs = [
    [0, 0],
    [0, 5],
    [5, 0],
    [1, 1],
    [1, 100],
    [7, 13],   // coprime primes
    [12, 8],   // gcd = 4
    [100, 75], // gcd = 25
    [17, 34],  // gcd = 17
    [360, 252], // gcd = 36
    [48, 36],  // gcd = 12
    [0, 1],
    [2, 3],
    [6, 9],    // gcd = 3
    [35, 14],  // gcd = 7
    [1001, 77], // gcd = 77
    [1000000, 999999], // consecutive → gcd = 1
  ];

  const cases = [];
  for (const [a, b] of pairs) {
    const result = py.runPython(`
from sympy import gcd
import json
json.dumps({"a": ${a}, "b": ${b}, "gcd": int(gcd(${a}, ${b}))})
`);
    cases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference gcd(a, b) values from SymPy. All inputs are non-negative integers. " +
      "Covers coprime pairs, equal inputs, one-zero, composite pairs, and large consecutive integers.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.is-prime — isprime(n) reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference isprime(n) values for discrete.is-prime cross-engine tests.
 * Covers primes up to 100, small composites, edge cases (0, 1, 2), and a few
 * larger primes/composites to stress the primality test.
 */
async function generatePrimeCases(py) {
  const numbers = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    23, 25, 29, 31, 37, 41, 43, 47, 49,
    53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
    100, 101, 127, 128, 131, 169, 197, 199,
    // Carmichael numbers (composite but pass some primality filters)
    561, 1105, 1729,
    // A few larger primes
    9973, 10007,
  ];

  const cases = [];
  for (const n of numbers) {
    const result = py.runPython(`
from sympy import isprime
import json
json.dumps({"n": ${n}, "isPrime": bool(isprime(${n}))})
`);
    cases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference isprime(n) values from SymPy. Covers 0, 1, small primes and composites, " +
      "primes up to 100, Carmichael numbers, and several larger primes/composites.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.factor — factorint(n) reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference factorint(n) prime decompositions for discrete.factor.
 * SymPy factorint() returns {prime: exponent} dicts. We store as sorted
 * [prime, exponent] pairs for deterministic JSON.
 */
async function generateFactorintCases(py) {
  const numbers = [
    1, 2, 3, 4, 6, 8, 12, 16, 24, 36, 60,
    100, 120, 128, 360, 1000, 1024,
    // Products of two large primes
    2 * 3, 5 * 7, 11 * 13, 97 * 89,
    // Highly composite
    720, 5040,
    // Prime powers
    32, 81, 243,
  ];

  const cases = [];
  for (const n of numbers) {
    const result = py.runPython(`
from sympy import factorint
import json
factors = factorint(${n})
# Convert to sorted list of [prime, exponent] for deterministic serialisation
pairs = sorted([[int(p), int(e)] for p, e in factors.items()])
json.dumps({"n": ${n}, "factors": pairs})
`);
    cases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference prime factorization values from SymPy factorint(). Factors stored as " +
      "sorted [prime, exponent] pairs. Covers small composites, prime powers, products of primes, " +
      "and highly composite numbers.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.totient — Euler's φ(n) reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference totient(n) = φ(n) values for discrete.totient.
 * SymPy totient() computes Euler's totient function exactly.
 * Includes primes (φ(p) = p-1), prime powers, and composite invariants.
 */
async function generateTotientCases(py) {
  const numbers = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    12, 15, 16, 18, 20, 24, 25, 30, 36,
    // Primes — φ(p) = p-1
    41, 43, 47, 53, 59, 61, 97, 101,
    // Prime powers — φ(p^k) = p^(k-1) * (p-1)
    32, 64, 81, 125,
    // Highly composite
    360, 720,
  ];

  const cases = [];
  for (const n of numbers) {
    const result = py.runPython(`
from sympy import totient
import json
json.dumps({"n": ${n}, "totient": int(totient(${n}))})
`);
    cases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference Euler totient φ(n) values from SymPy. Covers 1–10, primes, prime powers, " +
      "and composite numbers including highly composite ones. All results are exact integers.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.binomial — C(n, k) reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference binomial(n, k) values for discrete.binomial.
 * SymPy binomial() returns exact integers. Covers boundary cases (k=0, k=n),
 * symmetry (C(n,k) = C(n,n-k)), Pascal's identity (C(n,k) = C(n-1,k-1) + C(n-1,k)),
 * and larger values.
 */
async function generateDiscreteBinomialCases(py) {
  const pairs = [
    // Boundary cases
    [0, 0],
    [1, 0], [1, 1],
    [5, 0], [5, 5],
    // Small standard cases
    [2, 1], [3, 1], [3, 2],
    [4, 2], [5, 2], [6, 3],
    // Pascal's identity verification cases
    [10, 3], [10, 7],
    [15, 5], [15, 10],
    // Larger values for correctness stress
    [20, 10], [20, 0], [20, 20],
    [30, 15],
    [50, 25],
    // C(n,1) = n
    [7, 1], [100, 1],
    // C(n, n-1) = n
    [7, 6], [10, 9],
  ];

  const cases = [];
  for (const [n, k] of pairs) {
    const result = py.runPython(`
from sympy import binomial
import json
json.dumps({"n": ${n}, "k": ${k}, "value": int(binomial(${n}, ${k}))})
`);
    cases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference C(n, k) values from SymPy binomial(). All results are exact integers. " +
      "Covers boundary cases (k=0, k=n), symmetry, Pascal identity pairs, and C(50,25).",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// discrete.modular — modular_inverse and modpow reference values
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference modular arithmetic values for discrete.modular blocks:
 *   - mod_inverse(a, m): multiplicative inverse of a mod m (requires gcd(a,m)=1)
 *   - pow(a, b, m):      modular exponentiation a^b mod m
 *
 * All values are non-negative integers; SymPy mod_inverse() raises when
 * gcd(a, m) ≠ 1 so all inverse cases use coprime inputs.
 */
async function generateModularCases(py) {
  const inverseCases = [];
  const inversePairs = [
    // [a, m] where gcd(a, m) = 1
    [1, 5], [2, 5], [3, 5], [4, 5],
    [3, 7], [5, 7], [6, 7],
    [7, 11], [3, 11], [4, 11],
    [2, 13], [7, 13],
    [17, 100], [3, 100],
    [1, 2], [1, 997],
  ];

  for (const [a, m] of inversePairs) {
    const result = py.runPython(`
from sympy import mod_inverse
import json
json.dumps({"a": ${a}, "m": ${m}, "inverse": int(mod_inverse(${a}, ${m}))})
`);
    inverseCases.push(JSON.parse(result));
  }

  const powCases = [];
  const powTriples = [
    // [a, b, m]
    [2, 10, 1000],
    [3, 0, 7],
    [0, 5, 13],
    [1, 1000000, 97],
    [2, 100, 97],
    [7, 200, 13],
    [5, 3, 13],
    [17, 51, 100],
    [2, 32, 1000000007],
    [123, 456, 789],
  ];

  for (const [a, b, m] of powTriples) {
    const result = py.runPython(`
import json
json.dumps({"a": ${a}, "b": ${b}, "m": ${m}, "result": int(pow(${a}, ${b}, ${m}))})
`);
    powCases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference modular arithmetic values from SymPy. " +
      "mod_inverse(a, m): multiplicative inverse of a mod m for coprime pairs. " +
      "modpow(a, b, m): modular exponentiation a^b mod m.",
    inverseCases,
    powCases,
  };
}

/**
 * Fibonacci sequence: F(n) where F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).
 * SymPy fibonacci(n) is 1-indexed (fibonacci(1)=1, fibonacci(2)=1, …)
 * but our implementation is 0-indexed. We generate cases as {n, f_n} where
 * f_n = the n-th term of the 0-indexed sequence (F(0)=0, F(1)=1, …).
 * Covers 0..20 plus a selection of larger terms up to n=30.
 */
async function generateFibonacciCases(py) {
  const nValues = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    25, 30,
  ];

  const cases = [];
  for (const n of nValues) {
    // SymPy fibonacci(k) gives the k-th Fibonacci with fibonacci(0)=0, fibonacci(1)=1
    const result = py.runPython(`
from sympy import fibonacci
import json
json.dumps({"n": ${n}, "value": int(fibonacci(${n}))})
`);
    cases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference Fibonacci values from SymPy fibonacci(n). 0-indexed: F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2). " +
      "Covers n=0..20 plus n=25,30. All values are exact non-negative integers.",
    cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// geom.distance — point-point (as distSq) and point-line distances
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference distance values using sympy.geometry.
 * - Point-point: stored as distSq (exact integer) to avoid irrational serialisation.
 * - Point-line: stored as exact rational {n, d} via SymPy Rational arithmetic.
 * All inputs are integer coordinates.
 */
async function generateGeomDistanceCases(py) {
  const ppPairs = [
    [[0, 0], [3, 4]],
    [[0, 0], [5, 12]],
    [[1, 1], [4, 5]],
    [[-3, -4], [0, 0]],
    [[0, 0], [8, 15]],
    [[1, 2], [4, 6]],
    [[-1, -1], [2, 3]],
    [[0, 0], [0, 0]],
    [[7, 0], [0, 0]],
    [[3, 4], [6, 8]],
  ];

  const pointPointCases = [];
  for (const [p1, p2] of ppPairs) {
    const result = py.runPython(`
from sympy.geometry import Point2D
import json
p1 = Point2D(${p1[0]}, ${p1[1]})
p2 = Point2D(${p2[0]}, ${p2[1]})
dx = p2.x - p1.x
dy = p2.y - p1.y
dist_sq = int(dx**2 + dy**2)
json.dumps({"p1": [${p1[0]}, ${p1[1]}], "p2": [${p2[0]}, ${p2[1]}], "distSq": dist_sq})
`);
    pointPointCases.push(JSON.parse(result));
  }

  const plCases = [
    { point: [0, 0], lp1: [1, 0], lp2: [1, 1] },
    { point: [0, 0], lp1: [0, 1], lp2: [1, 1] },
    { point: [2, 3], lp1: [0, 0], lp2: [4, 3] },
    { point: [1, 1], lp1: [0, 0], lp2: [1, 0] },
    { point: [3, 4], lp1: [0, 0], lp2: [3, 0] },
    { point: [6, 0], lp1: [0, 0], lp2: [3, 4] },
  ];

  const pointLineCases = [];
  for (const c of plCases) {
    const result = py.runPython(`
from sympy.geometry import Point2D, Line2D
from sympy import Rational
import json
pt = Point2D(${c.point[0]}, ${c.point[1]})
line = Line2D(Point2D(${c.lp1[0]}, ${c.lp1[1]}), Point2D(${c.lp2[0]}, ${c.lp2[1]}))
dist = line.distance(pt)
frac = dist.as_numer_denom()
json.dumps({
  "point": [${c.point[0]}, ${c.point[1]}],
  "line": {"p1": [${c.lp1[0]}, ${c.lp1[1]}], "p2": [${c.lp2[0]}, ${c.lp2[1]}]},
  "distN": int(frac[0]),
  "distD": int(frac[1])
})
`);
    pointLineCases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference geometry distances from sympy.geometry. point-point stored as distSq (exact integer). " +
      "point-line stored as exact rational {distN, distD} where distance = distN/distD.",
    pointPointCases,
    pointLineCases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// geom.intersection — line-line (exact rational), line-circle, parallel check
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference intersection values using sympy.geometry.
 * Restricted to integer inputs so results are exact rationals.
 * - line-line: {intersectionX: {n,d}, intersectionY: {n,d}}
 * - line-circle: {intersectionCount, intersections: [{x,y}]}
 * - parallel lines: {parallel: true}
 */
async function generateGeomIntersectionCases(py) {
  const llPairs = [
    { l1p1: [0, 0], l1p2: [1, 1], l2p1: [0, 1], l2p2: [1, 0] },
    { l1p1: [0, 0], l1p2: [2, 1], l2p1: [0, 2], l2p2: [2, 0] },
    { l1p1: [0, 0], l1p2: [1, 0], l2p1: [0, 0], l2p2: [0, 1] },
    { l1p1: [0, 1], l1p2: [4, 1], l2p1: [2, 0], l2p2: [2, 4] },
    { l1p1: [0, 0], l1p2: [3, 2], l2p1: [0, 4], l2p2: [3, 0] },
  ];

  const lineLineCases = [];
  for (const c of llPairs) {
    const result = py.runPython(`
from sympy.geometry import Line2D, Point2D
import json
l1 = Line2D(Point2D(${c.l1p1[0]}, ${c.l1p1[1]}), Point2D(${c.l1p2[0]}, ${c.l1p2[1]}))
l2 = Line2D(Point2D(${c.l2p1[0]}, ${c.l2p1[1]}), Point2D(${c.l2p2[0]}, ${c.l2p2[1]}))
pts = l1.intersection(l2)
pt = pts[0]
xn, xd = pt.x.as_numer_denom()
yn, yd = pt.y.as_numer_denom()
json.dumps({
  "l1": {"p1": [${c.l1p1[0]}, ${c.l1p1[1]}], "p2": [${c.l1p2[0]}, ${c.l1p2[1]}]},
  "l2": {"p1": [${c.l2p1[0]}, ${c.l2p1[1]}], "p2": [${c.l2p2[0]}, ${c.l2p2[1]}]},
  "intersectionX": {"n": int(xn), "d": int(xd)},
  "intersectionY": {"n": int(yn), "d": int(yd)}
})
`);
    lineLineCases.push(JSON.parse(result));
  }

  const parallelPairs = [
    { l1p1: [0, 0], l1p2: [1, 1], l2p1: [0, 1], l2p2: [1, 2] },
    { l1p1: [0, 0], l1p2: [2, 0], l2p1: [0, 3], l2p2: [2, 3] },
  ];

  const parallelLinesCases = [];
  for (const c of parallelPairs) {
    const result = py.runPython(`
from sympy.geometry import Line2D, Point2D
import json
l1 = Line2D(Point2D(${c.l1p1[0]}, ${c.l1p1[1]}), Point2D(${c.l1p2[0]}, ${c.l1p2[1]}))
l2 = Line2D(Point2D(${c.l2p1[0]}, ${c.l2p1[1]}), Point2D(${c.l2p2[0]}, ${c.l2p2[1]}))
json.dumps({
  "l1": {"p1": [${c.l1p1[0]}, ${c.l1p1[1]}], "p2": [${c.l1p2[0]}, ${c.l1p2[1]}]},
  "l2": {"p1": [${c.l2p1[0]}, ${c.l2p1[1]}], "p2": [${c.l2p2[0]}, ${c.l2p2[1]}]},
  "parallel": l1.is_parallel(l2)
})
`);
    parallelLinesCases.push(JSON.parse(result));
  }

  const lcCases = [
    { cx: 0, cy: 0, r: 5, lp1: [0, 5], lp2: [1, 5] },
    { cx: 0, cy: 0, r: 5, lp1: [0, 0], lp2: [3, 4] },
    { cx: 0, cy: 0, r: 5, lp1: [0, 7], lp2: [1, 7] },
  ];

  const lineCircleCases = [];
  for (const c of lcCases) {
    const result = py.runPython(`
from sympy.geometry import Circle, Line2D, Point2D
import json
circle = Circle(Point2D(${c.cx}, ${c.cy}), ${c.r})
line = Line2D(Point2D(${c.lp1[0]}, ${c.lp1[1]}), Point2D(${c.lp2[0]}, ${c.lp2[1]}))
pts = circle.intersection(line)
intersections = []
for pt in pts:
  xn, xd = pt.x.as_numer_denom()
  yn, yd = pt.y.as_numer_denom()
  intersections.append({"x": {"n": int(xn), "d": int(xd)}, "y": {"n": int(yn), "d": int(yd)}})
intersections.sort(key=lambda p: (p["x"]["n"] / p["x"]["d"], p["y"]["n"] / p["y"]["d"]))
json.dumps({
  "center": [${c.cx}, ${c.cy}],
  "radius": ${c.r},
  "line": {"p1": [${c.lp1[0]}, ${c.lp1[1]}], "p2": [${c.lp2[0]}, ${c.lp2[1]}]},
  "intersectionCount": len(pts),
  "intersections": intersections
})
`);
    lineCircleCases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference intersection results from sympy.geometry. Integer inputs only. " +
      "Coordinates as exact rational {n, d}.",
    lineLineCases,
    parallelLinesCases,
    lineCircleCases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// geom.transformation — translation, reflection, rotation by multiples of 90°
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference transformation values using sympy.geometry.
 * - Translation: Point2D.translate(dx, dy)
 * - Reflection: across x-axis, y-axis, y=x, y=-x
 * - Rotation: by 90°, 180°, -90° (exact integer results for integer inputs)
 * Results stored as exact rational {n, d}.
 */
async function generateGeomTransformationCases(py) {
  const translationInputs = [
    { point: [0, 0], dx: 3, dy: 4 },
    { point: [1, 2], dx: -1, dy: -2 },
    { point: [3, -1], dx: 0, dy: 5 },
    { point: [-2, -3], dx: 5, dy: 7 },
  ];

  const translationCases = [];
  for (const c of translationInputs) {
    const result = py.runPython(`
from sympy.geometry import Point2D
import json
pt = Point2D(${c.point[0]}, ${c.point[1]})
translated = pt.translate(${c.dx}, ${c.dy})
xn, xd = translated.x.as_numer_denom()
yn, yd = translated.y.as_numer_denom()
json.dumps({
  "point": [${c.point[0]}, ${c.point[1]}],
  "dx": ${c.dx},
  "dy": ${c.dy},
  "result": {"x": {"n": int(xn), "d": int(xd)}, "y": {"n": int(yn), "d": int(yd)}}
})
`);
    translationCases.push(JSON.parse(result));
  }

  const reflectionInputs = [
    { point: [3, 4], axis: "x" },
    { point: [3, 4], axis: "y" },
    { point: [3, 4], axis: "y=x" },
    { point: [3, 4], axis: "y=-x" },
    { point: [0, 0], axis: "x" },
    { point: [5, 0], axis: "y" },
  ];

  const reflectionCases = [];
  for (const c of reflectionInputs) {
    const axisCode =
      c.axis === "x"
        ? "Line2D(Point2D(0,0), Point2D(1,0))"
        : c.axis === "y"
          ? "Line2D(Point2D(0,0), Point2D(0,1))"
          : c.axis === "y=x"
            ? "Line2D(Point2D(0,0), Point2D(1,1))"
            : "Line2D(Point2D(0,0), Point2D(1,-1))";
    const result = py.runPython(`
from sympy.geometry import Point2D, Line2D
import json
pt = Point2D(${c.point[0]}, ${c.point[1]})
axis = ${axisCode}
reflected = pt.reflect(axis)
xn, xd = reflected.x.as_numer_denom()
yn, yd = reflected.y.as_numer_denom()
json.dumps({
  "point": [${c.point[0]}, ${c.point[1]}],
  "axis": "${c.axis}",
  "result": {"x": {"n": int(xn), "d": int(xd)}, "y": {"n": int(yn), "d": int(yd)}}
})
`);
    reflectionCases.push(JSON.parse(result));
  }

  const rotationInputs = [
    { point: [1, 0], angleDeg: 90 },
    { point: [0, 1], angleDeg: 90 },
    { point: [3, 4], angleDeg: 90 },
    { point: [3, 4], angleDeg: 180 },
    { point: [1, 0], angleDeg: -90 },
    { point: [0, 0], angleDeg: 90 },
  ];

  const rotation90Cases = [];
  for (const c of rotationInputs) {
    const result = py.runPython(`
from sympy.geometry import Point2D
from sympy import pi, cos, sin, Rational, simplify
import json
pt = Point2D(${c.point[0]}, ${c.point[1]})
angle_rad = pi * ${c.angleDeg} / 180
c_val = cos(angle_rad)
s_val = sin(angle_rad)
# Rotation matrix: [[c,-s],[s,c]]
rx = simplify(c_val * pt.x - s_val * pt.y)
ry = simplify(s_val * pt.x + c_val * pt.y)
xn, xd = rx.as_numer_denom()
yn, yd = ry.as_numer_denom()
json.dumps({
  "point": [${c.point[0]}, ${c.point[1]}],
  "angleDeg": ${c.angleDeg},
  "result": {"x": {"n": int(xn), "d": int(xd)}, "y": {"n": int(yn), "d": int(yd)}}
})
`);
    rotation90Cases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference transformation values from sympy.geometry. Integer inputs. " +
      "Rotations restricted to multiples of 90° for exact integer results. " +
      "Coordinates as exact rational {n, d}.",
    translationCases,
    reflectionCases,
    rotation90Cases,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// geom.area — polygon (shoelace) and circle areas
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generates reference area values using sympy.geometry.
 * - Triangle and polygon areas via shoelace (exact rational {areaN, areaD}).
 * - Circle areas stored as {rSq} where area = rSq * π (avoids π serialisation).
 */
async function generateGeomAreaCases(py) {
  const triangleInputs = [
    [[0, 0], [4, 0], [0, 3]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [6, 0], [3, 4]],
    [[1, 1], [5, 1], [3, 4]],
    [[0, 0], [3, 0], [3, 3]],
    [[-1, 0], [1, 0], [0, 2]],
  ];

  const triangleAreaCases = [];
  for (const verts of triangleInputs) {
    const vertStr = verts.map((v) => `Point2D(${v[0]},${v[1]})`).join(", ");
    const result = py.runPython(`
from sympy.geometry import Triangle, Point2D
import json
tri = Triangle(${vertStr})
area = tri.area
an, ad = area.as_numer_denom()
json.dumps({
  "vertices": ${JSON.stringify(verts)},
  "areaN": int(an),
  "areaD": int(ad)
})
`);
    triangleAreaCases.push(JSON.parse(result));
  }

  const polygonInputs = [
    [[0, 0], [4, 0], [4, 3], [0, 3]],
    [[0, 0], [2, 0], [2, 2], [0, 2]],
    [[0, 0], [4, 0], [3, 2], [1, 2]],
    [[0, 0], [3, 0], [4, 2], [2, 4], [0, 3]],
  ];

  const polygonAreaCases = [];
  for (const verts of polygonInputs) {
    const vertStr = verts.map((v) => `Point2D(${v[0]},${v[1]})`).join(", ");
    const result = py.runPython(`
from sympy.geometry import Polygon, Point2D
import json
poly = Polygon(${vertStr})
area = poly.area
an, ad = area.as_numer_denom()
json.dumps({
  "vertices": ${JSON.stringify(verts)},
  "areaN": int(an),
  "areaD": int(ad)
})
`);
    polygonAreaCases.push(JSON.parse(result));
  }

  const circleInputs = [
    { cx: 0, cy: 0, r: 1 },
    { cx: 0, cy: 0, r: 3 },
    { cx: 1, cy: 2, r: 5 },
    { cx: 0, cy: 0, r: 2 },
  ];

  const circleAreaCases = [];
  for (const c of circleInputs) {
    const result = py.runPython(`
from sympy.geometry import Circle, Point2D
import json
circle = Circle(Point2D(${c.cx}, ${c.cy}), ${c.r})
# area = pi * r^2; store rSq to avoid serialising pi
r_sq = int(circle.radius**2)
json.dumps({
  "center": [${c.cx}, ${c.cy}],
  "radius": ${c.r},
  "rSq": r_sq
})
`);
    circleAreaCases.push(JSON.parse(result));
  }

  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description:
      "Reference area values from sympy.geometry. Triangle/polygon areas as exact rational {areaN, areaD}. " +
      "Circle areas as {rSq} where area = rSq * π.",
    triangleAreaCases,
    polygonAreaCases,
    circleAreaCases,
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

  console.log("\nGenerating stats.binomial fixtures…");
  const binomialFixture = await generateBinomialCases(py);
  writeFixture("stats-binomial", binomialFixture);

  console.log("\nGenerating stats.uniform fixtures…");
  const uniformFixture = await generateUniformCases(py);
  writeFixture("stats-uniform", uniformFixture);

  console.log("\nGenerating stats.normal fixtures…");
  const normalFixture = await generateNormalCases(py);
  writeFixture("stats-normal", normalFixture);

  console.log("\nGenerating stats.poisson fixtures…");
  const poissonFixture = await generatePoissonCases(py);
  writeFixture("stats-poisson", poissonFixture);

  console.log("\nGenerating stats.beta fixtures…");
  const betaFixture = await generateBetaCases(py);
  writeFixture("stats-beta", betaFixture);

  console.log("\nGenerating stats.gamma fixtures…");
  const gammaFixture = await generateGammaCases(py);
  writeFixture("stats-gamma", gammaFixture);

  console.log("\nGenerating stats.posterior fixtures…");
  const posteriorFixture = await generatePosteriorCases(py);
  writeFixture("stats-posterior", posteriorFixture);

  console.log("\nGenerating stats.mgf fixtures…");
  const mgfFixture = await generateMgfCases(py);
  writeFixture("stats-mgf", mgfFixture);

  console.log("\nGenerating calc.function fixtures…");
  const calcFunctionFixture = await generateCalcFunctionCases(py);
  writeFixture("calc-function", calcFunctionFixture);

  console.log("\nGenerating calc.derivative fixtures…");
  const calcDerivativeFixture = await generateCalcDerivativeCases(py);
  writeFixture("calc-derivative", calcDerivativeFixture);

  console.log("\nGenerating calc.integrate fixtures…");
  const calcIntegrateFixture = await generateCalcIntegrateCases(py);
  writeFixture("calc-integrate", calcIntegrateFixture);

  console.log("\nGenerating calc.limit fixtures…");
  const calcLimitFixture = await generateCalcLimitCases(py);
  writeFixture("calc-limit", calcLimitFixture);

  console.log("\nGenerating calc.taylor fixtures…");
  const calcTaylorFixture = await generateCalcTaylorCases(py);
  writeFixture("calc-taylor", calcTaylorFixture);

  console.log("\nGenerating calc.definite-integrate fixtures…");
  const calcDefIntFixture = await generateCalcDefiniteIntegrateCases(py);
  writeFixture("calc-definite-integrate", calcDefIntFixture);

  console.log("\nGenerating calc.series fixtures…");
  const calcSeriesFixture = await generateCalcSeriesCases(py);
  writeFixture("calc-series", calcSeriesFixture);

  console.log("\nGenerating discrete.gcd fixtures…");
  const gcdFixture = await generateGcdCases(py);
  writeFixture("discrete-gcd", gcdFixture);

  console.log("\nGenerating discrete.is-prime fixtures…");
  const primeFixture = await generatePrimeCases(py);
  writeFixture("discrete-prime", primeFixture);

  console.log("\nGenerating discrete.factor fixtures…");
  const factorintFixture = await generateFactorintCases(py);
  writeFixture("discrete-factorint", factorintFixture);

  console.log("\nGenerating discrete.totient fixtures…");
  const totientFixture = await generateTotientCases(py);
  writeFixture("discrete-totient", totientFixture);

  console.log("\nGenerating discrete.binomial fixtures…");
  const discreteBinomialFixture = await generateDiscreteBinomialCases(py);
  writeFixture("discrete-binomial", discreteBinomialFixture);

  console.log("\nGenerating discrete.modular fixtures…");
  const modularFixture = await generateModularCases(py);
  writeFixture("discrete-modular", modularFixture);

  console.log("\nGenerating discrete.fibonacci fixtures…");
  const fibonacciFixture = await generateFibonacciCases(py);
  writeFixture("discrete-fibonacci", fibonacciFixture);

  console.log("\nGenerating geom.distance fixtures…");
  const geomDistanceFixture = await generateGeomDistanceCases(py);
  writeFixture("geom-distance", geomDistanceFixture);

  console.log("\nGenerating geom.intersection fixtures…");
  const geomIntersectionFixture = await generateGeomIntersectionCases(py);
  writeFixture("geom-intersection", geomIntersectionFixture);

  console.log("\nGenerating geom.transformation fixtures…");
  const geomTransformationFixture = await generateGeomTransformationCases(py);
  writeFixture("geom-transformation", geomTransformationFixture);

  console.log("\nGenerating geom.area fixtures…");
  const geomAreaFixture = await generateGeomAreaCases(py);
  writeFixture("geom-area", geomAreaFixture);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
