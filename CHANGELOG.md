# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions map to phase milestones, not calendar releases.

---

## [Unreleased] — Phase 3: Statistics (complete)

Phase 2 fully complete: all 17 linear algebra operation blocks, 3 visualization items
(viz.unit-grid-3d, eigenvector highlighting, det area/volume animation), SymPy
cross-engine fixtures for every operation, and 100-node perf gate green.

Phase 3 complete: 8 distributions + 7 operations + 4 visualization blocks. Bayesian
inference pipeline (prior + likelihood → posterior → viz) works end-to-end.
`stats.mgf` establishes the SymPy Pyodide worker RPC pattern for Phase 4 calculus.
1338 tests green. `stats.bayes-net` deferred to Phase 5 (requires `core.subgraph`).

### Distributions (Phase 3)

- **`stats.bernoulli`** — Bernoulli(p) distribution. Source block (no inputs); param `p ∈ [0,1]` via slider. Output port `dist: Distribution(Bernoulli)`. Establishes the `DistributionPayload` pattern (`distribution-payload.ts`): discriminated `parameters` union, eager closed-form `moments` (mean, variance, skewness?, excessKurtosis?), typed `support`. 14 property tests. (`7fed327`)
- **`stats.binomial`** — Binomial(n, p) distribution. Params: `n ∈ ℕ₀` (integer), `p ∈ [0,1]`. E[X]=n·p, Var[X]=n·p·(1−p). 12 property tests including Bernoulli-as-Binomial(1,p) consistency. (`96b7fd7`)
- **`stats.normal`** — Normal(μ, σ) distribution. Params `μ` (mean), `σ > 0` (standard deviation). E[X]=μ, Var[X]=σ², skewness=0, excess kurtosis=0. (pre-existing)
- **`stats.uniform`** — Uniform(a, b) continuous distribution. Params `a < b` (validated). E[X]=(a+b)/2, Var[X]=(b-a)²/12, skewness=0, excess kurtosis=−1.2. 9 property tests including standard U(0,1) identity. Also ships `bernoulli-sympy.test.ts` (cross-engine test using `stats-bernoulli.json` fixture). (`66d0e3b`)
- **`stats.poisson`** — Poisson(λ) distribution. Param `λ > 0`. E[X]=Var[X]=λ (equidispersion). Discrete support 0..⌈λ+6√λ⌉ (captures >99.9999998% probability mass). 7 property tests including equidispersion identity. (`d8c5069`)
- **`stats.beta`** — Beta(α, β) distribution on [0,1]. Params `α, β > 0`. Closed-form skewness and excess kurtosis (no gamma function needed). Beta(1,1)=Uniform(0,1) identity verified. 8 property tests. Conjugate prior for Bernoulli/Binomial. (`180ceff`)
- **`stats.gamma`** — Gamma(α, β) shape/rate distribution on [0, ∞). Params `α, β > 0`. E[X]=α/β, Var[X]=α/β². Gamma(1,β)=Exponential(β) identity verified. 9 property tests. Conjugate prior for Poisson. (`111afc5`)
- **`stats.empirical`** — wraps a sample Vector as Distribution(Empirical). Input `samples: Vector<n, real>`. E[X]=sample mean, Var[X]=population variance (÷n, not n−1). Support carries the original sample array for viz.histogram. 8 property tests. (`870d195`)

### Operations (Phase 3)

- **`stats.sample`** — draws n independent samples from a distribution using a seeded PCG32 PRNG (BigInt 64-bit state) for full reproducibility. Output `samples: Vector<n, real>`. Params: `n` (count), `seed`. Supports Bernoulli, Binomial, Uniform, Normal (Box-Muller), Poisson (Knuth), Beta (ratio of Gamma draws), Gamma (Marsaglia-Tsang), Empirical. Removes catch-all from `DistributionParameters` union for correct TypeScript narrowing. 10 tests. (`78f7e51`)
- **`stats.expect`** — E[X]: reads `moments.mean` directly from `DistributionPayload`; engine: native. Input `dist: Distribution`; output `mean: Scalar(real)`. Cross-engine tested against SymPy for 5 families. (`a0555ce`)
- **`stats.var`** — Var[X]: reads `moments.variance` directly from `DistributionPayload`; engine: native. Input `dist: Distribution`; output `variance: Scalar(real)`. Cross-engine tested against SymPy for 7 families. (`56bddd1`)
- **`stats.cov`** — Cov[X, Y] = E[(X−E[X])(Y−E[Y])]. Assumes independence (returns 0) unless X and Y are the same random variable. Inputs `X: Distribution`, `Y: Distribution`; output `cov: Scalar(real)`. (`c5ed65f`)
- **`stats.cor`** — Pearson Cor[X, Y] = Cov/(√Var[X]·√Var[Y]) ∈ [−1, 1]. Three inputs: `cov: Scalar`, `X: Distribution`, `Y: Distribution`; output `cor: Scalar(real)`. (`7451bef`)
- **`stats.mgf`** — M_X(t) = E[e^{tX}] computed symbolically via SymPy Pyodide worker; output `mgf: Expression(t)`. Engine: sympy; stability: beta. Introduces `ExpressionPayload` type for SymPy-backed symbolic outputs. First block using the Pyodide worker RPC pattern — establishes the template for Phase 4 calculus blocks. (`13a1760`)
- **`stats.posterior`** — conjugate Bayesian update: prior + likelihood evidence → posterior. Params `n_obs`, `k_hits`, `x_obs`. Four supported conjugate pairs: Beta–Bernoulli, Beta–Binomial, Normal–Normal (known σ), Gamma–Poisson. Closed-form posterior parameters computed exactly. 18 property tests. Stability: beta. (`4e856fe`)

### Visualization (Phase 3)

- **`viz.pdf-cdf`** — plots PDF (or PMF for discrete distributions) and CDF side-by-side using Observable Plot. Input `X: Distribution`; passthrough output. Handles both discrete (PMF/step-CDF) and continuous (density/smooth-CDF) distributions. (`ebbf0ce`)
- **`viz.histogram`** — Observable Plot histogram with optional Gaussian KDE density overlay; input `samples: Vector<n, real>`; passthrough output. Params: `bins` (integer, 0=auto), `kde` (boolean toggle). (`6054a7e`)
- **`viz.joint-heatmap`** — SVG joint density heatmap p(x,y)=p_X(x)·p_Y(y) assuming independence. Inputs `X: Distribution`, `Y: Distribution`; passthrough output `X`. Grid computed from marginal PDFs/PMFs. (`3cd3863`)
- **`viz.posterior-update`** — overlays prior and posterior Beta distributions on the same axis. Inputs `prior: Distribution(Beta)`, `posterior: Distribution(Beta)` (wire from stats.posterior); passthrough output `posterior`. Separation of Bayesian computation (stats.posterior) from visualization (this block). Stability: beta. (`cc75e44`; refactored to consume stats.posterior via input port in `427a2ac`)

### Refactors (Phase 3)

- **`viz-math.ts` shared utility** — extracted `pdfAt`, `pmfAt`, `cdfAt`, and KDE helpers from pdf-cdf, joint-heatmap, and posterior-update visualizations into `src/blocks/statistics/viz-math.ts`. Eliminates duplicate distribution math across 3 visualization modules. (`e20084f`)

### Testing (Phase 3)

- **`sympy.stats` fixture pattern** — `stats-bernoulli.json` (9 cases: moments, PMF, CDF for p ∈ {0, 1/5, …, 1}); `loadBernoulliFixture()` typed accessor in `sympy-reference.ts`. Sets the per-distribution cross-engine test pattern for Phase 3. (`6470cf5`)
- **LLN tests upgraded** — `sample-lln.test.ts` updated with statistically principled ±2σ/√n mean bands and ±5% variance convergence checks for all 7 parametric families (Bernoulli(0.3), Binomial(20,0.4), Uniform(0,10), Normal(0,1), Poisson(5), Beta(2,3), Gamma(2,1)). Each family uses a unique seed (42–48). Replaces the previous flat ±1% tolerance. (`5793827`)
- **Cross-engine tests for stats.expect + stats.var** — `expect-sympy.test.ts`: E[X] pipeline test for 5 families chained through computeX → computeExpect. `var-sympy.test.ts`: Var[X] pipeline test for 7 parametric families. Tests count: 1190 → 1271 (+81). (`39582d0`)

### Foundation (Phase 3)

- **`ExpressionPayload` type** — introduced in `src/blocks/statistics/expression-payload.ts` (shipped with `stats.mgf`) for blocks that return SymPy-computed symbolic expressions. Fields: `serialized` (LaTeX string), `freeVars` (bound variable names). (`13a1760`)
- **`DistributionPayload` convention** — documented in `docs/TYPES.md`: `parameters` discriminated union by family, eager closed-form `moments`, `support` typed union. Payload cast idiom. (`33a978e`)

### Operations (Phase 2)

- **`la.transpose`** — `Matrix<m,n> → Matrix<n,m>`. Polymorphic output type. Property tests: involution, shape reversal, `(A·B)ᵀ = BᵀAᵀ`. (`ed24132`)
- **`la.add`** — element-wise matrix addition; same shape required (typed error for mismatch). (`061f40a`)
- **`la.sub`** — element-wise matrix subtraction; same shape required. (`0ccaae9`)
- **`la.trace`** — sum of main diagonal; square-matrix only with typed error for non-square inputs. (`7704e07`)
- **`la.det`** — matrix determinant via math.js LU; square-matrix only. SymPy cross-engine fixture: `det(A·B) = det(A)·det(B)`. (`c50ade4`)
- **`la.inverse`** — matrix inverse with `SingularMatrixError` guard; square + full-rank required. (`eba6346`)
- **`la.rref`** — reduced row echelon form via partial-pivoting Gauss-Jordan. (`7cdcadc`)
- **`la.rank`** — matrix rank via non-zero row count of RREF output. (`74a34d0`)
- **`la.lu`** — LU decomposition with partial pivoting; outputs `L`, `U`, `P`. Property tests: `P·A = L·U`, L lower-triangular with unit diagonal, U upper-triangular. (`9f0fcea`)
- **`la.qr`** — QR decomposition via Householder reflections; outputs `Q`, `R`. Property tests: `A = Q·R`, `Qᵀ·Q = I`, R upper-triangular. (`f654d61`)
- **`la.eigen`** — eigendecomposition (real eigenvalues only); single `Tuple` output port `eigenpairs` wrapping `EigenPayload { eigenvalues: number[], eigenvectors: number[][] }`. Column k of the eigenvector matrix is the eigenvector for `eigenvalues[k]` (column-major layout, eigenvector-highlight-friendly). Throws `EigenError` for complex eigenvalues or eigenvector components. Square input only. (`5809167` + compute fix `d03f9ad`)
- **`la.solve`** — solves the linear system `Ax = b` via math.js `lusolve`; inputs `A: Matrix<n,n>`, `b: Vector<n>`, output `x: Vector<n>`. Throws `SolveError` if `|det(A)| < 1e-10` (singular guard) or if the system is otherwise inconsistent. (`fd1a9ec`)
- **`la.svd`** — singular value decomposition via `eigs(AᵀA)`; single `Tuple` output port `USV` wrapping `SvdPayload { U: Matrix<m,m>, S: Vector<min(m,n)>, V: Matrix<n,n> }`. U and V are orthogonal; S holds singular values in descending order. Reconstruction: `U·diag(S)·Vᵀ ≈ A`. Handles rank-deficient and rectangular (m≥n) inputs; U-orthogonality holds even when all singular values are zero. SymPy cross-engine fixture: 12 cases. (`d9d84cd`)
- **`la.basis-change`** — change of basis `P⁻¹·T·P`; inputs `T: Matrix<n,n>` (transformation in standard basis) + `P: Matrix<n,n>` (columns = new basis vectors); output `TPrime: Matrix<n,n>`. Similarity invariants preserved: `trace(T′) = trace(T)`, `det(T′) = det(T)`. Throws `BasisChangeError` for singular P. Property tests: 9 cases including identity basis, chained changes, and both invariants. (`552f5b4`)
- **`la.kernel`** — null space basis via RREF; input `A: Matrix<m,n>`; output `K: Matrix<n,k>` where k = nullity(A) = n − rank(A). Columns are basis vectors for ker(A). Returns `n×0` matrix when A has full column rank. Property tests verify `A·K ≈ 0` and rank-nullity theorem. Engine: native. (`0f2db97`)
- **`la.image`** — column space basis via RREF pivot columns; input `A: Matrix<m,n>`; output `B: Matrix<m,r>` where r = rank(A). Columns are pivot columns of A forming a basis for im(A). Returns `m×0` matrix for zero map. Property tests verify column count equals rank. Engine: native. (`5b0f444`)
- **`la.project`** — orthogonal projection `A·(AᵀA)⁻¹·Aᵀ·v`; inputs `A: Matrix<m,n>` (subspace basis, full column rank required) + `v: Vector<m>`; output `Pv: Vector<m>`. Property tests: idempotence `P(P·v) = P·v`, orthogonality `(v − P·v) ⊥ col(A)`. Throws if `AᵀA` is singular. (`e34f2c3`)

### Visualization (Phase 2)

- **`viz.unit-grid-3d`** — renders the unit cube [0,1]³ and its image under a 3×3 matrix M as an interactive 3D wireframe (react-three-fiber + @react-three/drei, OrbitControls). Basis arrows M·e₁/e₂/e₃ shown in distinct colors. Input: `M: Matrix<3,3>`; passthrough output for pipeline chaining. Four Storybook stories: identity, rotation-Z-45°, shear, scale. Dependencies added (pinned exact): `three@0.184.0`, `@react-three/fiber@9.6.1`, `@react-three/drei@10.7.7`, `@types/three@0.184.0`. (`cb64ca3`)
- **Eigenvector highlighting** — `EigenPreviewRenderer` added to `la.eigen` definition as `previewRenderer`. Renders SVG 2D arrows for 2×2 inputs and react-three-fiber 3D arrows for 3×3 inputs; text fallback for other sizes. Displayed in the inspector-preview section between the explanation tabs and the value strip. Introduced `BlockDefinition.previewRenderer?: ComponentType<{ value: MathValue }>` optional field. (`4cd42b4`)
- **Determinant area/volume animation** — `DetPreviewRenderer` added to `la.det` definition as `previewRenderer`. Renders an SVG parallelogram (2×2) or react-three-fiber parallelepiped (3×3) colored by sign: blue (positive), orange (negative, with orientation-flip label), red (zero/singular). Extended `previewRenderer` signature to include `inputs: ResolvedInputs` so the renderer can access the original matrix, not just the scalar det output. (`16ea77a`)

### Bug fixes / Phase-1 gap closures

- **React Flow event-handler wiring** — user-driven node drags, deletions, and edge-draws now flow into the Construction Protocol replay log. `useGraphStore` gained `onNodesChange` (emits `node-removed` + `node-moved` on drag-end) and `onEdgesChange` (emits `edge-removed`); all three canvas handlers are no-ops in replay mode to prevent the live log from being corrupted during scrubbing. (`db12d38`)

### Foundation (Shape polymorphism)

- **`la.vector`** — N-D real vector block (0–16 dimensions via `dim` parameter). Replaces `la.vector2`. Output type `Vector<"any">` at static registration; concrete `n` resolved at runtime from `dim`. (`be81b5d`)
- **`la.matrix`** — m×n real matrix block (up to 8×8 via `rows`/`cols` parameters). Replaces `la.matrix2x2`. (`934febd`)
- **`la.matvec` updated** — now polymorphic: `Matrix<m,n> × Vector<n> → Vector<m>` for arbitrary dimensions. Existing 2×2 tests continue to pass. (`31ca46b`)
- **`la.matmul` updated** — polymorphic `Matrix<m,k> × Matrix<k,n> → Matrix<m,n>` (was already polymorphic; tests extended for Phase 2 coverage). (`c2d841a`)
- **Seed graph migration** — `src/store/graph-store.ts` default graph updated from `la.vector2`/`la.matrix2x2` to `la.vector`/`la.matrix`. (`53efe0c`)
- **Template migration** — all three Phase 1 templates (rotation, shear, eigen-demo) rebuilt with `la.vector`/`la.matrix`. (`37ea8ea`)
- **URL `schemaVersion` 1 → 2** — `src/lib/graph-codec.ts` bumped. `migrateV1toV2` maps `la.vector2 {x,y}` → `la.vector {dim:2, c0, c1}` and `la.matrix2x2 {a,b,c,d}` → `la.matrix {rows:2, cols:2, r0c0…r1c1}`. Old shared URLs continue to open. (`9b92c6b`)
- **`la.vector2` / `la.matrix2x2` retired** — source files deleted, removed from block registry. Only knowledge of old IDs is in `graph-codec.ts` migrator. (`45d1ee0`)

### Testing infrastructure

- **SymPy fixture infrastructure** — `scripts/generate-sympy-fixtures.mjs` drives Pyodide offline and writes JSON to `tests/fixtures/sympy/`. `tests/sympy-reference.ts` provides typed loaders. `pnpm generate:fixtures` regenerates on demand. (`31ca46b`)
- **`la.vector` cross-engine tests** — `vector-sympy.test.ts` (46 cases): dot product and squared norm against `la-vector.json` SymPy fixtures; Cauchy-Schwarz property; perpendicular-pair check. (`31ca46b`)
- **`la.matrix` cross-engine tests** — `matrix-sympy.test.ts` (41 cases): A·B, A·v, Aᵀ, tr(A), det(A) for 1×1 through 4×4 square inputs and 2×3·3×2 non-square inputs. Involution, det(I)=1, trace linearity. (`31ca46b`)
- **Canvas event-handler e2e tests** — four Playwright tests (`e2e/canvas-event-wiring.spec.ts`) verify that node drags flow through `onNodesChange` into the Construction Protocol: URL hash updates after drag, scrubber max exceeds seed count, last step description contains "moved". Adds `data-testid="replay-step-description"` to `<ReplayBar />` as a stable test anchor. (`13fef11`)
- **`la.lu` / `la.qr` / `la.eigen` / `la.solve` cross-engine fixtures** — 8 LU cases, 8 QR cases, 8 eigen cases, 10 solve cases with typed loaders and cross-engine test files. LU note: P·A = L·U invariant verified (pivot strategies differ between engines). QR note: Q·R reconstruction and Qᵀ·Q orthogonality verified (column signs differ between engines). Eigen note: eigenvalues sorted before comparison; A·v = λ·v verified for all eigenpairs from both engines. (`a95df65`)
- **`la.basis-change` cross-engine fixture** — 7 cases (2×2/3×3/4×4, unimodular P). Tests: direct result match, trace/det similarity invariants, P·result·P⁻¹ = T round-trip. (`5999209`)
- **`la.matmul` / `la.matvec` cross-engine tests** — matmul: 9 cases (7 square + 2 non-square); matvec: 7 cases. Both use existing `la-matrix.json` fixture reference values. (`e1565f1`)
- **`la.kernel` cross-engine fixture** — 11 cases (full-rank, rank-deficient, all-zero, rectangular). Tests verify nullity count, `A·K ≈ 0` for SymPy and our kernel columns, rank-nullity theorem, trivial null space output shape. (`7c76040`)
- **`la.image` / `la.project` cross-engine fixtures** — `la.image`: 10 cases verifying column count = rank(A) and pivot-column identity. `la.project`: 10 cases (1D/2D subspaces of R²/R³/R⁴) verifying `P·v` against SymPy, idempotence `P(P·v) = P·v`, and `v − P·v ⊥ col(A)`. (`5fd15f8`)

### Performance

- **100-node performance gate** — linear-chain ~101-node wallclock guard added to `evaluator-perf.test.ts`. Threshold: 800 ms hard failure; 16.67 ms (60 fps frame budget) soft `console.warn`. Satisfies the Phase 2 exit criterion of 60 fps with 100 nodes on Mac Mini M4. (`ea13fd0`)

### Documentation

- `docs/TYPES.md` — Shape polymorphism documented: corrected `ConnectResult` signature, all four `unifyShape` cases, Phase 2 examples for `la.vector`, `la.matvec`, `la.matmul`, `la.transpose`, and square-matrix constraint pattern. (`7c4322a`)
- `docs/BLOCK_TAXONOMY.md` — `la.vector2`/`la.matrix2x2` marked retired; all Phase 2 blocks listed with type signatures and status markers. (`7cece91`)
- `docs/ROADMAP.md` — Phase 2 progress tracker added and checkboxes ticked for shipped items. (`e689cda`, `ae748e4`)
- `docs/TESTING.md` — SymPy fixture workflow, property testing pattern, `@cross-engine` tag convention, and `tests/arbitraries.ts` reference all documented. (`1071c9e`, `999596d`, `449b944`, `7d0eafe`)
- `docs/ARCHITECTURE.md` — Phase 2 drift fixed: `ConnectResult` type corrected, "zstd" → "deflate (fflate)", migration location corrected to `graph-codec.ts`, v1→v2 schema history added. (`c5c5209`)
- `docs/BLOCK_AUTHORING_GUIDE.md` — new: canonical pattern for adding a block, with `la.transpose` as the worked example; 8-item pre-commit checklist. (`decef3d`)
- `docs/TESTING.md` — `pnpm check:fixtures` guard documented: regenerate-and-diff workflow, when to run, what non-zero exit means. (`f9de82a`)
- `docs/ARCHITECTURE.md` — `useUiStore` workspace-scoped UI state pattern documented: UiState type, lifecycle distinction from graph/history stores, why workspace-scoped. (`199fc14`)
- `README.md` — updated to Phase 2 status with shipped block table and links to new docs. (`9e0c892`)
- `CHANGELOG.md` — initialized (this file). (`12f7cf3`)
- `docs/TESTING.md` — evaluator-perf wallclock guards documented: 25-node and 50-node wallclock fixtures, 16 ms/frame budget rationale, how to add a new threshold tier. (`fde5b82`)
- `docs/BLOCK_AUTHORING_GUIDE.md` — §3a Tuple convention table updated to confirm `la.qr` and `la.eigen` output port names and payload types; la.eigen `eigenpairs` port name reflected. (`97b6117`)

---

## [1.0.0] — 2026-05-03 — Phase 1: Matrix transformation pipeline

Phase 1 exit criteria met. A user can build a matrix transformation pipeline
from scratch, share it via URL, and replay the construction step-by-step.

### Added

**Blocks (Phase 1)**

- `core.constant` — literal scalar value with a MathLive inline editor.
- `core.scalar-input` — labelled scalar parameter, editable at runtime.
- `la.vector2` — 2D column vector `Vector<2, real>`.
- `la.matrix2x2` — 2×2 real matrix `Matrix<2, 2, real>`.
- `la.matvec` — matrix-vector product `Matrix<2,2> × Vector<2> → Vector<2>`.
- `la.matmul` — matrix-matrix product `Matrix<2,2> × Matrix<2,2> → Matrix<2,2>`.
- `viz.unit-grid` — Mafs-rendered unit grid with live linear transformation overlay.

**Type system**

- `MathValue` discriminated union: `Scalar`, `Vector<n>`, `Matrix<m,n>`, `Function`,
  `Expression`, `RandomVariable`, `Distribution`. Defined in `src/math/types.ts`.
- `canConnect(out, into): ConnectResult` in `src/editor/connections.ts` — type-checks
  connections at edit time using a shape-variable unifier.
- Field subtyping: `boolean ⊂ integer ⊂ rational ⊂ real ⊂ complex`.
- Precision propagation: `exact → approximate` permitted with a UI warning;
  `approximate → exact` is flagged at the node boundary.

**Engine**

- Reactive evaluator with topological sort, async streaming, and in-memory
  memoization keyed on `(blockId + inputHashes + paramsHash)`.
- math.js adapter (default) + Pyodide/SymPy worker scaffold (Comlink-typed RPC,
  lazy-loaded on first SymPy-requiring block).
- Three-layer cache: in-memory memoization, sessionStorage on idle, IndexedDB
  for SymPy results via idb-keyval.

**UI**

- React Flow canvas with custom `BlockNode`, typed handles, and connection
  rejection animation (shake + tooltip with reason).
- Right-rail inspector with four explanation tabs: What / Why / Effect / Impact.
- Resizable right rail (`useResizable` hook).
- Workspace-scoped UI store (panel state, theme).
- Brand token extensions: `focus-ring`, `soft-tint`, `block-*` palette tokens.
- `StateChip` for panel-level compute state (idle / computing / error / stale).

**Construction Protocol (replay timeline)**

- `useHistoryStore` records every graph mutation as a typed `ConstructionEvent`
  discriminated union: `node-added`, `node-removed`, `node-moved`, `params-updated`,
  `edge-added`, `edge-removed`, `graph-reset`.
- `projectGraph(events, step)` — pure reducer returning graph state at any step.
- `<ReplayBar />` in the bottom bar with play / pause / scrub at 400 ms per step.
- Canvas glow on nodes touched by the current replay step.
- `replaceGraph` synthesizes `graph-reset` + `node-added` + `edge-added` events so
  template loads produce a meaningful "watch it construct itself" replay.

**Sharing**

- URL-hash graph codec: JSON → fflate (zstd) → base64url, `schemaVersion: 1`.
- `useGraphSync` hook keeps the URL hash in sync with the graph store.

**Templates**

- "Rotation" — 2D rotation matrix applied to a unit vector.
- "Shear" — horizontal shear transformation.
- "Eigenvector demonstration" — 2×2 matrix with eigenvector overlay.

**Testing**

- Property-based tests (fast-check) for `la.matvec` and `la.matmul` cross-checked
  against a SymPy reference. `-0` normalization fixed for IEEE 754 consistency.
- Storybook stories for all 7 Phase 1 blocks.
- Playwright e2e: construction protocol round-trip, hello-block smoke test.

**Infrastructure**

- Next.js 16 App Router + React 19 + TypeScript 6 strict.
- Tailwind v4 + shadcn/ui (`new-york`).
- Biome for lint and format (replaces ESLint + Prettier).
- GitHub Actions CI: typecheck + lint + test + build.
- Vercel preview deploy on PR.
- ADR 0001: Next 16 + TypeScript 6 (accepted).
- ADR 0002: fflate for URL sharing (accepted).

### Architecture decisions

**ADR 0003 — Canvas paradigm** (opened and resolved 2026-05-03): evaluated an
inline-formula document model (Claude Design block-kit prototype) against the
existing typed-DAG canvas. Decided to stay DAG for Phase 2. The inline-formula
prototype is archived in `design-handoff/2026-05-02-block-kit/`; it may be
revisited for a read/share mode in a later phase. See `docs/adr/0003-canvas-paradigm.md`.

---

## [0.1.0] — 2026-05-02 — Phase 0: Bootstrap

Runnable app with full toolchain, one placeholder node, and CI green.

### Added

- Next.js app shell with Tailwind v4 tokens.
- React Flow canvas with placeholder node.
- math.js adapter and smoke test (`[[1,2],[3,4]] · [[5,6],[7,8]]`).
- Pyodide worker scaffold (loads on-demand, responds "ready").
- Zustand graph store with undo/redo skeleton.
- Vitest + fast-check + Playwright + Storybook configured.
- GitHub Actions CI pipeline.
- Vercel preview deploy on PR.
- `docs/` foundation: ROADMAP, ARCHITECTURE, TYPES, BLOCK_TAXONOMY, TESTING,
  DESIGN_PRINCIPLES, BRAND, PROJECT_VISION, CLAUDE_DESIGN_WORKFLOW.
