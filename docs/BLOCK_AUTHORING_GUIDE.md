# Block Authoring Guide

How to add a new operation block to MathForge. The worked example is `la.transpose`
(committed in `ed24132`), which covers every mandatory piece.

Before starting, read `docs/BLOCK_TAXONOMY.md` to confirm your block's id, category, and
colour token. Read `docs/TYPES.md` to verify the input/output shapes are expressible.
Write the property tests first — `docs/TESTING.md` explains why.

---

## 1. Directory layout

One folder per block, named after the kebab portion of the block id:

```
src/blocks/linear-algebra/transpose/
├── compute.ts          # pure math function, separately importable
├── definition.ts       # BlockDefinition manifest
├── transpose.test.ts   # property-based tests against math.js
├── transpose.stories.tsx
└── transpose-sympy.test.ts   # optional: cross-engine test (see §6)
```

`compute.ts` is always a separate module so tests can import the math without
instantiating a full `BlockDefinition`. No barrel exports.

---

## 2. `compute.ts` — the math

Keep it focused: one exported function, one exported error class.

```typescript
// src/blocks/linear-algebra/transpose/compute.ts
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

export class TransposeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransposeError";
  }
}

export function computeTranspose(inputs: ResolvedInputs): MathValue {
  const A = inputs.A;
  if (A === undefined) {
    throw new TransposeError("transpose requires input A");
  }
  const rows = A.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m = rows.length;
  const n = rows[0]?.length ?? 0;
  const result: number[][] = Array.from({ length: n }, (_, j) =>
    Array.from({ length: m }, (_, i) => {
      const v = rows[i]?.[j] ?? 0;
      return v === 0 ? 0 : v; // collapse -0 → +0
    }),
  );
  return {
    type: { kind: "Matrix", m: n, n: m, field: "real" },
    payload: result,
    provenance: {
      blockId: "la.transpose",
      inputs: [A.provenance.blockId],
      computedAt: Date.now(),
      engine: "native",
    },
  };
}
```

Rules:
- The function takes `ResolvedInputs` and returns `MathValue`. Never take React state or Zustand.
- Use a typed error class so callers can `instanceof`-guard it.
- Normalise `-0 → +0` — IEEE 754 distinguishes them but SymPy does not, so equality checks fail.
- Set `provenance.engine` to `"native"` for pure TypeScript, `"mathjs"` when you delegate to math.js, `"sympy"` when you go through the Pyodide worker.

---

## 3. `definition.ts` — the manifest

```typescript
// src/blocks/linear-algebra/transpose/definition.ts
import type { BlockDefinition } from "~/blocks/types";
import type { MathType } from "~/math/types";
import { computeTranspose } from "./compute";

export const TransposeBlock: BlockDefinition = {
  id: "la.transpose",       // stable; never rename after shipping
  label: "Transpose",
  symbol: "Aᵀ",             // shown in compact view
  category: "operation",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",

  inputs: [
    {
      id: "A",
      label: "A",
      // Shape variables m and n are resolved when a matrix is connected.
      type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" },
    },
  ],

  outputs: [
    {
      id: "At",
      label: "Aᵀ",
      // Polymorphic output: m and n swap.
      type: (inputTypes): MathType => {
        const A = inputTypes.A;
        if (A !== undefined && A.kind === "Matrix") {
          return { kind: "Matrix", m: A.n, n: A.m, field: "real" };
        }
        // Fallback when no input is connected yet.
        return { kind: "Matrix", m: "any", n: "any", field: "real" };
      },
    },
  ],

  compute: (inputs) => computeTranspose(inputs),

  explain: {
    // One sentence per field. what = definition, why = intuition.
    what: "Transposes a matrix A, swapping its rows and columns to produce Aᵀ.",
    why: "Transposition converts row vectors to column vectors and vice versa — a fundamental operation underlying dot products, symmetric matrices, and the adjoint.",
    effect: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Output is ${String(t.m)}×${String(t.n)}.`;
    },
    impact: (_inputs, output) => {
      const t = output.type as { m: number; n: number };
      return `Downstream blocks see a ${String(t.m)}×${String(t.n)} matrix — rows and columns are swapped from the input.`;
    },
  },
};
```

Key points:
- `id` uses the `<domain>.<kebab>` convention and must never change after any graph serialises it (`schemaVersion` migration required if it ever does).
- The `type` function on an output port receives resolved input types; return `"any"` as a fallback for unconnected state.
- `explain.what` and `explain.why` are single sentences. No exclamation marks.
- `engine: "native"` means the block never calls math.js or SymPy; it's plain TypeScript arithmetic.

### Shape variables

Inputs use `{ var: "m" }` / `{ var: "n" }` to declare that dimensions are polymorphic.
The `canConnect` unifier in `src/editor/connections.ts` resolves these at connect time
and populates `bindings`. The output `type` function receives the resolved `inputTypes`
and uses them to compute the output shape. See `docs/TYPES.md` "Shape polymorphism in
Phase 2" for the full rule table.

For blocks that require equal input shapes (e.g. `la.add`), use the same variable name
on both inputs:

```typescript
inputs: [
  { id: "A", type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" } },
  { id: "B", type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" } },
]
```

The unifier will reject a connection if the two inputs carry different concrete dimensions.

---

## 3a. Multi-output blocks (Tuple convention)

Some blocks produce multiple matrices — `la.lu` outputs L, U, and P; `la.qr` will output Q and R; `la.eigen` will output eigenvalues and eigenvectors. The evaluator supports exactly one `MathValue` per output port, so multiple results are packed into a single `Tuple` output.

### The pattern

**In `compute.ts`:** define a named payload type and return it inside a `MathValue` with `kind: "Tuple"`.

```typescript
// src/blocks/linear-algebra/lu/compute.ts

export type LuPayload = {
  L: number[][];
  U: number[][];
  P: number[][];
};

export function computeLu(inputs: ResolvedInputs): MathValue {
  // ... compute L, U, P ...
  const payload: LuPayload = { L: Larr, U: Uarr, P };

  return {
    type: {
      kind: "Tuple",
      elements: [
        { kind: "Matrix", m: n, n: n, field: "real" },  // L
        { kind: "Matrix", m: n, n: n, field: "real" },  // U
        { kind: "Matrix", m: n, n: n, field: "real" },  // P
      ],
    },
    payload: payload as unknown as number[][],   // cast: Tuple payloads are opaque to the type system
    provenance: { ... },
  };
}
```

**In `definition.ts`:** declare one output port with `kind: "Tuple"` in the type. The `elements` array documents the shape of each sub-result.

```typescript
outputs: [
  {
    id: "LUP",
    label: "L, U, P",
    type: {
      kind: "Tuple",
      elements: [
        { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
        { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
        { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },
      ],
    },
  },
],
```

### Rules

- **One output port.** Do not add separate `L`, `U`, `P` output handles to the block. This would require evaluator changes to fan out results into separate wires; the Tuple approach works today.
- **Named payload struct.** Export the payload type (`LuPayload`, `QrPayload`, etc.) from `compute.ts`. Tests and downstream extraction blocks import it directly.
- **Cast the payload.** `payload: payload as unknown as number[][]` is intentional — `MathValue.payload` is typed as `number[][]` for the common case; Tuple payloads are opaque to the static type. The `kind: "Tuple"` discriminator in `type` is the canonical signal to consumers.
- **Document in `explain.effect`.** Because the output is not a plain matrix, the effect description must tell the user how to access the sub-results: `"Output is a structured {L, U, P} tuple. Access sub-matrices from downstream extraction blocks."`.
- **Test each component.** In `*.test.ts`, cast the payload back to the named type and assert on each of L, U, and P individually:

```typescript
const result = computeLu({ A: mvalue(A) });
const { L, U, P } = result.payload as unknown as LuPayload;
// assert P·A ≈ L·U, L lower-triangular, U upper-triangular
```

### Consistent naming across multi-output blocks

| Block | Output port id | Payload type | Elements |
|---|---|---|---|
| `la.lu` | `LUP` | `LuPayload` | `L`, `U`, `P` |
| `la.qr` | `QR` | `QrPayload` | `Q`, `R` |
| `la.eigen` | `eigen` | `EigenPayload` | `values` (Vector), `vectors` (Matrix) |
| `la.svd` | `SVD` | `SvdPayload` | `U`, `S`, `Vt` |

---

## 4. `*.test.ts` — property-based tests

Three test layers in one file, in order of increasing confidence:

```typescript
// src/blocks/linear-algebra/transpose/transpose.test.ts
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import type { MathValue } from "~/math/types";
import { computeTranspose, TransposeError } from "./compute";

// ── helpers ──────────────────────────────────────────────────────────────────

const REAL_MATRIX = (m: number, n: number) =>
  ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const intMatrix = (m: number, n: number) =>
  fc.array(
    fc.array(fc.integer({ min: -10, max: 10 }), { minLength: n, maxLength: n }),
    { minLength: m, maxLength: m },
  );

// ── unit tests ────────────────────────────────────────────────────────────────
// Cover concrete, obvious cases first — good debugging anchors.

describe("la.transpose compute", () => {
  test("2×2 transpose: [[1,2],[3,4]] → [[1,3],[2,4]]", () => { /* ... */ });
  test("2×3 → 3×2: rows become columns", () => { /* ... */ });
  test("rejects missing input", () => {
    expect(() => computeTranspose({})).toThrow(TransposeError);
  });

  // ── property tests ──────────────────────────────────────────────────────
  // Cover mathematical invariants that must hold for any valid input.

  test("property: involution — (Aᵀ)ᵀ === A for any m×n matrix", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 5 })
          .chain((m) => fc.integer({ min: 1, max: 5 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const At = computeTranspose({ A: mvalue(A) });
          const Att = computeTranspose({ A: At });
          expect(Att.payload).toEqual(A);
        },
      ),
    );
  });

  test("property: output shape is n×m when input is m×n", () => { /* ... */ });

  test("property: (A·B)ᵀ === Bᵀ·Aᵀ (reversal under transposition)", () => {
    // Compose with matmul to verify cross-block identities.
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 })
          .chain((m) =>
            fc.integer({ min: 1, max: 4 })
              .chain((k) =>
                fc.integer({ min: 1, max: 4 })
                  .chain((n) => fc.tuple(intMatrix(m, k), intMatrix(k, n))),
              ),
          ),
        ([A, B]) => {
          const AB = computeMatMul({ A: mvalue(A), B: mvalue(B) });
          const ABt = computeTranspose({ A: AB });
          const Bt = computeTranspose({ A: mvalue(B) });
          const At = computeTranspose({ A: mvalue(A) });
          const BtAt = computeMatMul({ A: Bt, B: At });
          expect(ABt.payload).toEqual(BtAt.payload);
        },
      ),
      { numRuns: 50 },
    );
  });
});
```

Rules:
- Unit tests come first — they are fast and pinpoint exact bugs.
- Every `fc.property` test has a descriptive name starting with `"property: "`.
- Shrink toward small dimensions: `min: 1, max: 5` for shape arbitraries.
- Use `{ numRuns: 50 }` for expensive cross-block tests; default 100 for cheap operations.
- Use `intMatrix` (integer entries, range [-10, 10]) so results are exact and deterministic.
- Use `mvalue()` to wrap a raw 2-D array into a `MathValue` for test input.
- Test the error path — `computeTranspose({})` should throw your typed error class, not a runtime crash.

### Properties to test, by kind

| Operation | Required properties |
|---|---|
| Involution (Aᵀ, A⁻¹ of involutions) | `f(f(x)) = x` |
| Linear map | `f(aA + bB) = af(A) + bf(B)` |
| Endomorphism | identity element, `f ∘ f⁻¹ = id` |
| Composition | `(f ∘ g)(x) = f(g(x))` |
| Determinant | `det(A·B) = det(A)·det(B)`, `det(I) = 1`, `det(Aᵀ) = det(A)` |
| Addition | associativity, commutativity, identity (zero), inverse (negation) |

---

## 5. `*.stories.tsx` — Storybook

Every block needs at least two stories: one "happy path" and one variant that shows
a different shape or state. Use `makeStubProps`, `ResultPrimer`, and `StoryFrame`
from `~/editor/nodes/block-node-story-utils`.

```tsx
// src/blocks/linear-algebra/transpose/transpose.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlockNode } from "~/editor/nodes/block-node";
import {
  makeStubProps,
  provenance,
  ResultPrimer,
  StoryFrame,
} from "~/editor/nodes/block-node-story-utils";

const meta: Meta<typeof BlockNode> = {
  title: "Blocks/linear-algebra/Transpose",
  component: BlockNode,
  decorators: [(Story) => <StoryFrame>{Story()}</StoryFrame>],
};
export default meta;
type Story = StoryObj<typeof meta>;

// Story 1: square matrix — the obvious happy path.
export const Square2x2: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[{
          id: (args as { id: string }).id,
          result: {
            kind: "value",
            value: {
              type: { kind: "Matrix", m: 2, n: 2, field: "real" },
              payload: [[1, 3], [2, 4]],
              provenance: provenance("la.transpose"),
            },
          },
        }]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("transpose-story-2x2", "la.transpose", {}),
};

// Story 2: non-square — shows shape polymorphism in action.
export const Rect2x3: Story = {
  render: (args) => (
    <>
      <ResultPrimer
        results={[{
          id: (args as { id: string }).id,
          result: {
            kind: "value",
            value: {
              type: { kind: "Matrix", m: 3, n: 2, field: "real" },
              payload: [[1, 4], [2, 5], [3, 6]],
              provenance: provenance("la.transpose"),
            },
          },
        }]}
      />
      <BlockNode {...args} />
    </>
  ),
  args: makeStubProps("transpose-story-2x3", "la.transpose", {}),
};
```

- `ResultPrimer` seeds the Zustand eval-result store so the block node renders with a value instead of "pending".
- `makeStubProps(id, blockId, params)` wires up the React Flow node props.
- Title pattern: `"Blocks/<domain>/<Label>"`.
- Do not snapshot canvas content that includes randomness — use fixed payloads.

---

## 6. Registration in `index.ts`

Open `src/blocks/linear-algebra/index.ts` and add an import + a `registry.register()` call:

```typescript
import { TransposeBlock } from "./transpose/definition";

export function register(registry: BlockRegistry): void {
  // existing registrations...
  registry.register(TransposeBlock);
}
```

Order within `register` determines nothing functional; keep it logical (sources first,
operations second, visualizers last).

---

## 7. When to add a `*-sympy.test.ts` cross-engine test

Add a cross-engine test whenever:
- The operation has a closed-form SymPy equivalent (`sympy.Matrix.T`, `det`, `trace`, etc.).
- The inputs can be expressed as integer matrices (so SymPy gives exact results).
- You want a third-party reference beyond math.js.

For `la.transpose`, the involution and reversal properties already provide strong
coverage via math.js, and the `la-matrix.json` fixture already includes `At` values
for all square and non-square cases. A separate `transpose-sympy.test.ts` is optional
but is useful if you need a fixture for non-square rectangular transposes outside those
covered by `la-matrix.json`.

When you do add one:
1. Add a generator function to `scripts/generate-sympy-fixtures.mjs`.
2. Add types + `loadXxxFixture()` to `tests/sympy-reference.ts`.
3. Run `pnpm generate:fixtures` and commit the JSON.
4. Write the test following the pattern in `docs/TESTING.md` "Property testing pattern".

Tag the test file with `@cross-engine` in a leading JSDoc comment.

---

## 8. Checklist before TASK DONE

- [ ] `src/blocks/<domain>/<name>/compute.ts` — exported function + typed error class.
- [ ] `src/blocks/<domain>/<name>/definition.ts` — `BlockDefinition` manifest, named export.
- [ ] `src/blocks/<domain>/<name>/<name>.test.ts` — unit tests + at least two `fc.property` tests.
- [ ] `src/blocks/<domain>/<name>/<name>.stories.tsx` — at least two stories.
- [ ] `src/blocks/<domain>/index.ts` — `registry.register(YourBlock)` added.
- [ ] `docs/ROADMAP.md` — checkbox ticked for the new block.
- [ ] `docs/BLOCK_TAXONOMY.md` — status updated.
- [ ] `pnpm format && pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass.
- [ ] Commit is atomic (one block = one commit).
- [ ] `git push origin main`.
