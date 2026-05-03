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
- `la.transpose` [shipped] — `Matrix<m,n> → Matrix<n,m>`. Property tests: involution, shape reversal, `(A·B)ᵀ = BᵀAᵀ`. (`ed24132`)
- `la.add` [shipped] — element-wise matrix addition, same shape required. (`061f40a`)
- `la.sub` [shipped] — element-wise matrix subtraction, same shape required. (`0ccaae9`)
- `la.trace` [shipped] — sum of diagonal; square-matrix only (typed error for non-square inputs). (`7704e07`)
- `la.det` [shipped] — determinant via math.js LU; square-matrix only. Property tests: `det(I) = 1`, `det(A·B) = det(A)·det(B)`, `det(Aᵀ) = det(A)`. (`c50ade4`)
- `la.inverse` [shipped] — matrix inverse with singular-matrix guard; square + full-rank. (`eba6346`)
- `la.rref` [shipped] — reduced row echelon form via partial-pivoting Gauss-Jordan. (`7cdcadc`)
- `la.rank` [shipped] — matrix rank via non-zero row count of RREF. (`74a34d0`)
- `la.lu` [shipped] — LU decomposition with partial pivoting; outputs `L`, `U`, `P`. Property tests: `P·A = L·U`, L lower-triangular with unit diagonal, U upper-triangular. (`9f0fcea`)
- `la.qr` [shipped] — QR decomposition via Householder reflections; outputs `Q`, `R`. Property tests: `A = Q·R`, `Qᵀ·Q = I`, R upper-triangular. (`f654d61`)
- `la.svd` [shipped] — singular value decomposition via `eigs(AᵀA)`; single `Tuple` output port `USV` wrapping `SvdPayload { U: Matrix<m,m>, S: Vector<min(m,n)>, V: Matrix<n,n> }`. U and V are orthogonal; S holds singular values in descending order. Reconstruction: `U·diag(S)·Vᵀ ≈ A`. Throws `SvdError`. Supports rectangular and rank-deficient inputs. (`d9d84cd`)
- `la.eigen` [shipped] — eigendecomposition (real eigenvalues only); single `Tuple` output port `eigenpairs` wrapping `EigenPayload { eigenvalues: number[], eigenvectors: number[][] }` (column k is eigenvector for eigenvalues[k]). Throws `EigenError` for complex eigenvalues. Square input only. (`5809167` + `d03f9ad`)
- `la.solve` [shipped] — solve `Ax = b` via math.js `lusolve`; inputs `A: Matrix<n,n>`, `b: Vector<n>`, output `x: Vector<n>`. Throws `SolveError` for singular A (`|det A| < 1e-10`). (`fd1a9ec`)
- `la.basis-change` [shipped] — change of basis `P⁻¹·T·P`; inputs `T: Matrix<n,n>` (transformation), `P: Matrix<n,n>` (invertible basis); output `TPrime: Matrix<n,n>`. Similarity invariants preserved: `trace(T′) = trace(T)`, `det(T′) = det(T)`. Throws `BasisChangeError` for singular P. (`552f5b4`)
- `la.kernel` [shipped] — null space basis via RREF; input `A: Matrix<m,n>`; output `K: Matrix<n,k>` where k = nullity (columns are basis vectors of ker(A)). Returns `n×0` matrix when A has trivial null space. Engine: native. (`0f2db97`)
- `la.image` [shipped] — column space basis via RREF pivot columns; input `A: Matrix<m,n>`; output `B: Matrix<m,r>` where r = rank(A). Returns `m×0` matrix for zero map. Engine: native. (`5b0f444`)
- `la.project` [shipped] — orthogonal projection `A·(AᵀA)⁻¹·Aᵀ·v`; inputs `A: Matrix<m,n>`, `v: Vector<m>`; output `Pv: Vector<m>`. Requires A to have full column rank. Throws if `AᵀA` is singular. (`e34f2c3`)

**Visualization**

- `viz.unit-grid-3d` [shipped] — renders unit cube [0,1]³ and its image under a 3×3 matrix M as an interactive 3D wireframe (react-three-fiber + drei, OrbitControls). Basis arrows M·e₁/e₂/e₃ in distinct colors. Input `M: Matrix<3,3>`; passthrough output. Dependencies added: `three@0.184.0`, `@react-three/fiber@9.6.1`, `@react-three/drei@10.7.7`. (`cb64ca3`)

### Phase 3 (Statistics)
`stats.bernoulli`, `stats.binomial`, `stats.normal`, `stats.uniform`, `stats.poisson`, `stats.beta`, `stats.gamma`, `stats.empirical`, `stats.sample`, `stats.expect`, `stats.var`, `stats.cov`, `stats.cor`, `stats.mgf`, `stats.posterior`, `stats.bayes-net`, `viz.pdf-cdf`, `viz.histogram`, `viz.joint-heatmap`.

### Phase 4 (Calculus)
`calc.function`, `calc.derivative`, `calc.partial`, `calc.gradient`, `calc.integrate`, `calc.definite-integrate`, `calc.limit`, `calc.series`, `calc.taylor`, `calc.ode-solve`, `viz.tangent`, `viz.riemann`, `viz.epsilon-delta`.

### Phase 5 (Composites)
`core.subgraph`, `core.assert`, `core.benchmark`.
