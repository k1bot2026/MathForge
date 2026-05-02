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

1. Generate random inputs via `fast-check` arbitraries.
2. Compute with our engine (math.js by default).
3. Compute with SymPy in Pyodide.
4. Assert exact equality on rationals / integers; assert close-to-ε on reals.

These tests are tagged `@cross-engine` and run in `pnpm test:property`. They are slower; full suite runs nightly and on PRs that touch any `src/blocks/**` or `src/math/**`.

For each domain, write an adapter `tests/sympy-reference.ts` that wraps Pyodide calls behind a typed function (e.g. `sympy.matmul(A, B): Promise<ExactMatrix>`).

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
