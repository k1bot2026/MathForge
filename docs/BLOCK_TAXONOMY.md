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

**Distributions** _(source role, stochastic, rose color)_

- `stats.bernoulli` [shipped] — Bernoulli(p); output port `dist: Distribution(Bernoulli)`. `DistributionPayload` with `parameters: { family: "Bernoulli", p }`, eager closed-form moments (`mean=p`, `variance=p(1-p)`), `support: { kind: "discrete", values: [0,1] }`. Establishes the `DistributionPayload` pattern for all Phase 3 blocks. (`7fed327`)
- `stats.binomial` [shipped] — Binomial(n, p); output port `dist: Distribution(Binomial)`. Params: `n ∈ ℕ₀` (integer), `p ∈ [0,1]` (number slider). `E[X]=n·p`, `Var[X]=n·p·(1-p)`. Bernoulli-as-Binomial(1,p) consistency verified. (`96b7fd7`)
- `stats.normal` [shipped] — Normal(μ, σ); output port `dist: Distribution(Normal)`. Params `μ` (mean), `σ > 0` (std dev). E[X]=μ, Var[X]=σ², skewness=0, excess kurtosis=0. (`8630ce9`)
- `stats.uniform` [shipped] — Uniform(a, b) continuous distribution; output port `dist: Distribution(Uniform)`. Params `a < b` (validated). E[X]=(a+b)/2, Var[X]=(b-a)²/12, skewness=0, excess kurtosis=−1.2. (`66d0e3b`)
- `stats.poisson` [shipped] — Poisson(λ); output port `dist: Distribution(Poisson)`. Param `λ > 0`. E[X]=Var[X]=λ (equidispersion). Discrete support 0..⌈λ+6√λ⌉. 7 property tests. (`d8c5069`)
- `stats.beta` [shipped] — Beta(α, β); output port `dist: Distribution(Beta)`. Params `α, β > 0`. Support [0,1]. E[X]=α/(α+β), Var[X]=αβ/((α+β)²(α+β+1)). Closed-form skewness + excess kurtosis. Beta(1,1)=Uniform(0,1). Conjugate prior for Bernoulli/Binomial. (`180ceff`)
- `stats.gamma` [shipped] — Gamma(α, β) shape/rate; output port `dist: Distribution(Gamma)`. Params `α, β > 0`. Support [0, ∞). E[X]=α/β, Var[X]=α/β². Gamma(1,β)=Exponential(β). Conjugate prior for Poisson. (`111afc5`)
- `stats.empirical` [shipped] — wraps sample Vector as Distribution(Empirical); input `samples: Vector<n, real>`; output port `dist: Distribution(Empirical)`. E[X]=sample mean, Var[X]=population variance (÷n). Support carries original sample array for viz.histogram. (`870d195`)

**Operations** _(operation role, pure unless sampling, violet color)_

- `stats.sample` [shipped] — draws n independent samples from a distribution; input `dist: Distribution`; output `samples: Vector<n, real>`. PCG32-seeded PRNG (BigInt 64-bit state) for reproducibility. Params: `n` (count), `seed`. Supports all 8 parametric families. (`78f7e51`)
- `stats.expect` [shipped] — reads `moments.mean` from DistributionPayload; input `dist: Distribution`; output `mean: Scalar(real)`. Engine: native. Cross-engine tested against SymPy for 5 families. (`a0555ce`)
- `stats.var` [shipped] — reads `moments.variance` from DistributionPayload; input `dist: Distribution`; output `variance: Scalar(real)`. Engine: native. Cross-engine tested against SymPy for 7 families. (`56bddd1`)
- `stats.cov` [shipped] — Cov[X, Y] = E[(X−E[X])(Y−E[Y])]; inputs `X: Distribution`, `Y: Distribution`; output `cov: Scalar(real)`. Assumes independence (returns 0) unless X=Y. (`c5ed65f`)
- `stats.cor` [shipped] — Pearson Cor[X, Y] = Cov/(√Var[X]·√Var[Y]) ∈ [−1,1]; inputs `cov: Scalar`, `X: Distribution`, `Y: Distribution`; output `cor: Scalar(real)`. (`7451bef`)
- `stats.mgf` [shipped] — M_X(t) = E[e^{tX}] symbolically via SymPy Pyodide worker; input `distribution: Distribution`; output `mgf: Expression(t)`; stability: beta; engine: sympy. First block using the SymPy RPC pattern (establishes pattern for Phase 4). (`13a1760`)
- `stats.posterior` [shipped] — conjugate Bayesian update: prior + likelihood evidence → posterior; inputs `prior: Distribution`, `likelihood: Distribution`; params `n_obs`, `k_hits`, `x_obs`; output `posterior: Distribution`. 4 conjugate pairs: Beta–Bernoulli, Beta–Binomial, Normal–Normal (known σ), Gamma–Poisson. 18 property tests. Stability: beta. (`4e856fe`)

**Composite**

- `stats.bayes-net` — user-assembled Bayesian network; wraps a subgraph of distributions and conditionals. **Deferred to Phase 5** (requires `core.subgraph`).

**Visualization** _(visualizer role, emerald color)_

- `viz.pdf-cdf` [shipped] — PDF/CDF side-by-side plot; input `X: Distribution`; passthrough output `X: Distribution`. Uses Observable Plot. (`ebbf0ce`)
- `viz.histogram` [shipped] — Observable Plot histogram with optional KDE overlay; input `samples: Vector<n, real>`; passthrough output; params `bins` (0=auto), `kde` (boolean). (`6054a7e`)
- `viz.joint-heatmap` [shipped] — SVG joint density heatmap p(x,y)=p_X(x)·p_Y(y); inputs `X: Distribution`, `Y: Distribution`; passthrough output `X: Distribution`. Independence assumed. (`3cd3863`)
- `viz.posterior-update` [shipped] — overlaid Beta prior + posterior curves; inputs `prior: Distribution(Beta)`, `posterior: Distribution(Beta)`; passthrough output `posterior: Distribution(Beta)`. Stats.posterior does the Bayesian math; this block is pure visualizer. Stability: beta. (`cc75e44`, refactored `427a2ac`)

### Phase 4 (Calculus)

**Foundation note:** `FunctionPayload` (`{ expression: string, variables: ReadonlyArray<string> }`) and `ExpressionPayload` are defined in `src/math/types.ts`. The Pyodide client was extended in `02b5512` with sympify/diff/integrate/definiteIntegrate/limit/taylor RPCs covering all Phase 4 blocks. All calc.* blocks use `engine: "sympy"`, `stability: "beta"`, `color: "function"`.

**Function blocks** _(source role, function color)_

- `calc.function` [shipped] — symbolic expression entry; params `expression` (string, default "sin(x)"), `variable` (string, default "x"); output port `fn: Function(arity=1, real→real)`. SymPy sympify() validates and normalises the expression. `FunctionPayload.expression` holds canonical SymPy str() form. Throws `FunctionError`. Establishes `FunctionPayload` convention for Phase 4. (`02b5512`)

**Operation blocks** _(operation role, sympy engine, function color)_

- `calc.derivative` [shipped] — symbolic d/dx via SymPy diff(); input `fn: Function`; param `variable` (blank = infer from payload); output port `fn: Function`. Chainable for higher-order derivatives. Throws `DerivativeError`. (`cc3542d`)
- `calc.partial` [shipped] — ∂/∂xᵢ of multivariate Function via SymPy diff(); input `fn: Function`; param `variable` (explicit required); output port `fn: Function`. Preserves full variables list in FunctionPayload so downstream blocks see all free vars. Throws `PartialError`. (`75339ae`)
- `calc.gradient` [shipped] — ∇f = [∂f/∂x₁, …, ∂f/∂xₙ] via parallel SymPy diff per variable in FunctionPayload.variables; input `fn: Function`; output port `gradient: Vector<n, real>` (n = len(variables)). Throws `GradientError`. Use with viz.vector-field to visualise gradient fields. (`264322c`)
- `calc.integrate` [shipped] — indefinite integral ∫f dx via SymPy integrate(); input `fn: Function`; param `variable` (blank = infer); output port `fn: Function` (antiderivative; constant of integration omitted). Throws `IntegrateError`. (`8d41219`)
- `calc.definite-integrate` [shipped] — ∫ₐᵇ f dx via SymPy N(integrate(f,(x,a,b))); inputs `fn: Function`, optional `a: Scalar(real)`, optional `b: Scalar(real)`; params `a` (default 0), `b` (default 1), `variable`; output port `value: Scalar(real, approximate)`. Bound inputs override params. Throws `DefiniteIntegrateError`. (`5cbf696`)
- `calc.limit` [shipped] — lim_{x→c} f(x) via SymPy limit(); inputs `fn: Function`, optional `point: Scalar(real)`; params `point` (default 0), `variable`; output port `value: Expression(freeVars=[])`. Scalar for finite numeric results; Expression for symbolic answers (oo, zoo). Throws `LimitError`. (`3ceb98f`)
- `calc.series` [shipped] — partial sum Σ_{n=from}^{to} aₙ via SymPy Sum().doit(); inputs `fn: Function` (general term aₙ), optional `from: Scalar(real)`, optional `to: Scalar(real)`; params `from` (default 0), `to` (default 10), `index` (blank = infer); output port `value: Scalar(real, approximate)` for numeric sums, or `fn: Function` for parametric terms. Bound inputs override params. Throws `SeriesError`. (`505b00a`)
- `calc.taylor` [shipped] — degree-n Taylor polynomial via SymPy series().removeO(); inputs `fn: Function`, optional `center: Scalar(real)`, optional `order: Scalar(real)`; params `center` (default 0), `order` (1–20, default 5), `variable`; output port `fn: Function` (polynomial, no O() term). Throws `TaylorError`. Phase 4 exit-criterion centerpiece. (`99b529f`)
- `calc.ode-solve` [shipped] — ODE solver via SymPy dsolve(); prime notation y′; optional IVP ports `x0: Scalar(real)`, `y0: Scalar(real)` (not required); params `ode` (string), `depVar` (default "y"), `indepVar` (default "x"), `x0` (default 0), `y0` (default 1); output port `solution: Function` (explicit solution) or `solution: Expression` (implicit/piecewise). Throws `OdeSolveError`. Extends Pyodide client with dsolve RPC. (`a569a71`)

**Visualization** _(visualizer role, emerald color)_

- `viz.tangent` [shipped] — interactive tangent line on Mafs plot; inputs `fn: Function`, optional `derivative: Function` (exact slope, falls back to central-difference); passthrough output `fn: Function`. Click anywhere on plot to move contact point. Engine: native. (`e0ad80d`)
- `viz.riemann` [shipped] — animated Riemann sum approximation ∫ₐᵇ f(x)dx; input `fn: Function`, optional `a: Scalar(real)`, optional `b: Scalar(real)`; params `a` (default 0), `b` (default π); n-slider (rectangles count) + left/right/midpoint method selector; passthrough output `fn: Function`. Engine: native. (`3da90ee`)
- `viz.epsilon-delta` [shipped] — ε–δ limit definition with interactive ε and δ sliders; input `fn: Function`, optional `c: Scalar(real)`, optional `L: Scalar(real)`; yellow horizontal ε-strip + blue vertical δ-strip, turns green when δ satisfies the definition; passthrough output `fn: Function`. Engine: native. (`9583503`)
- `viz.taylor` [shipped] — plots f(x) (solid) and Tₙ(x) (dashed) on the same axes; inputs `fn: Function` (original), optional `taylor: Function` (from calc.taylor); passthrough output `fn: Function`. Evaluates expression strings numerically via mathjs.evaluate(). Introduces `viz-calc.ts` shared helpers (evalAt, sampleExpr, yRange) for calculus viz blocks. Phase 4 exit-criterion demo block. (`18e7d58`)
- `viz.vector-field` [shipped] — 2D arrow-grid vector field; inputs `Fx: Function(arity=2)` (x-component, required), optional `Fy: Function(arity=2)` (y-component); zoom slider param; passthrough output `Fx: Function`. Arrow length/opacity encodes magnitude. Connect calc.partial outputs as Fx/Fy to visualise gradient fields. Engine: native. (`81aace9`)

### Phase 5 (Composites & ecosystem)

**Internal infrastructure blocks** _(used by core.subgraph — not placed directly by users)_

- `core.input-proxy` [shipped] — internal placeholder marking a subgraph input port; `stability: "internal"`; category: source; no inputs; output port `value: Scalar(real, approximate)`; param `portId: string`. Throws if called standalone — must be pre-populated by `core.subgraph`'s sub-evaluator. (`5400d37`)
- `core.output-proxy` [shipped] — internal placeholder marking a subgraph output port; `stability: "internal"`; category: sink; input port `value: Scalar(real, approximate)`; no outputs; param `portId: string`. Identity pass-through; `core.subgraph` reads its result to expose named output ports. (`5400d37`)

**Registry extension**

- `BlockRegistry.registerOrReplace()` [shipped] — new method for registering user-defined composite blocks. Built-in blocks (registered via `register()`) are tracked in a `builtinIds` Set and cannot be overwritten (throws). Replacing an existing user block emits a `console.warn`. (`e1159c4`)

**Composite blocks** _(composite role, stateful, slate color)_

- `core.subgraph` [shipped] — composite block factory (`buildSubgraphDefinition(id, label, payload, inputPorts, outputPorts, registry)`); `SubgraphPayload = { inner: GraphSpec, inputProxies, outputProxies }`; sub-evaluator recursion capped at `MAX_SUBGRAPH_DEPTH = 8`; `EvalContext.depth` threaded opaquely through the evaluator; registered at runtime via `BlockRegistry.registerOrReplace()`; output port: single named port or multiple named ports (no Tuple — see ADR 0004 §5); stability: experimental; throws `SubgraphError`. (`6eb1bd6`)
- `core.assert` [shipped] — asserts that `actual ≈ expected` within an optional `tolerance` param; inputs `actual: Scalar(real, approximate)`, `expected: Scalar(real, approximate)`; output port `pass: Scalar(boolean, exact)`; param `tolerance: number` (default 0). `computeAssert` handles Scalar, Vector, Matrix (element-wise), and Expression (serialized string) equality; kind mismatch returns false. Engine: native; stability: stable. 192 tests. (`209c4cf`)
- `core.benchmark` [shipped] — wall-clock profiler for a `Function`; inputs `fn: Function(arity=1, real→real)`, optional `x: Scalar(real)` (eval point, default 0); output port `ms_per_call: Scalar(real, approximate)`; params `samples` (default 10, min 1), `warmup` (default 2, min 0); runs warmup evals then measures `samples` timed evals returning mean ms/call; determinism: stochastic; stability: experimental; throws `BenchmarkError`. 17 tests. (`8758c79`)

**Deferred from Phase 3 (now shipped)**

- `stats.bayes-net` [shipped] — user-assembled Bayesian network implemented as a `core.subgraph` instance; pre-configured with Beta prior + Binomial likelihood + Poisson–Gamma conjugate pair; registered via `BlockRegistry.registerOrReplace()`. Closes Phase 3 deferral. (`60e234b`)

**Infrastructure (Phase 5)**

- IndexedDB Layer 3 cache [shipped] — cross-reload `EvalCache` persistence via idb-keyval write-through; cache entries tagged with graph hash; `IndexedDBCache` class in `src/engine/cache.ts`; `hydrateFromIDB()` on startup; 146-test suite. Closes Phase 4 deferral. (`ee43548`)
- Block versioning + save/load [shipped] — `saveUserBlock` / `loadUserBlocks` / `deleteUserBlock` / `hydrateUserBlocks` in `src/lib/user-blocks.ts`; `SaveAsBlockButton` in inspector panel; `hydrateUserBlocksIntoRegistry()` wired on canvas mount; graph-codec v3 with optional `subgraph` field on `SerializedNode.data`. (`f887afc`)
- Supabase backend — Postgres + Auth (magic link); persistent graphs at `/g/<slug>`. **Deferred to Phase 5b — Cloud sharing** (user-approved 2026-05-05).
- Community block library — browse, fork, install blocks authored by other users. Pending.

### Phase 6 (Discrete Mathematics & Combinatorics)

**Foundation note:** `Permutation`, `Combination`, `Graph`, `Modular` added to `MathType` discriminator in `src/math/types.ts` (`1008750`). `canConnect` extended for all new kinds. `discrete/index.ts` plugin entry registered in `src/blocks/index.ts`. All `discrete.*` blocks use `engine: "native"` unless noted; stability: `"beta"` unless noted; color: `"violet"` for operations, `"sky-blue"` for sources.

**Set blocks** _(source + operation role)_

- `discrete.set` [shipped] — explicit integer set; params `count` (1–16) + `e0..e15` integer values; deduplicates and sorts output; output port `set: Set<Scalar(integer, exact)>`. Property tests: idempotence, order-independence, size invariant, no duplicates. (`a1d2bf7`)
- `discrete.union` — `A: Set × B: Set → Set`; element-wise union.
- `discrete.intersection` — `A: Set × B: Set → Set`; elements in both A and B.
- `discrete.difference` — `A: Set × B: Set → Set`; elements in A not in B.
- `discrete.cartesian-product` — `A: Set × B: Set → Set<Tuple>`; all ordered pairs.

**Combinatorics** _(operation role, violet)_

- `discrete.permutations` — ordered arrangements; inputs `set: Set`, `r: Scalar(integer)`; output `count: Scalar(integer, exact)` (P(n,r) = n!/(n−r)!).
- `discrete.combinations` — unordered selections; inputs `set: Set`, `r: Scalar(integer)`; output `count: Scalar(integer, exact)` (C(n,r) = n!/(r!(n−r)!)).
- `discrete.factorial` — n!; input `n: Scalar(integer, exact)` (n ≥ 0); output `result: Scalar(integer, exact)`.
- `discrete.binomial` — C(n, k); inputs `n: Scalar(integer)`, `k: Scalar(integer)`; output `result: Scalar(integer, exact)`. Property test: Pascal's identity C(n,k) = C(n−1,k−1) + C(n−1,k).
- `discrete.multinomial` — n! / (n₁!·…·nₖ!); input `counts: Vector<k, integer>`; output `result: Scalar(integer, exact)`.

**Number theory** _(operation role, violet)_

- `discrete.gcd` — GCD via Euclidean algorithm; inputs `a: Scalar(integer)`, `b: Scalar(integer)`; output `result: Scalar(integer, exact)`. SymPy cross-check.
- `discrete.lcm` — LCM = |a·b| / gcd(a,b); inputs `a: Scalar(integer)`, `b: Scalar(integer)`; output `result: Scalar(integer, exact)`. Property test: `gcd(a,b) · lcm(a,b) = |a·b|`.
- `discrete.modpow` — modular exponentiation aᵇ mod m; inputs `a`, `b`, `m: Scalar(integer)`; output `result: Scalar(integer, exact)`.
- `discrete.is-prime` — primality test; input `n: Scalar(integer)`; output `result: Scalar(boolean, exact)`.
- `discrete.factor` — prime factorization; input `n: Scalar(integer)`; output `factors: Vector<k, integer>` (prime factors with multiplicity, ascending). SymPy factorint cross-check.
- `discrete.totient` — Euler's φ(n); input `n: Scalar(integer, exact)` (n ≥ 1); output `result: Scalar(integer, exact)`. Property test: multiplicativity for coprime inputs. SymPy cross-check.
- `discrete.divisors` — all positive divisors of n; input `n: Scalar(integer)`; output `divs: Set<Scalar(integer, exact)>`.
- `discrete.prime-factorize` — returns prime bases and exponents; input `n: Scalar(integer)`; output `Tuple` of `primes: Vector<k>` + `exponents: Vector<k>`.
- `discrete.modular-inverse` — a⁻¹ mod m; inputs `a: Scalar(integer)`, `m: Scalar(integer)`; requires gcd(a, m) = 1; throws `ModularInverseError` when not coprime; output `result: Scalar(integer, exact)`.

**Graph theory** _(operation role, violet; source role for `discrete.graph`)_

- `discrete.graph` — explicit graph; params: vertex list (labels), edge list (source, target, optional weight), directed/undirected flag; output `g: Graph`. Source block.
- `discrete.adjacency-matrix` — `Graph → Matrix<n,n>`; bridges discrete and linear-algebra domains. Weighted edges produce weight values; unweighted produce 0/1. Engine: native.
- `discrete.shortest-path` — Dijkstra (weighted) or BFS (unweighted); inputs `g: Graph`, `source: Scalar(integer)` (vertex id); output `distances: Vector<n, real>` + optional `path: Vector<k, integer>`. Throws `ShortestPathError` for disconnected source.
- `discrete.minimum-spanning-tree` — Kruskal (undirected only); input `g: Graph`; output `mst: Graph` (spanning tree). Throws `MSTError` for directed or disconnected graphs.
- `discrete.connected-components` — weakly connected component labelling; input `g: Graph`; output `count: Scalar(integer, exact)`.
- `discrete.coloring` — chromatic number via backtracking; input `g: Graph`; output `chromatic: Scalar(integer, exact)`. Stability: experimental (exponential worst case).

**Sequences & recurrences** _(operation role, violet)_

- `discrete.fibonacci` — nth Fibonacci number; input `n: Scalar(integer)`; output `result: Scalar(integer, exact)`. Large n via Binet formula (approximate branch); exact for n ≤ 70.
- `discrete.partial-sum` — Σᵢ₌₀ⁿ aᵢ; input `seq: Vector<n, real>`; output `sum: Scalar(real)`.
- `discrete.recurrence` — evaluate a recurrence relation up to n; params: `f` (string, e.g. "a[n-1]+a[n-2]"), `initial` (initial values), `n` (evaluation depth). Stability: experimental.

**Visualization** _(visualizer role, emerald)_

- `viz.graph-2d` — force-directed graph layout; input `g: Graph`; passthrough output `g: Graph`. react-three-fiber or 2D Canvas. Vertex labels shown; edge weights shown for weighted graphs.
- `viz.set-venn` — Venn diagram for ≤3 sets (SVG); inputs up to `A`, `B`, `C: Set`; regions labeled with membership counts. Passthrough output `A: Set`.
- `viz.permutation-cycles` — cycle decomposition of a permutation; input `perm: Permutation`; SVG arrows showing cycles. Passthrough output.
- `viz.modular-clock` — clock-face modular arithmetic; input `x: Modular`; SVG clock with hand pointing to x mod m. Passthrough output.
