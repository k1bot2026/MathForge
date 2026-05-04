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

Some blocks produce multiple matrices — `la.lu` outputs L, U, and P; `la.qr` outputs Q and R; `la.eigen` outputs eigenvalues and eigenvectors. The evaluator supports exactly one `MathValue` per output port, so multiple results are packed into a single `Tuple` output.

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
| `la.eigen` | `eigenpairs` | `EigenPayload` | `eigenvalues` (number[]), `eigenvectors` (number[][], columns) |
| `la.svd` | `SVD` | `SvdPayload` | `U`, `S`, `Vt` |

`la.qr` (`f654d61`) confirms the convention: `QrPayload = { Q, R }`, single `QR` output port, `Tuple` type with elements `Matrix<m,m>` (Q) and `Matrix<m,n>` (R), opaque cast `as unknown as number[][]`. See `src/blocks/linear-algebra/qr/definition.ts` and `qr/compute.ts`.

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

## 7a. SymPy-engine blocks — additional conventions

When a block delegates its computation to SymPy via the Pyodide worker, the pattern
differs from the `la.transpose` (native) and `la.det` (math.js) examples above.
`calc.derivative` (`cc3542d`) is the canonical reference.

### What changes vs native blocks

| Aspect | Native / math.js block | SymPy-engine block |
|---|---|---|
| `engine` field | `"native"` or `"mathjs"` | `"sympy"` |
| `stability` field | `"stable"` is appropriate | Start at `"beta"` (Pyodide loads async; edge cases exist) |
| `compute` signature | synchronous `(inputs, params): MathValue` | async `(inputs, params): Promise<MathValue>` |
| Input payload | `number[][]` or numeric | `FunctionPayload` (expression + variables) |
| Output payload | numeric | `FunctionPayload` or `ExpressionPayload` |
| RPC call | — | `pyClient.<rpc>(args)` from `~/engine/workers/pyodide.client` |
| Error class | `class XError extends Error` | same pattern, but catch RPC throw and re-throw as typed error |

### `compute.ts` for a SymPy block

```typescript
// src/blocks/calculus/derivative/compute.ts
import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import * as pyClient from "~/engine/workers/pyodide.client";
import type { FunctionPayload, MathValue } from "~/math/types";

export class DerivativeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DerivativeError";
  }
}

export async function computeDerivative(
  inputs: ResolvedInputs,
  params: ResolvedParams,
): Promise<MathValue> {
  const fn = inputs.fn;
  if (fn === undefined) {
    throw new DerivativeError("calc.derivative requires a function input");
  }
  if (fn.type.kind !== "Function") {
    throw new DerivativeError(
      `calc.derivative requires a Function input, got ${fn.type.kind}`,
    );
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const diffVar =
    typeof params.variable === "string" && params.variable.trim()
      ? params.variable.trim()
      : (fnPayload.variables[0] ?? "x");

  let resultExpr: string;
  try {
    resultExpr = await pyClient.diff(
      fnPayload.expression,
      fnPayload.variables as string[],
      diffVar,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new DerivativeError(`SymPy diff failed: ${msg}`);
  }

  const outputPayload: FunctionPayload = {
    expression: resultExpr,
    variables: fnPayload.variables,
  };

  return {
    type: fn.type,
    payload: outputPayload as unknown as number,
    provenance: {
      blockId: "calc.derivative",
      inputs: ["fn"],
      computedAt: Date.now(),
      engine: "sympy",
    },
  };
}
```

Key points:
- `compute` is `async`. The evaluator awaits it — the DAG evaluator handles the Promise.
- Cast `fn.payload as unknown as FunctionPayload` to extract the expression and variables. The `MathValue.payload` field is typed as `number` at the boundary; the `kind: "Function"` discriminator in `fn.type` is the signal.
- Call the RPC in a `try/catch` and re-throw as the block's typed error class. Never let raw Pyodide/Comlink errors propagate to callers.
- Preserve `fnPayload.variables` in the output payload — downstream blocks need the full variable list.
- Set `provenance.engine: "sympy"`.

### `definition.ts` for a SymPy block

```typescript
// src/blocks/calculus/derivative/definition.ts
export const DerivativeBlock: BlockDefinition = {
  id: "calc.derivative",
  label: "Derivative",
  symbol: "d/dx",
  category: "operation",
  domain: "calculus",
  determinism: "pure",
  stability: "beta",          // ← always start beta for SymPy blocks
  engine: "sympy",             // ← declares the Pyodide dependency
  color: "function",           // ← "function" color for calc blocks

  inputs: [
    {
      id: "fn",
      label: "f(x)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],

  outputs: [
    {
      id: "fn",          // ← reuse the port id "fn" for function passthrough chains
      label: "f'(x)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],

  params: {
    variable: {
      kind: "string",
      default: "",
      label: "Variable (blank = infer from input)",
    },
  },

  compute: (inputs, params) => computeDerivative(inputs, params),

  explain: {
    what: "Computes the symbolic derivative df/dx via SymPy diff().",
    why: "Symbolic differentiation yields exact closed-form derivatives rather than finite-difference approximations.",
    effect: (_inputs, output) => {
      const payload = output.payload as unknown as FunctionPayload;
      const v = payload.variables[0] ?? "x";
      return `f'(${v}) = ${payload.expression}`;
    },
  },
};
```

Note the `effect` callback casts `output.payload as unknown as FunctionPayload` to access the expression string for the inspector display. This is the canonical pattern for all calc blocks.

### Which Pyodide RPC to call

Check `src/engine/workers/pyodide.client.ts` for the available RPCs. Do not add a new RPC until you have confirmed SymPy supports the operation and the worker is already loaded (the worker lazily loads SymPy on first call). If you need a new RPC:
1. Add the handler in `src/engine/workers/pyodide.worker.ts`.
2. Add the typed wrapper in `src/engine/workers/pyodide.client.ts`.
3. Add error-path coverage in `pyodide.client.test.ts`.

Current RPCs available (as of `a569a71`): `sympify`, `diff`, `integrate`, `definiteIntegrate`, `limit`, `taylor`, `series`, `dsolve`.

---

## 7b. Composite blocks (`core.subgraph`)

> **When to read this section:** You want to package a sub-graph of existing blocks into a
> single reusable block that appears in the palette with its own typed ports.
>
> **Prerequisites:** Read ADR 0004 (`docs/adr/0004-composite-blocks-via-subgraph.md`) for the
> design rationale. This section is the practitioner how-to that ADR 0004 deliberately omits.

### Concepts in one paragraph

A composite block is a `BlockDefinition` whose `compute()` runs a **sub-evaluator** — a
second call to `evaluate()` on an inner `GraphSpec`. Two special `stability: "internal"` blocks
act as the port surface:

- `core.input-proxy` — one per input port on the composite. Each instance has a `portId`
  param that names the outer input port it represents. The sub-evaluator sees its output as
  the value arriving from the outer graph.
- `core.output-proxy` — one per output port on the composite. Each instance reads its input
  from the inner graph and the outer `compute()` reads its resolved value to populate the
  composite's output.

Proxy nodes are hidden from the user-facing palette (`stability: "internal"` is filtered out).
They are ordinary registered blocks — the evaluator has no knowledge of their special role.

### Step 1 — Design the inner graph

Draw (or programmatically construct) a `GraphSpec` as you would any MathForge graph, with
these additions:

1. Add one `core.input-proxy` node per input you want to expose. Set its `portId` param to
   the name of the outer input port (e.g., `"fn"`, `"x"`).
2. Add one `core.output-proxy` node per output you want to expose. Wire its single `value`
   input to whatever inner node produces the result. Set its `portId` param to the name of
   the outer output port (e.g., `"result"`).
3. Everything else is a normal inner block — connect them as you would any graph.

Example inner graph with one input and one output:

```ts
import type { GraphSpec } from "~/engine/graph-spec";

const innerGraph: GraphSpec = {
  nodes: [
    // outer fn → inner computation
    { id: "ip-fn",     blockId: "core.input-proxy",  params: { portId: "fn" } },
    { id: "double",    blockId: "calc.derivative",    params: { variable: "x" } },
    { id: "op-result", blockId: "core.output-proxy",  params: { portId: "result" } },
  ],
  edges: [
    { id: "e1", source: "ip-fn",  sourcePort: "value",  target: "double",    targetPort: "fn"    },
    { id: "e2", source: "double", sourcePort: "fn",     target: "op-result", targetPort: "value" },
  ],
};
```

### Step 2 — Build the `SubgraphDefinition`

Call `buildSubgraphDefinition()` from `src/blocks/common/subgraph/definition.ts`. It returns
a fully-formed `BlockDefinition` whose ports, `compute()`, and `explain` are derived from the
inner graph structure you provide.

```ts
import { buildSubgraphDefinition } from "~/blocks/common/subgraph/definition";

export const MyCompositeBlock = buildSubgraphDefinition({
  id: "user.my-composite",        // must not clash with any built-in id
  label: "My Composite",
  category: "operation",
  domain: "common",
  color: "function",
  inputs: [
    { id: "fn", label: "f(x)", type: { kind: "Function", arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" } } },
  ],
  outputs: [
    { id: "result", label: "result", type: { kind: "Function", arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" } } },
  ],
  subgraph: {
    inner: innerGraph,
    inputProxies:  [{ proxyNodeId: "ip-fn",     portId: "fn"     }],
    outputProxies: [{ proxyNodeId: "op-result",  portId: "result" }],
  },
});
```

`buildSubgraphDefinition()` injects a `compute()` that:

1. Seeds each input-proxy node's result using the outer `inputs` record.
2. Calls `evaluate()` on the inner graph with `depth + 1`.
3. Reads each output-proxy node's resolved value and maps it to the named output port.

You declare `inputs` / `outputs` explicitly — the factory does not infer port types from
the inner graph, because the inner graph may contain shape variables that only resolve at
connection time. Keep port types here consistent with what the inner proxy nodes expect.

### Step 3 — Register with `registerOrReplace()`

Use `BlockRegistry.registerOrReplace()` — **not** `register()`. The existing `register()`
throws on duplicate IDs; `registerOrReplace()` is the upsert path reserved for user-defined
composites. Built-in block IDs are protected — attempting to overwrite them throws.

```ts
import { blockRegistry } from "~/blocks/registry";
blockRegistry.registerOrReplace(MyCompositeBlock);
```

When a user edits and re-saves a composite, call `registerOrReplace()` again with the updated
`SubgraphDefinition`. A `console.warn` is emitted on replacement so that unexpected
re-registrations are visible in the browser console.

### Step 4 — Output port multiplicity

Multi-output composites expose **multiple named output ports** on `def.outputs` — one entry
per `core.output-proxy` node in the inner graph. Do **not** return a `Tuple` MathValue.
Tuple is a legacy pattern tolerated in `la.lu` / `la.qr` / `la.svd`; it is not expanded here.
Named ports let the user wire each output directly without a downstream `core.unpack`.

### Nesting composites

A composite's inner graph may itself contain `core.subgraph` nodes (other composites). The
sub-evaluator passes `depth + 1` down the call stack. At depth > 8 `compute()` throws
`SubgraphError("Max subgraph nesting depth exceeded")`. Design your composites so that
typical usage stays well within this limit. If you genuinely need deeper nesting, raise the
issue with the team — `MAX_SUBGRAPH_DEPTH` can be increased, but the default is intentionally
conservative.

### Error handling

`buildSubgraphDefinition()` generates a `compute()` that wraps sub-evaluator errors in a
`SubgraphError`. Surface these to the user via the block's inspector the same way any other
block error is displayed — no special casing required.

```ts
// SubgraphError is exported from the same module:
import { buildSubgraphDefinition, SubgraphError } from "~/blocks/common/subgraph/definition";
```

### Checklist for composite blocks

- [ ] Inner graph has exactly one `core.input-proxy` per intended input port and one
      `core.output-proxy` per intended output port.
- [ ] `portId` params on proxy nodes match the corresponding `id` values in `inputs` / `outputs`.
- [ ] All inner edges are connected (no dangling input proxy → no missing input at eval time).
- [ ] `registerOrReplace()` is used, not `register()`.
- [ ] Output ports are named, not a single `Tuple` port.
- [ ] Nesting depth tested: adding a second layer of composites does not exceed 8.
- [ ] `SubgraphError` is caught and displayed correctly in the block inspector.

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

---

## 9. Phase 5 exit criterion: save, share, and reuse a composite block

This walkthrough verifies the full composite block lifecycle end-to-end.

### Prerequisites

- App running locally (`pnpm dev`).
- At least two built-in blocks that can be wired together (e.g. `la.vector` → `la.matvec`).

### Step 1 — Build an inner graph

On the canvas, create a small graph of blocks representing the inner logic you want to encapsulate:

1. Add source blocks (e.g. `la.vector`).
2. Add an operation block (e.g. `la.matvec`).
3. Connect them and verify the result appears in the inspector.

### Step 2 — Wrap it as a subgraph (programmatic, Phase 5)

In `src/blocks/index.ts` or a one-off script, call `buildSubgraphDefinition()` with the
`SubgraphPayload` matching your inner graph, and register it with `registerOrReplace()`.
A UI affordance for this step is planned for Phase 6.

### Step 3 — Save as block via the inspector

1. Select a node whose block definition is a `SubgraphDefinition` (has an embedded `.subgraph` payload).
2. The inspector shows a **Save as block** section at the bottom.
3. Edit the name field if desired (default is the block label).
4. Click **save**. The button briefly shows "saved" on success.
5. The record is now in IndexedDB under `mathforge:user-blocks`.

### Step 4 — Reload the page

Reload the browser tab. On mount, `EditorCanvas` calls `hydrateUserBlocksIntoRegistry(blockRegistry)`,
which reads all `mathforge:user-blocks` entries and calls `registerOrReplace()` for each.
Your saved block is now registered in the same registry as built-in blocks.

### Step 5 — Drag the saved block into a fresh graph

The block is now available in the registry. It can be instantiated programmatically:

```ts
import { blockRegistry } from "~/blocks";
const def = blockRegistry.get("user.my-chain");
// def is a SubgraphDefinition — it has .subgraph with the inner graph
```

A palette UI for user blocks is planned for Phase 6. For now, blocks saved via the
inspector can be loaded from the registry and wired into graphs via code or
`useGraphStore.addNode()`.

### Step 6 — Share via URL (v3 schema)

When a graph containing a user-block node is encoded via `encodeGraph()`, the
`SerializedNode.data.subgraph` field carries the full `SubgraphPayload` inline.
The recipient decodes the URL, gets the subgraph data, calls `buildSubgraphDefinition()`
and `registerOrReplace()` to reconstitute the block, and the graph evaluates normally.

`decodeGraph()` handles v1/v2 payloads automatically (v1→v2→v3 migration chain).

### Acceptance criteria

| Check | Expected result |
|---|---|
| Block saved in Step 3 | `loadUserBlocks()` returns a record with the correct `id` and `label` |
| After reload (Step 4) | `blockRegistry.has("user.my-chain")` is `true` |
| Block evaluates | Node produces a `MathValue` of the expected type |
| URL round-trip | `decodeGraph(encodeGraph(nodes, []))` preserves the `.subgraph` field |
