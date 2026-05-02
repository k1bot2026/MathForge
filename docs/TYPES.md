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
  | { ok: true; bindings?: Record<string, number> }
  | { ok: false; reason: string };

export function canConnect(out: MathType, into: MathType): ConnectResult {
  if (out.kind !== into.kind) {
    return { ok: false, reason: `Cannot connect ${out.kind} to ${into.kind}` };
  }
  switch (out.kind) {
    case "Scalar":
      return fieldCompatible(out.field, into.field as Field)
        ? { ok: true }
        : { ok: false, reason: `Field mismatch: ${out.field} → ${into.field}` };
    case "Vector":
      return shapeCompatible({ n: out.n }, { n: into.n });
    case "Matrix":
      return shapeCompatible({ m: out.m, n: out.n }, { m: into.m, n: into.n });
    // ...
  }
}
```

### Shape compatibility

A concrete shape (e.g. `n: 3`) is compatible with:
- the same concrete shape,
- `"any"` (wildcard),
- a shape variable (e.g. `{ var: "k" }`) — which **binds** `k = 3` for downstream resolution.

Two shape variables in the same connection unify: `{ var: "k" } ~ { var: "k" }` succeeds; `{ var: "k" } ~ { var: "m" }` succeeds and ties them.

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

## Validation at engine boundaries

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
