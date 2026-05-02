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
// Main
// ──────────────────────────────────────────────────────────────────────────

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

  console.log("\nGenerating la.det multiplicativity fixtures…");
  const detFixture = await generateDetMultiplicativity(py);
  writeFixture("la-det-multiplicativity", detFixture);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
