# Block Taxonomy

This document is the **single source of truth** for what a "block" is in MathForge, how blocks are categorized, named, coloured, and added.

## Conceptual model

A block is a **pure(ish) function** with typed inputs, typed outputs, and an explanation. Blocks compose into a DAG. The system imposes:

- one declarative manifest per block,
- one folder per block (manifest + tests + Storybook + visualizer if any),
- type-checking at edges,
- reactive evaluation by the engine.

## Orthogonal axes

Every block lives at an intersection of four axes.

| Axis | Values |
|---|---|
| **Role** | `source` · `operation` · `visualizer` · `sink` · `control` · `composite` |
| **Domain** | `linear-algebra` · `statistics` · `calculus` · `discrete` · `optimization` · `common` |
| **Determinism** | `pure` · `stochastic` · `stateful` |
| **Stability** | `stable` · `beta` · `experimental` |

Roles in detail:
- **source** — produces values from parameters (e.g. `Constant`, `NormalDistribution`).
- **operation** — transforms inputs into outputs (e.g. `MatMul`, `Derivative`, `Integrate`).
- **visualizer** — has visual side-effect, may pass-through (e.g. `UnitGridPlot`, `Histogram`).
- **sink** — terminal output (e.g. `Display`, `Export`).
- **control** — flow orchestration (e.g. `If`, `Map`, `Iterate`).
- **composite** — user-defined block packaging a subgraph (Phase 5).

## Colour mapping

Categories map to colour families. See `docs/BRAND.md` for exact OKLCH tokens.

| Role | Family | Hint |
|---|---|---|
| Source (data) | sky-blue | "data lives here" |
| Operation (transform) | violet | "things happen here" |
| Function | amber | "abstraction over inputs" |
| Visualizer / Sink | emerald | "I see something" |
| Control / Logic | slate | "flow control" |
| Stochastic source | rose | "randomness" |
| Error / type warning | red-500 | "fix me" |

Use **one** accent hue per role; use shades and saturations within the family for sub-types, never random hues.

## BlockDefinition — the manifest

```typescript
// src/blocks/types.ts

export type BlockDefinition<TIn = unknown, TOut = unknown> = {
  /** Stable, dotted, lowercase id. e.g. "la.matmul", "stats.normal-pdf" */
  id: string;

  /** UI label, capitalized. */
  label: string;

  /** Optional symbol shown in compact view. e.g. "A·B", "∫", "𝔼". */
  symbol?: string;

  category: BlockRole;
  domain: BlockDomain;
  determinism: "pure" | "stochastic" | "stateful";
  stability: "stable" | "beta" | "experimental";

  /** Engine the block prefers. */
  engine: "mathjs" | "sympy" | "native";

  /** Visual identity. */
  color: ColorToken; // semantic, resolved by theme

  /** Input ports. */
  inputs: ReadonlyArray<InputPort>;

  /** Output ports. May be polymorphic in input shapes (function form). */
  outputs: ReadonlyArray<OutputPort>;

  /** Block-local parameters editable in the inspector (e.g. precision, basis). */
  params?: Record<string, ParamSpec>;

  /** The actual computation. */
  compute: (
    inputs: ResolvedInputs<TIn>,
    params: ResolvedParams,
    ctx: EvalContext,
  ) => Promise<MathValue> | MathValue;

  /** Explanation content. Each field is a function of the resolved inputs. */
  explain: {
    what: string | ((i: ResolvedInputs<TIn>) => string);          // 1 sentence: definition
    why: string | ((i: ResolvedInputs<TIn>) => string);           // 1 sentence: intuition
    effect?: (i: ResolvedInputs<TIn>, o: MathValue) => string;    // before/after summary
    impact?: (i: ResolvedInputs<TIn>, o: MathValue) => string;    // downstream consequences
  };

  /** Optional in-node preview component (live mini-visualization). */
  preview?: React.ComponentType<{ value: MathValue }>;

  /** Optional dedicated visualization component, opened from the node. */
  visualization?: React.ComponentType<{ inputs: ResolvedInputs<TIn>; output: MathValue }>;

  /** Property-based tests run by Vitest + fast-check. */
  tests: ReadonlyArray<PropertyTestSpec>;
};
```

## Naming conventions

- **Block ids**: `<domain-prefix>.<kebab-name>`.
  - `la.*` for linear algebra (`la.matmul`, `la.det`, `la.eigen`).
  - `stats.*` for statistics (`stats.normal-pdf`, `stats.expect`).
  - `calc.*` for calculus (`calc.derivative`, `calc.integrate`).
  - `core.*` for shared (`core.constant`, `core.scalar-add`).
- **Folder name**: same as the kebab part. So `la.matmul` lives in `src/blocks/linear-algebra/matmul/`.
- **Files inside a block folder**:
  ```
  matmul/
  ├── definition.ts        # exports `MatMulBlock: BlockDefinition`
  ├── compute.ts           # the math, separately importable for tests
  ├── visualization.tsx    # optional
  ├── matmul.test.ts       # property tests
  └── matmul.stories.tsx   # Storybook story
  ```

## Worked example — Matrix multiplication

```typescript
// src/blocks/linear-algebra/matmul/definition.ts
import { multiply } from "../../../math/mathjs-adapter";
import { matMulProperties } from "./matmul.test";

export const MatMulBlock: BlockDefinition = {
  id: "la.matmul",
  label: "Matrix multiplication",
  symbol: "A·B",
  category: "operation",
  domain: "linear-algebra",
  determinism: "pure",
  stability: "stable",
  engine: "mathjs",
  color: "violet",
  inputs: [
    { id: "A", label: "A", type: { kind: "Matrix", m: { var: "m" }, n: { var: "k" }, field: "real" } },
    { id: "B", label: "B", type: { kind: "Matrix", m: { var: "k" }, n: { var: "n" }, field: "real" } },
  ],
  outputs: [
    { id: "AB", label: "A·B", type: ({ A, B }) => ({
        kind: "Matrix",
        m: A.type.m,
        n: B.type.n,
        field: "real",
      }),
    },
  ],
  compute: async ({ A, B }) => multiply(A, B),
  explain: {
    what: "Multiply two matrices: each entry of A·B is a dot product of a row of A and a column of B.",
    why: "Matrix multiplication composes two linear transformations into one.",
    effect: ({ A, B }, out) =>
      `Combined a ${shape(A)} matrix with a ${shape(B)} matrix to form a ${shape(out)} matrix.`,
    impact: (_, out) =>
      `Downstream blocks see this as a ${shape(out)} matrix; det = ${det(out)}, rank ≤ min dimensions.`,
  },
  tests: matMulProperties,
};
```

## How to add a new block

1. **Read `docs/TYPES.md`** to confirm input/output shapes are expressible.
2. **Pick the id and folder**: `<domain>/<kebab-name>/`.
3. **Write the property-based test first** in `<name>.test.ts`. Cross-check against SymPy where feasible (see `docs/TESTING.md`).
4. **Implement `compute.ts`** until tests pass.
5. **Write `definition.ts`** with the manifest.
6. **Write a Storybook story** showing the block at idle, hover, selected, with-error, and with-warning states.
7. **Optional: visualization component** if the operation has a 2D/3D meaning.
8. **Register in the domain plugin** (`src/blocks/<domain>/index.ts`).
9. **Update `docs/ROADMAP.md`** if this block was a phase deliverable.
10. **Open one PR per block.** No batching.

## Anti-patterns

- ❌ Multiple unrelated blocks in one PR.
- ❌ A block whose `compute` reads global state (Zustand, window) — pass via `inputs` or `params`.
- ❌ A block whose `explain.what` is longer than one sentence.
- ❌ Using `any` in a `BlockDefinition`. If types don't fit, the type system needs an extension (ADR), not a cast.
- ❌ Blocks whose colour breaks the role mapping ("but it'd look nicer in pink"). Consistency wins.
- ❌ Visualizer blocks that mutate inputs.

## Block library taxonomy reference

A non-exhaustive list of intended blocks per phase. Cross-reference `docs/ROADMAP.md` for sequencing.
Status markers: `[shipped]` = in main; `[in progress]` = implementation underway; no marker = planned.

### Phase 1 (PoC slice — shipped)
- `core.constant` [shipped]
- `core.scalar-input` [shipped]
- `la.vector2` [**retired** in Phase 2 — see `la.vector`; URL migrator maps old `la.vector2` nodes in `schemaVersion: 1` graphs]
- `la.matrix2x2` [**retired** in Phase 2 — see `la.matrix`; URL migrator maps old `la.matrix2x2` nodes in `schemaVersion: 1` graphs]
- `la.matvec` [shipped — updated in Phase 2 to `Matrix<m,n> × Vector<n> → Vector<m>`]
- `la.matmul` [shipped — updated in Phase 2 to `Matrix<m,k> × Matrix<k,n> → Matrix<m,n>`]
- `viz.unit-grid` [shipped]

### Phase 2 (Linear algebra full)

**Generalized sources (replacing Phase 1 fixed-size blocks)**
- `la.vector` [shipped] — N-D real vector, `dim` parameter controls length. Output type `Vector<"any">` at static registration; concrete `n` resolved at runtime. Folder: `src/blocks/linear-algebra/vector/`.
- `la.matrix` [shipped] — m×n real matrix, `rows`/`cols` parameters. Output type `Matrix<"any","any">` statically. Folder: `src/blocks/linear-algebra/matrix/`.

**Operations**
- `la.transpose` [in progress] — `Matrix<m,n> → Matrix<n,m>`. Property test: involution `(Aᵀ)ᵀ = A`.
- `la.add` [in progress] — element-wise matrix addition, same shape required.
- `la.sub` — element-wise matrix subtraction, same shape required.
- `la.trace` — sum of diagonal; square-matrix only (shape constraint enforced at `compute` time, not by the type system).
- `la.det` — determinant; square-matrix only. Property tests: `det(I) = 1`, `det(A·B) = det(A)·det(B)`, `det(Aᵀ) = det(A)`.
- `la.inverse` — matrix inverse; square + full-rank.
- `la.rank` — matrix rank.
- `la.rref` — reduced row echelon form.
- `la.lu` — LU decomposition; outputs `L`, `U`, optional `P`.
- `la.qr` — QR decomposition; outputs `Q`, `R`.
- `la.svd` — singular value decomposition; outputs `U`, `Σ`, `Vᵀ`.
- `la.eigen` — eigenvalues and eigenvectors; outputs `values` (Vector), `vectors` (Matrix, column-ordered).
- `la.solve` — solve `Ax = b`; inputs `A: Matrix<n,n>`, `b: Vector<n>`, output `x: Vector<n>`.
- `la.basis-change` — express a vector in a new basis.
- `la.kernel` — null space of a matrix.
- `la.image` — column space of a matrix.
- `la.project` — orthogonal projection of a vector onto a subspace.

### Phase 3 (Statistics)
`stats.bernoulli`, `stats.binomial`, `stats.normal`, `stats.uniform`, `stats.poisson`, `stats.beta`, `stats.gamma`, `stats.empirical`, `stats.sample`, `stats.expect`, `stats.var`, `stats.cov`, `stats.cor`, `stats.mgf`, `stats.posterior`, `stats.bayes-net`, `viz.pdf-cdf`, `viz.histogram`, `viz.joint-heatmap`.

### Phase 4 (Calculus)
`calc.function`, `calc.derivative`, `calc.partial`, `calc.gradient`, `calc.integrate`, `calc.definite-integrate`, `calc.limit`, `calc.series`, `calc.taylor`, `calc.ode-solve`, `viz.tangent`, `viz.riemann`, `viz.epsilon-delta`.

### Phase 5 (Composites)
`core.subgraph`, `core.assert`, `core.benchmark`.

### Phase 3 (Statistics)
`stats.bernoulli`, `stats.binomial`, `stats.normal`, `stats.uniform`, `stats.poisson`, `stats.beta`, `stats.gamma`, `stats.empirical`, `stats.sample`, `stats.expect`, `stats.var`, `stats.cov`, `stats.cor`, `stats.mgf`, `stats.posterior`, `stats.bayes-net`, `viz.pdf-cdf`, `viz.histogram`, `viz.joint-heatmap`.

### Phase 4 (Calculus)
`calc.function`, `calc.derivative`, `calc.partial`, `calc.gradient`, `calc.integrate`, `calc.definite-integrate`, `calc.limit`, `calc.series`, `calc.taylor`, `calc.ode-solve`, `viz.tangent`, `viz.riemann`, `viz.epsilon-delta`.

### Phase 5 (Composites)
`core.subgraph`, `core.assert`, `core.benchmark`.
