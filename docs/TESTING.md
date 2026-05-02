# Testing Strategy

Mathematical correctness is the project's first non-negotiable. This file specifies how we keep it.

## Layers of testing

| Layer | Tool | When | Goal |
|---|---|---|---|
| Type checks | `tsc --noEmit` | every save, CI gate | catch shape errors at edit time |
| Unit tests | Vitest | every save, CI gate | sanity per function |
| Property tests | Vitest + fast-check | CI gate | mathematical invariants on random inputs |
| Cross-engine differential tests | fast-check + Pyodide/SymPy | CI nightly + PR for math blocks | absolute correctness against gold standard |
| Visual regression | Storybook + Vitest browser mode | CI on UI changes | catch unintended UI shifts |
| E2E | Playwright | CI gate on PR | full flows work |

## Property-based tests for math blocks

Every operation block ships with a `tests` array in its `BlockDefinition`. Each entry is a property test executed by `fast-check`.

```typescript
// src/blocks/linear-algebra/matmul/matmul.test.ts
import fc from "fast-check";
import { test, expect } from "vitest";
import { multiply } from "./compute";
import { realMatrix } from "../../../../tests/arbitraries";

test("associativity: (A·B)·C = A·(B·C)", () => {
  fc.assert(
    fc.property(
      realMatrix({ m: 2, n: 3 }),
      realMatrix({ m: 3, n: 4 }),
      realMatrix({ m: 4, n: 2 }),
      (A, B, C) => {
        const left = multiply(multiply(A, B), C);
        const right = multiply(A, multiply(B, C));
        expect(matricesClose(left, right, 1e-9)).toBe(true);
      },
    ),
    { numRuns: 100 },
  );
});

test("identity: A·I = A", () => {
  // ...
});

test("matches SymPy on random integer inputs", async () => {
  fc.assert(
    fc.asyncProperty(
      integerMatrix({ m: 3, n: 4 }),
      integerMatrix({ m: 4, n: 5 }),
      async (A, B) => {
        const ours = multiply(A, B);
        const reference = await sympy.matmul(A, B);
        expect(matricesEqualExact(ours, reference)).toBe(true);
      },
    ),
    { numRuns: 50 },
  );
});
```

### What properties to test, by block role

| Role | Properties |
|---|---|
| Algebraic operation | identity, inverse (where defined), associativity, commutativity (where defined), distributivity, idempotence |
| Inverse / decomposition | round-trip: `decompose ∘ recompose = identity` to ε |
| Statistical moment | matches population moment as sample → ∞; bias / consistency |
| Distribution | PDF integrates to 1 over support; CDF monotone, bounded \[0,1]; quantile is CDF inverse |
| Calculus operation | linearity; chain rule; specific known derivatives/integrals match |
| Visualization | output matches input layout (snapshot test) |

## Gold-standard cross-checks

For any block where SymPy can compute the same thing:

1. Add a generator function to `scripts/generate-sympy-fixtures.mjs` that runs SymPy offline and writes a JSON fixture to `tests/fixtures/sympy/`.
2. Add a typed loader in `tests/sympy-reference.ts`.
3. Write a cross-engine test (`*-sympy.test.ts`) that loads the fixture and asserts our engine's output matches the precomputed values.
4. Commit both the script change and the JSON file.

These tests are tagged `@cross-engine`. They run in `pnpm test` alongside unit tests — they are fast (no Pyodide boot) because the SymPy values are precomputed.

See "SymPy fixture workflow" below for step-by-step instructions.

## SymPy fixture workflow

### Why fixtures instead of live Pyodide calls

Pyodide cannot be initialised inside a Vitest worker (it requires a browser or a full Node environment with `SharedArrayBuffer`). Running the Pyodide worker in CI is also slow and fragile. Instead:

- Fixtures are generated **once** by `pnpm generate:fixtures`, which runs Pyodide in a plain Node process.
- The resulting JSON files are committed to `tests/fixtures/sympy/`.
- Vitest loads them synchronously at test startup — no async boot, no network, deterministic across machines.

This means CI is always testing against a known, vetted SymPy output. If a fixture goes stale (engine version bump, input range change), you re-run the generator and commit the new JSON.

### When to regenerate

Regenerate whenever you:
- Add a new property test that needs SymPy reference values that don't exist in any current fixture.
- Extend an existing generator to cover new inputs or new operations.
- Bump the Pyodide / SymPy version (`node_modules/.pnpm/pyodide@*/`).

Do not regenerate just because a test fails — if the test asserts something wrong about our engine, fix the test or the engine, not the fixture.

### How to run the generator

```bash
pnpm generate:fixtures
```

This calls `node scripts/generate-sympy-fixtures.mjs`, which:
1. Loads Pyodide from `node_modules/.pnpm/pyodide@0.29.3/`.
2. Loads SymPy (downloads once, then cached by Pyodide).
3. Runs each `generate*` function and writes pretty-printed JSON to `tests/fixtures/sympy/`.

Commit the updated JSON files alongside any script or test changes.

### How to add a new fixture set

**Step 1 — Add a generator function in `scripts/generate-sympy-fixtures.mjs`:**

```javascript
/**
 * Generates reference values for la.transpose (involution).
 * Input: integer matrices, sizes 1×1 through 4×4.
 */
async function generateTransposeInvolution(py) {
  const cases = [];
  // ... build cases array using py.runPython(...)
  return {
    schemaVersion: 1,
    generated: new Date().toISOString(),
    description: "Reference transpose values computed by SymPy 1.13.x.",
    cases,
  };
}
```

Then call it in `main()` and write the result:

```javascript
console.log("\nGenerating la.transpose fixtures…");
const transposeFixture = await generateTransposeInvolution(py);
writeFixture("la-transpose", transposeFixture);
```

**Step 2 — Add a typed loader in `tests/sympy-reference.ts`:**

```typescript
export type TransposeCase = {
  A: number[][];
  At: number[][];
};

export type TransposeFixture = {
  schemaVersion: number;
  generated: string;
  description: string;
  cases: TransposeCase[];
};

export function loadTransposeFixture(): TransposeFixture {
  return loadJson<TransposeFixture>("la-transpose");
}
```

**Step 3 — Run the generator and commit:**

```bash
pnpm generate:fixtures
git add scripts/generate-sympy-fixtures.mjs tests/sympy-reference.ts tests/fixtures/sympy/la-transpose.json
```

**Step 4 — Write the cross-engine test** (see "Property testing pattern" below).

### Fixture file format

Every fixture file has:
- `schemaVersion: 1` — bump if the shape changes incompatibly.
- `generated` — ISO timestamp; helps trace which SymPy run produced the file.
- `description` — one sentence naming the operations and SymPy version.
- A cases array (or named top-level arrays for multi-kind fixtures like `la-matrix.json`).

All values use integer or exact-integer arithmetic so SymPy results are exact (`int(...)` in the Python snippet). Irrational results (e.g. norms) are stored as their square to avoid irrational serialisation (see `la-vector.json` — `normASq` rather than `norm`).

## Property testing pattern

Every cross-engine test follows the same three-part structure. The worked example uses `la.vector`.

### Part 1 — Load the fixture (once per file)

```typescript
// src/blocks/linear-algebra/vector/vector-sympy.test.ts
import { loadVectorFixture, type VectorCase } from "../../../../tests/sympy-reference";

// Synchronous read. No async, no Pyodide, no network.
const fixture = loadVectorFixture();
```

`loadVectorFixture()` reads `tests/fixtures/sympy/la-vector.json` at import time. The fixture was written by `pnpm generate:fixtures` and committed to the repository — CI sees the same values as your local machine.

### Part 2 — Structural sanity check

```typescript
describe("la.vector cross-engine (SymPy fixtures)", () => {
  test("fixture schema is present and non-empty", () => {
    expect(fixture.schemaVersion).toBe(1);
    expect(fixture.cases.length).toBeGreaterThan(0);
  });
```

This catches a missing or corrupted fixture file before any of the per-case tests run. It also fails if `schemaVersion` is bumped in the fixture without updating the loader type.

### Part 3 — Per-case assertions

```typescript
  describe("dot product matches SymPy exact values", () => {
    for (const c of fixture.cases) {
      const label = `dot([${c.a}], [${c.b}]) = ${c.dot}`;
      test(label, () => {
        // math.js returns IEEE 754; SymPy returns exact integers.
        // Normalise -0 → +0 so exact equality holds.
        const raw = dot(c.a, c.b) as number;
        const result = raw === 0 ? 0 : raw;
        expect(result).toBe(c.dot);
      });
    }
  });
```

Key conventions:
- **One `test()` per case**, named with the inputs and expected value. Failures identify the exact case immediately in the Vitest output.
- **Exact equality** (`toBe`) for integer inputs — SymPy computes exact integers, so a floating-point approximation that differs by even 1 ULP should fail.
- **`Math.round` for determinants** — floating-point accumulation in `det()` can shift the result by a small fraction. Since all fixture inputs are integers, `det` is always an exact integer; `Math.round(result)` converts safely. See `matrix-sympy.test.ts`.
- **Normalise `-0 → +0`** — IEEE 754 distinguishes `-0` and `+0`; SymPy always returns `0`. Use `x === 0 ? 0 : x` before `toBe` on any value that could be zero.

### Putting it together: the full file shape

```
src/blocks/linear-algebra/vector/
├── vector-sympy.test.ts   ← cross-engine test, loads la-vector.json
├── vector.test.ts          ← fast-check property tests (no fixture needed)
├── compute.ts
└── definition.ts
```

Cross-engine tests go in `*-sympy.test.ts`; fast-check structural tests (associativity, identity, etc.) go in the plain `*.test.ts`. Keeping them separate means `pnpm test` runs both, but you can filter with `pnpm test vector-sympy` when working on the cross-engine layer.

### Why this pattern

- **Deterministic** — fixtures are committed; CI never calls SymPy, so results don't vary by Pyodide version or network state.
- **Fast** — a synchronous `readFileSync` at test startup is negligible; no Worker boot, no async.
- **Cheap to extend** — add a case to the generator, re-run `pnpm generate:fixtures`, commit the JSON. The test loop picks it up automatically.
- **Auditable** — the JSON fixtures are human-readable and diff cleanly in PRs. A reviewer can verify the expected values without running SymPy.

---

## Precision rules

- `Fraction` and `BigNumber` (math.js) for `precision: "exact"` — always tested with exact equality.
- `number` (IEEE 754) for `precision: "approximate"` — tested with `Math.abs(a - b) < ε`. Default ε = 1e-9 for reals, 1e-12 for high-precision.
- Floating-point comparisons via a single helper `closeTo(a, b, eps)` in `tests/helpers.ts`. Never use `===` on floats in tests.
- Matrices: `matricesClose(A, B, eps)` element-wise.

When a block's output is approximate but its input was exact, the test must verify that the precision label correctly switches to `"approximate"`.

## Arbitraries

`tests/arbitraries.ts` exports fast-check generators for:

```typescript
realScalar({ min, max })
integerScalar({ min, max })
realVector({ n })
integerVector({ n })
realMatrix({ m, n, range? })
integerMatrix({ m, n, range? })
invertibleMatrix({ n })           // shrinks to identity
positiveDefiniteMatrix({ n })
diagonalMatrix({ n })
distribution()                    // any continuous distribution
expression({ vars })              // symbolic expression with given free vars
```

Always shrink to "boring" cases (zeros, identity, small integers) so failures are minimal counterexamples.

## Visual regression

Each Storybook story doubles as a visual regression test via Vitest browser mode (`@vitest/browser` + `playwright`).

- Stable stories run with snapshot comparison.
- Approve diffs deliberately; never auto-accept.
- Do not snapshot canvas content that contains randomness — use seeded random in stories.

## E2E

Playwright tests cover:

- New user flow: drop matrix, drop vector, connect, see visualization.
- Sharing: create graph → URL → open URL in second browser → identical render.
- Type mismatch: connect incompatible blocks → user sees the rejection feedback.
- Replay: open a templated graph, scrub timeline.

Keep E2E count low (≤ 10 tests). They're slow; rely on unit + visual + property for breadth.

## What we explicitly do NOT test

- Math.js internals (it has its own test suite).
- SymPy internals (same).
- Pyodide loading (mock at the boundary in unit tests).

## Bug protocol

When a math bug is found:

1. Write a failing property test or unit test that demonstrates it.
2. Fix.
3. Land both in the same PR. The test stays as a regression marker.
4. If the bug was in shape inference: add a `canConnect` test.
5. If the bug was a precision issue: add an entry to `docs/PRECISION_LEDGER.md` (create on first incident).
