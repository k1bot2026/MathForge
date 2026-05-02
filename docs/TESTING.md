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

### Guarding against hand-edits: `pnpm check:fixtures`

```bash
pnpm check:fixtures
```

This runs `pnpm generate:fixtures` then immediately runs `git diff --exit-code tests/fixtures/sympy/`. It exits non-zero if the freshly-regenerated fixtures differ from what is committed — meaning either:

- The committed JSON was edited by hand, or
- The generator script changed its output without the JSON being recommitted.

**When to run it:** before committing any changes to `scripts/generate-sympy-fixtures.mjs`. If the diff is clean, your generator change is idempotent against the committed fixtures. If it is not clean, regenerate and commit the updated JSON alongside the script change.

`pnpm check:fixtures` is the CI guard for fixture integrity. Do not edit fixture JSON directly — the generator is the single source of truth.

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

## `@cross-engine` tag convention

### What it marks

Any test file that validates our engine's output against a pre-computed SymPy reference
carries a `@cross-engine` JSDoc tag at the top:

```typescript
/**
 * Cross-engine tests for la.vector — compares our math.js implementation
 * against pre-computed SymPy reference values from
 * tests/fixtures/sympy/la-vector.json.
 *
 * @cross-engine
 */
```

Currently applied to: `vector-sympy.test.ts`, `matrix-sympy.test.ts`. Any new
`*-sympy.test.ts` file should carry the tag.

### What the tag signals to readers

A `@cross-engine` test is not just checking internal math.js consistency — it is
asserting that our result matches an independent computer algebra system (SymPy). This
is a stronger claim:

- The expected values were computed by a separate implementation (SymPy 1.13.x) using
  exact integer arithmetic.
- If this test fails, the bug is in **our compute logic**, not a test oversight.
- Passing this test means we agree with a gold standard on the covered inputs.

A test without `@cross-engine` that uses fast-check is checking mathematical invariants
(associativity, involution, etc.) using only our engine. That's valuable but doesn't
catch systematic bias in our implementation.

### The implicit promise

A `@cross-engine` file makes three promises:

1. **Deterministic** — it loads a committed fixture file; it does not call Pyodide at
   test time. The same fixture runs on every machine in CI.
2. **Always runs in CI** — it is not gated behind `pnpm test:property`. It runs in the
   standard `pnpm test` suite.
3. **No Pyodide in CI** — the SymPy values were computed once offline and are already in
   the JSON. CI does not fetch or initialise Pyodide. If you need to update the reference
   values, run `pnpm generate:fixtures` locally and commit the JSON.

### Filtering in development

```bash
pnpm test vector-sympy        # run only la.vector cross-engine tests
pnpm test -- --reporter=verbose  # see all test names including @cross-engine files
```

### When to add a new @cross-engine file

See `docs/BLOCK_AUTHORING_GUIDE.md` §7 for the full decision guide. Short version: add
one when the operation has a SymPy equivalent, inputs can be exact integers, and you
want a third-party reference beyond math.js.

---

## Precision rules

- `Fraction` and `BigNumber` (math.js) for `precision: "exact"` — always tested with exact equality.
- `number` (IEEE 754) for `precision: "approximate"` — tested with `Math.abs(a - b) < ε`. Default ε = 1e-9 for reals, 1e-12 for high-precision.
- Floating-point comparisons via a single helper `closeTo(a, b, eps)` in `tests/helpers.ts`. Never use `===` on floats in tests.
- Matrices: `matricesClose(A, B, eps)` element-wise.

When a block's output is approximate but its input was exact, the test must verify that the precision label correctly switches to `"approximate"`.

## Arbitraries

Source: `tests/arbitraries.ts`. Import directly — no re-export barrel.

```typescript
import { invertibleMatrix, orthogonalMatrix } from "../../tests/arbitraries";
```

### Type-system arbitraries (Phase 1)

These generate `MathType` values for `canConnect` and shape-unifier tests.

| Arbitrary | Type | Use when |
|---|---|---|
| `fieldArb` | `Field` | testing field subtyping / compatibility |
| `precisionArb` | `Precision` | testing precision propagation rules |
| `concreteDimArb` | `number` (1–8) | generating concrete matrix/vector dimensions |
| `shapeVarNameArb` | `string` | generating shape variable names (m, n, k, p, q) |
| `shapeArb` | `Shape` | generating mixed concrete/any/variable shapes |
| `scalarTypeArb` | `MathType (Scalar)` | canConnect tests on scalar kinds |
| `vectorTypeArb` | `MathType (Vector)` | canConnect tests on vector kinds |
| `matrixTypeArb` | `MathType (Matrix)` | canConnect tests on matrix kinds |
| `linearAlgebraTypeArb` | `MathType` | any of the three Phase-1 kinds |

### Matrix arbitraries (Phase 2)

#### `invertibleMatrix(n)`

```typescript
import { invertibleMatrix } from "../../tests/arbitraries";

test("property: A⁻¹ · A ≈ Iₙ", () => {
  fc.assert(
    fc.property(invertibleMatrix(3), (A) => {
      const invA = inv(A);
      const product = multiply(invA, A) as number[][];
      expect(matricesClose(product, identity(3), 1e-9)).toBe(true);
    }),
  );
});
```

Generates an n×n integer matrix guaranteed to be invertible (`det ≠ 0`). Uses rejection
sampling — accepts only when `Math.abs(det(m)) > 0.5`. Worst-case acceptance rate is ~91%
at n=4 with entries in [-5, 5]; expected overhead is negligible. Shrinks toward the
identity matrix. **Use when** the block or property requires an invertible input
(`la.inverse`, `la.det` non-zero, LU/QR decomposition tests).

#### `orthogonalMatrix(n)`

```typescript
import { orthogonalMatrix } from "../../tests/arbitraries";

test("property: Qᵀ · Q ≈ Iₙ", () => {
  fc.assert(
    fc.property(orthogonalMatrix(3), (Q) => {
      const Qt = transpose(Q) as number[][];
      const product = multiply(Qt, Q) as number[][];
      expect(matricesClose(product, identity(3), 1e-9)).toBe(true);
    }),
  );
});
```

Generates an n×n orthogonal matrix via Givens (plane) rotations applied to the identity.
Entries are floating-point; use tolerance-based equality (1e-9), never `===`. Shrinks
toward the identity (zero rotations). **Use when** the property requires `QᵀQ = I`
(`la.qr` output Q, orthogonal projections, condition-number tests).

### Planned arbitraries (not yet in source)

These are documented in `docs/TESTING.md` as forward-pointers; they land alongside the
blocks that need them.

- `positiveDefiniteMatrix(n)` — for `la.cholesky` (Phase 2 later).
- `diagonalMatrix(n)` — for `la.eigen` diagonal case tests.
- `distribution()` — for Phase 3 statistics blocks.
- `expression({ vars })` — for Phase 4 calculus blocks.

All arbitraries shrink toward "boring" cases (identity, small integers, zero) so that
fast-check counterexamples are minimal and human-readable.

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
