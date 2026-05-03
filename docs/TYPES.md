# Type System

The core invariant of MathForge: **every wire between blocks carries a `MathValue`, and connections are structurally type-checked at edit time.** This file specifies how.

## MathValue — discriminated union

```typescript
// src/math/types.ts

export type Field = "real" | "complex" | "rational" | "integer" | "boolean";

export type Precision = "exact" | "approximate";

export type Shape = number | "any" | { var: string }; // shape variable for polymorphism

export type MathType =
  | { kind: "Scalar"; field: Field; precision: Precision }
  | { kind: "Vector"; n: Shape; field: Field }
  | { kind: "Matrix"; m: Shape; n: Shape; field: Field }
  | { kind: "Function"; arity: number; domain: MathType; codomain: MathType }
  | { kind: "Expression"; freeVars: ReadonlyArray<string> }
  | { kind: "RandomVariable"; support: "discrete" | "continuous" | "mixed" }
  | { kind: "Distribution"; family: DistributionFamily }
  | { kind: "Set"; element: MathType }
  | { kind: "Tuple"; elements: ReadonlyArray<MathType> };

export type DistributionFamily =
  | "Normal" | "Bernoulli" | "Binomial" | "Poisson"
  | "Uniform" | "Exponential" | "Beta" | "Gamma"
  | "Categorical" | "Multinomial" | "Empirical"
  | { custom: string };

export type MathValue<T extends MathType = MathType> = {
  type: T;
  payload: Payload<T>;
  provenance: Provenance;
};

export type Provenance = {
  blockId: string;
  inputs: ReadonlyArray<string>; // upstream block ids
  computedAt: number;
  engine: "mathjs" | "sympy" | "native";
};
```

`Payload<T>` is conditionally typed per kind:

```typescript
type Payload<T extends MathType> =
  T extends { kind: "Scalar" } ? ScalarPayload :
  T extends { kind: "Vector" } ? ReadonlyArray<ScalarPayload> :
  T extends { kind: "Matrix" } ? ReadonlyArray<ReadonlyArray<ScalarPayload>> :
  T extends { kind: "Function" } ? FunctionPayload :
  T extends { kind: "Expression" } ? ExpressionPayload :
  T extends { kind: "RandomVariable" } ? RandomVariablePayload :
  T extends { kind: "Distribution" } ? DistributionPayload :
  unknown;
```

Use `mathjs.Fraction` or `mathjs.BigNumber` as the underlying representation for `precision: "exact"`. Use plain `number` only for explicitly approximate scalars.

## Connection rules — `canConnect`

```typescript
// src/editor/connections.ts

export type ConnectResult =
  | { ok: true; bindings?: Record<string, number>; warning?: string }
  | { ok: false; reason: string };

export function canConnect(out: MathType, into: MathType): ConnectResult
```

Called at edit time by React Flow's `<Handle isValidConnection={…}>` and at evaluator
time when resolving polymorphic output types against downstream input slots.

The function checks structural compatibility — `out.kind` must equal `into.kind` — then
delegates to a per-kind check:

- `Scalar`: field subtyping + precision check.
- `Vector`: field check + `unifyShape(out.n, into.n)`.
- `Matrix`: field check + `unifyShape(out.m, into.m)` + `unifyShape(out.n, into.n)`.
- `Function`: arity equality + contravariant domain check + covariant codomain check.
- `Tuple`: element-wise `canConnect`.
- `Set`: element `canConnect`.
- `Expression`, `RandomVariable`, `Distribution`: same-kind accepted (structural rules
  land alongside Phase 3 blocks).

### Shape unification — `unifyShape`

```typescript
// src/editor/connections.ts (exported)
export function unifyShape(out: Shape, into: Shape, dim: string): ConnectResult
```

Four cases:

| out      | into     | Result |
|---|---|---|
| concrete | concrete | `ok: true` if equal; rejected with `"${dim} mismatch: A ≠ B"` otherwise |
| concrete | `{ var }` | `ok: true, bindings: { [var]: concrete }` |
| `{ var }` | concrete | `ok: true, bindings: { [var]: concrete }` |
| `{ var }` | `{ var }` | `ok: true` (no bindings; cross-port unification is the block manifest's responsibility) |
| either   | `"any"`  | `ok: true` unconditionally (wildcard short-circuit) |

Bindings from multiple `unifyShape` calls within one `canConnect` are merged by `mergeOk`.
If two calls bind the same variable to different values the second wins — blocks should use
distinct variable names to avoid ambiguity (`m`, `k`, `n` for `matmul`; `m`, `n` for `matvec`).

### Shape compatibility (summary)

A concrete shape (e.g. `n: 3`) is compatible with:
- the same concrete shape,
- `"any"` (wildcard),
- a shape variable (e.g. `{ var: "k" }`) — which **binds** `k = 3` for downstream resolution.

Two shape variables in the same connection unify without binding (`{ var: "k" } ~ { var: "m" }`
succeeds; the block's polymorphic output function resolves them at evaluator time).

### Field compatibility (subtyping)

```
boolean ⊂ integer ⊂ rational ⊂ real ⊂ complex
```

A `Vector<3, real>` can flow into a `Vector<3, complex>` slot. The reverse fails unless the value is provably real (we don't introspect — declared type wins).

### Precision compatibility

`exact` flows into `exact` or `approximate`. `approximate` flowing into `exact` is **allowed but flagged** with a yellow warning on the node ("precision will be lost downstream").

## Polymorphic block outputs

Block manifests can declare output types as functions of resolved input shapes:

```typescript
const MatMul: BlockDefinition = {
  inputs: [
    { id: "A", type: { kind: "Matrix", m: { var: "m" }, n: { var: "k" }, field: "real" } },
    { id: "B", type: { kind: "Matrix", m: { var: "k" }, n: { var: "n" }, field: "real" } },
  ],
  outputs: [
    { id: "AB", type: ({ A, B }) => ({
        kind: "Matrix",
        m: A.type.m,
        n: B.type.n,
        field: "real",
      }),
    },
  ],
  // ...
};
```

When `A` is a concrete `Matrix<3, 4>` and `B` is a concrete `Matrix<4, 5>`, the unifier resolves `m=3, k=4, n=5` and the output is `Matrix<3, 5>`. If `B` is `Matrix<2, 5>`, the connection is rejected with `"Inner dimensions don't match: 4 vs 2"`.

## Shape polymorphism in Phase 2

Phase 2 replaces the fixed-size `la.vector2` / `la.matrix2x2` blocks with
`la.vector` (N-D) and `la.matrix` (m×n). All downstream operation blocks are
updated to carry shape variables so the unifier can enforce dimensional
consistency without hardcoding sizes.

### Vector block (`la.vector`)

The block is a **source**: no inputs, one output. Because the dimension is set
via the `dim` parameter rather than an upstream wire, the static output type
uses `"any"` as a wildcard:

```typescript
outputs: [
  { id: "v", type: { kind: "Vector", n: "any", field: "real" } }
]
```

`canConnect` allows `"any"` to flow into any `Vector<n>` slot, including
a concrete `Vector<3>` or a shape-variable `Vector<{ var: "n" }>`. The actual
runtime dimension is carried in the `MathValue` payload at evaluator time.

### Matrix-vector product (`la.matvec`)

```typescript
inputs: [
  { id: "A", type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" } },
  { id: "x", type: { kind: "Vector", n: { var: "n" }, field: "real" } },
]
outputs: [
  { id: "Ax", type: ({ A }) => ({ kind: "Vector", n: A.type.m, field: "real" }) }
]
```

When the user connects a `Vector<3>` to the `x` slot, `unifyShape` binds `n = 3`.
If `A` is already connected with shape `Matrix<4, 3>`, `n = 3` is consistent and
`m = 4` is also known — the output resolves to `Vector<4>`. If `A` is `Matrix<4, 2>`,
the connection to `x` is rejected: `"n mismatch: 3 ≠ 2"`.

### Matrix multiplication (`la.matmul`)

```typescript
inputs: [
  { id: "A", type: { kind: "Matrix", m: { var: "m" }, n: { var: "k" }, field: "real" } },
  { id: "B", type: { kind: "Matrix", m: { var: "k" }, n: { var: "n" }, field: "real" } },
]
outputs: [
  { id: "AB", type: ({ A, B }) => ({ kind: "Matrix", m: A.type.m, n: B.type.n, field: "real" }) }
]
```

The shared variable `k` ties the inner dimensions. Connecting `Matrix<3, 4>` to `A`
and `Matrix<2, 5>` to `B` fails with `"k mismatch: 4 ≠ 2"`.

### Transpose (`la.transpose`)

```typescript
inputs: [
  { id: "A", type: { kind: "Matrix", m: { var: "m" }, n: { var: "n" }, field: "real" } },
]
outputs: [
  { id: "At", type: ({ A }) => ({ kind: "Matrix", m: A.type.n, n: A.type.m, field: "real" }) }
]
```

Output swaps `m` and `n`. A `Matrix<3, 5>` input produces a `Matrix<5, 3>` output.

### Square-only blocks (`la.det`, `la.trace`, `la.inverse`, `la.lu`, `la.rank`, `la.rref`)

These operations require square or at least well-shaped inputs. The constraint is
enforced in `compute` rather than in the type system (the type system cannot express
`m = n` as a connection-time rule without a more expressive unifier). Non-square inputs
surface as an `EvalError` with a clear message: `"det requires a square matrix, got m×n"`.

`la.rref` and `la.rank` accept non-square inputs; they are not constrained.

### Multi-output blocks (`la.lu`, `la.qr`, `la.eigen`, `la.svd`)

`la.lu` is the first block to use the `Tuple` kind in production. No new `MathType`
variant was needed — `kind: "Tuple"` was already in the discriminated union. The
`canConnect` handler for `Tuple` performs element-wise checks.

```typescript
outputs: [
  {
    id: "LUP",
    type: {
      kind: "Tuple",
      elements: [
        { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },  // L
        { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },  // U
        { kind: "Matrix", m: { var: "n" }, n: { var: "n" }, field: "real" },  // P
      ],
    },
  },
],
```

The payload is a named struct (`LuPayload = { L, U, P }`) cast to `unknown` at the
`MathValue` boundary — the `Tuple` discriminator in `type` is the canonical signal.
See `docs/BLOCK_AUTHORING_GUIDE.md §3a` for the full multi-output convention.

### No new `MathType` variants in Phase 2 first-tier operations

`la.transpose`, `la.add`, `la.sub`, `la.trace`, `la.det`, `la.inverse`, `la.rref`,
`la.rank`, and `la.lu` all work within the existing `Matrix`, `Scalar`, and `Tuple`
variants. No ADR was required for Phase 2 operation blocks. The next likely addition
is a `kind: "Permutation"` variant for cleaner typing of `la.lu`'s `P` output in a
future cleanup, but that is deferred.

---

At every call into `compute(inputs, ctx)`, validate inputs with Zod (or hand-written guards):

```typescript
import { z } from "zod";

const matrixInput = z.object({
  type: z.object({ kind: z.literal("Matrix"), /* ... */ }),
  payload: z.array(z.array(scalarSchema)),
});
```

Inside the engine, types are trusted. At the boundary (between UI events, network, persisted state) they are revalidated.

## Serialization

`MathValue` serializes to JSON:
- `Fraction` and `BigNumber` round-trip via their string representations (`{ "$frac": "3/7" }`).
- Functions and Expressions serialize as MathJSON (the format used by MathLive's compute engine).
- Random variables serialize as `{ family, params }` for parametric distributions; empirical distributions serialize as samples (capped, see below).

Cap empirical distributions at 10⁴ samples in serialized form; full samples live in cache only.

## Distribution payload conventions (Phase 3)

Established by `stats.bernoulli` (`7fed327`). All Phase 3 distribution blocks follow this pattern.

### DistributionPayload

Defined in `src/blocks/statistics/distribution-payload.ts`:

```typescript
export type DistributionPayload = {
  parameters: DistributionParameters; // discriminated union: { family: "Bernoulli", p } | ...
  moments: DistributionMoments;       // mean, variance, skewness?, excessKurtosis?
  support:
    | { kind: "discrete"; values: ReadonlyArray<number> }
    | { kind: "continuous"; lo: number; hi: number };
};
```

`parameters` is a discriminated union keyed on `family`, matching `DistributionFamily` in `src/math/types.ts`. Downstream blocks pattern-match on `parameters.family` to extract family-specific params without casting.

### Moments strategy

- **Eager, closed-form.** All Phase 3 parametric families have O(1) moment formulas. Moments are computed at block `compute` time and stored in `payload.moments`. There is no lazy-evaluation cache for moments.
- **Degenerate cases.** `skewness` and `excessKurtosis` are `undefined` when the distribution is degenerate (e.g. `Bernoulli(0)` or `Bernoulli(1)` where variance = 0).
- **SymPy escalation.** Reserved for `stats.mgf` (moment-generating function, returns `Expression`) and `stats.posterior` (conjugate prior update). Standard moments never escalate to SymPy.

### Payload cast

Because `MathValue.payload` is typed as `number` (the common case), distribution blocks cast:

```typescript
payload: payload as unknown as number
```

The `kind: "Distribution"` discriminator in `MathValue.type` is the canonical signal to consumers. Downstream blocks cast back via `output.payload as unknown as DistributionPayload`.

### canConnect rules for Distribution

`canConnect` in `src/editor/connections.ts` currently accepts any same-kind `Distribution` connection (`ok: true` via the default case). Structural family-level rules — e.g. rejecting `Distribution(Normal)` into a slot typed `Distribution(Bernoulli)` — will be added when the first operation block that requires a specific family lands.

Current behavior (Phase 3, first blocks):
- `Distribution(Bernoulli)` → `Distribution(Bernoulli)` slot: accepted.
- `Distribution(Normal)` → `Distribution(Bernoulli)` slot: accepted (family not yet enforced).
- `Distribution(any)` → `Distribution(Bernoulli)` slot: accepted.

Family-polymorphic slots (e.g. `stats.sample` accepts any distribution) will use `family: DistributionFamily` as the static type, which matches any connected distribution. Family-specific slots may narrow to a concrete member once the structural rule is added.

### Distribution vs RandomVariable

| | `Distribution` | `RandomVariable` |
|---|---|---|
| What it is | A parametric description of a probability law | A concrete sample draw or composite |
| Payload | `DistributionPayload` (params + moments + support) | `RandomVariablePayload` (samples array, summary stats) |
| Source | `stats.bernoulli`, `stats.normal`, etc. — no inputs | `stats.sample` — input is a `Distribution` |
| Connects to | `stats.expect`, `stats.var`, `stats.mgf`, `stats.posterior`, `viz.pdf-cdf` | `viz.histogram`, downstream `stats.cov`/`stats.cor` |

`RandomVariable` is the result of sampling a `Distribution`; `Distribution` is an abstract object you can reason about symbolically.

## Notes on extensibility

- Add a new `MathType` kind only via ADR — it cascades to `canConnect`, payloads, serialization, validation, and visualizers.
- Add a `DistributionFamily` member without ADR (it's a lookup table extension).
- Add a new `Field` member only via ADR (subtyping order is global).

## Testing the type system

`src/editor/connections.test.ts` must contain property-based tests:
- Symmetry of unification: `unify(a, b) ↔ unify(b, a)`.
- Idempotence: `unify(a, a) === a`.
- Subtyping: `connect(Scalar real, Scalar complex)` always ok.
- Anti-symmetry: `connect(Scalar complex, Scalar real)` always rejected.
- Shape variables: random matrix dimensions, ensure unifier resolves correctly.

Use `fast-check` arbitraries for `MathType` (define them in `tests/arbitraries.ts`).
