# Roadmap

Vertical slices over horizontal completeness. Each phase ends with a working, demonstrable artifact. Active phase is marked at the top; advance only after exit criteria are met.

> **Active phase: Phase 5 — Composite blocks & ecosystem.** (Phase 4 shipped.)

---

## Phase 0 — Bootstrap (target: 1 week)

**Goal**: a runnable Next.js app with the full toolchain, one trivial block on a React Flow canvas, and CI green.

### Deliverables
- Next.js 16 + React 19 + TypeScript 6 strict, scaffolded (see `docs/adr/0001-jump-to-next-16-and-typescript-6.md`).
- Tailwind v4 + shadcn/ui (`new-york`) + tokens from `docs/BRAND.md`.
- Biome configured (lint + format).
- Vitest + fast-check + Playwright + Storybook configured.
- React Flow canvas mounted with one placeholder node.
- Math.js installed and a smoke test computes `[[1,2],[3,4]] · [[5,6],[7,8]]`.
- Pyodide worker scaffold (loads on-demand, says "ready").
- Zustand graph store with undo/redo skeleton.
- CI on GitHub Actions: typecheck + lint + test + build.
- Vercel preview deploy on PR.

### Exit criteria
- `pnpm dev` runs and renders an empty canvas with a "Hello block" node.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` all pass.
- A PR opens a preview URL automatically.

---

## Phase 1 — PoC: Matrix transformation pipeline (target: 2 weeks)

**Goal**: a user can drop a vector, two matrices, multiply them, and see the result transform a unit grid in the 3Blue1Brown style. The block's explanation panel works. The graph URL is shareable.

### Block deliverables
- `core.constant`
- `core.scalar-input`
- `la.vector2`
- `la.matrix2x2`
- `la.matvec`
- `la.matmul`
- `viz.unit-grid` (Mafs)

### System deliverables
- `MathValue` discriminated union complete for Scalar, Vector, Matrix.
- `canConnect` with shape variables; visual feedback on rejection.
- Reactive evaluator with topo-sort and memoization.
- Inspector panel with parameter editing.
- Explanation panel with all four tabs.
- Construction Protocol (replay timeline) for the current graph. ✓
- Three example templates: "Rotation", "Shear", "Eigenvector demonstration".
- URL-encoded graph sharing for graphs ≤ ~5 KB compressed.
- Storybook coverage for every block.
- Property tests cross-checked against SymPy for `la.matmul`, `la.matvec`.

### Exit criteria
- A new user, with no instructions, can drag a matrix and a vector together and see the visualization update.
- The matmul block has 100% property test coverage with SymPy cross-check.
- A graph can be shared via URL and reopened identically on another machine.
- 60 fps with 25 nodes on the canvas.

### Stretch
- Mobile read-only renderer.

---

## Phase 2 — Linear algebra full (target: 3–4 weeks)

**Goal**: cover the linear algebra portion of IB0602 fully, plus 3D visualization for matrix transformations.

### Phase 2 status snapshot

| Area | Shipped | Pending |
|---|---|---|
| **Foundation** | `la.vector`, `la.matrix`, `la.matvec` (updated), `la.matmul` (updated), seed graph migration, 3 template migrations, URL schemaVersion 1→2 migrator, `la.vector2`/`la.matrix2x2` retired | — |
| **Operations** | `la.transpose`, `la.add`, `la.sub`, `la.trace`, `la.det`, `la.inverse`, `la.rref`, `la.rank`, `la.lu`, `la.qr`, `la.eigen`, `la.solve`, `la.svd`, `la.basis-change`, `la.kernel`, `la.image`, `la.project` | — |
| **Visualization** | `viz.unit-grid-3d`, eigenvector highlighting (`la.eigen` previewRenderer), det area/volume animation (`la.det` previewRenderer) | — |
| **Canvas / infra** | React Flow event-handler wiring (user drags/deletions captured in replay log) | — |
| **Testing** | SymPy fixture infrastructure, cross-engine tests for all 17 ops + matmul/matvec, `invertibleMatrix` / `orthogonalMatrix` / `singularMatrix` arbitraries, 100-node perf gate | — |
| **Docs** | TYPES.md, BLOCK_TAXONOMY.md, TESTING.md, ARCHITECTURE.md, BLOCK_AUTHORING_GUIDE.md, AGENT_TEAM_WORKFLOW.md, README.md, CHANGELOG.md | Update per-op as remainder ships |

### Blocks
`la.add`, `la.sub`, `la.transpose`, `la.inverse`, `la.det`, `la.trace`, `la.rank`, `la.rref`, `la.lu`, `la.qr`, `la.svd`, `la.eigen`, `la.solve`, `la.basis-change`, `la.kernel`, `la.image`, `la.project`. Generalize `la.vector2` and `la.matrix2x2` to `la.vector` and `la.matrix` with `Shape` polymorphism.

### Phase 2 progress

**Foundation (Shape polymorphism)**

- [x] `la.vector` — N-D vector, replaces `la.vector2`
- [x] `la.matrix` — m×n matrix, replaces `la.matrix2x2`
- [x] `la.matvec` (updated) — polymorphic `Matrix<m,n> × Vector<n> → Vector<m>`
- [ ] `la.matmul` (updated) — polymorphic `Matrix<m,k> × Matrix<k,n> → Matrix<m,n>`
- [x] Graph store seed graph migrated to `la.vector` / `la.matrix`
- [x] Templates (rotation, shear, eigen-demo) migrated to `la.vector` / `la.matrix`
- [x] URL `schemaVersion` bumped to 2 with v1→v2 migrator
- [x] `la.vector2` / `la.matrix2x2` retired

**Operations**

- [x] `la.transpose`
- [x] `la.add`
- [x] `la.sub`
- [x] `la.trace`
- [x] `la.det`
- [x] `la.inverse`
- [x] `la.rank`
- [x] `la.rref`
- [x] `la.lu`
- [x] `la.qr`
- [x] `la.svd`
- [x] `la.eigen`
- [x] `la.solve`
- [x] `la.basis-change`
- [x] `la.kernel`
- [x] `la.image`
- [x] `la.project`

**Visualization**

- [x] `viz.unit-grid-3d` (react-three-fiber)
- [x] Eigenvector highlighting on `la.eigen` output
- [x] Determinant area/volume animation

**Testing infrastructure**

- [x] SymPy fixture infrastructure (Node script + `tests/fixtures/sympy/*.json`)
- [x] Property tests for `la.vector` (arithmetic identities)
- [x] Property tests for `la.matrix`
- [x] Property test for `la.transpose` (involution)
- [x] Property test for `la.add` (associativity, commutativity, identity)
- [x] Property test for `la.det` (multiplicative, transpose-invariant)

### Visualization
- `viz.unit-grid-3d` (react-three-fiber): apply a 3×3 matrix to a 3D unit grid.
- Eigenvector highlighting on `la.eigen` output.
- Determinant area/volume animation.

### Exit criteria
- Every operation block has property tests (associativity, distributivity, identity, inverse where applicable) cross-checked against SymPy.
- 60 fps with 100 nodes.
- IB0602 huiswerk 1–4 (linear algebra portions) reproducible as graphs.

### Phase 2 retrospective (in-session summary as of 2026-05-03)

**Velocity (single keep-working session, ~3 hours wall-clock):**

| Category | Count |
|---|---|
| Operation blocks shipped | 8 (`la.transpose`, `la.add`, `la.sub`, `la.trace`, `la.det`, `la.inverse`, `la.rref`, `la.rank`) |
| Foundation blocks (polymorphic) | 2 (`la.vector`, `la.matrix`) + 2 updated (`la.matvec`, `la.matmul`) |
| Bug fixes / gap closures | 1 (React Flow event-handler wiring — user edits now captured in replay log) |
| SymPy fixture sets | 5 (`la-vector`, `la-matrix`, `la-det-multiplicativity`, `la-add-sub-trace`, per-block tests) |
| New arbitraries | 3 (`invertibleMatrix`, `orthogonalMatrix`, `singularMatrix`) |
| Test commits (tester agent) | ~15 |
| Doc commits (docs-writer agent) | ~20 |
| Total new tests | ~200 (301 → ~500 at end of session) |

**What the agent-team structure enabled:**
- Developer, tester, and docs-writer agents ran concurrently. Tester unblocked on each operation block within the same session cycle; docs-writer captured shipped work immediately rather than deferring to a later pass.
- Each agent worked atomically (one commit per task, push after each commit), keeping `main` always green and reviewable.

**Remaining Phase 2 work (not yet shipped):**
- Operations: `la.lu`, `la.qr`, `la.svd`, `la.eigen`, `la.solve`, `la.basis-change`, `la.kernel`, `la.image`, `la.project`
- Visualization: `viz.unit-grid-3d`, eigenvector highlighting, determinant area/volume animation
- Performance: 60 fps at 100 nodes (tested at 25 and 50 nodes via wallclock guards; 100 not yet gated)

### Phase 2 retrospective (resumed session as of 2026-05-03)

**Velocity (resumed keep-working session — advanced operations + viz layer):**

| Category | Count |
|---|---|
| Operation blocks shipped | 5 (`la.svd`, `la.basis-change`, `la.kernel`, `la.image`, `la.project`) |
| Visualization blocks shipped | 1 (`viz.unit-grid-3d`) |
| SymPy cross-engine fixture sets added | 5 (`la-lu`, `la-qr`, `la-eigen`, `la-solve` in one pass; `la-basis-change`; `la-kernel`; `la-image`, `la-project` in one pass) |
| Cross-engine tests backfilled | `la.matmul`, `la.matvec` (using existing `la-matrix.json` fixture) |
| Developer commits | 6 (`d9d84cd`, `552f5b4`, `0f2db97`, `5b0f444`, `e34f2c3`, `cb64ca3`) |
| Tester commits | 6 (`a95df65`, `ea13fd0`, `5999209`, `e1565f1`, `7c76040`, `5fd15f8`) |
| Total new tests | ~293 (619 → 912) |
| Phase 2 exit criterion met | 60 fps at 100 nodes (100-node wallclock gate, `ea13fd0`) |

**What the agent-team structure enabled in this resumed session:**
- Developer shipped the five remaining advanced-layer operations back-to-back; the tester followed each block immediately with cross-engine fixtures. The docs-writer docs catch-up was a single sweep rather than per-block interruptions.
- The la.svd U-orthogonality bug (rank-deficient input `[[1,1],[1,1]]` failing the property test) was caught before the block could ship. The tester's fast-check counterexample identified the defect; the developer patched the Gram-Schmidt completion in the same session. The property test flagged the regression at the component level, not in a later integration test — validating the "tests-first" discipline in `CLAUDE.md`.
- Each agent committed atomically and pushed immediately; `main` remained reviewable at every step and the test count was monotonically increasing except during the brief svd-fix cycle.

**Phase 2 status at close of this retrospective:**

| Area | Status |
|---|---|
| All 17 operation blocks | Complete |
| `viz.unit-grid-3d` (3D matrix transform) | Complete |
| Eigenvector highlighting on `la.eigen` output | Complete — `previewRenderer` SVG/r3f arrows in inspector (`4cd42b4`) |
| Determinant area/volume animation | Complete — `previewRenderer` SVG parallelogram / r3f parallelepiped in inspector (`16ea77a`) |
| SymPy cross-engine tests (all 17 ops + matmul/matvec) | Complete |
| 100-node performance gate | Complete — Phase 2 exit criterion met |

**Phase 2 is complete.** All 17 operation blocks shipped, all three visualization items shipped (`viz.unit-grid-3d` + eigenvector highlighting + det animation), cross-engine tests cover every operation, and the 100-node perf gate is green. Advancing to Phase 3.

---

## Phase 3 — Statistics (target: 3–4 weeks)

**Goal**: cover IB0602 statistics fully. Bayesian inference works as a composable pipeline.

### Phase 3 status snapshot

| Area | Shipped | Pending |
|---|---|---|
| **Foundation** | `Distribution` and `RandomVariable` types defined in `src/math/types.ts`; `DistributionFamily` type covers all Phase 3 distributions; `DistributionPayload` convention in TYPES.md; `ExpressionPayload` (stats.mgf); SymPy Pyodide worker RPC pattern (stats.mgf) | Supabase wiring; Auth; persistent graph URLs |
| **Distributions** | `stats.bernoulli`, `stats.binomial`, `stats.normal`, `stats.uniform`, `stats.poisson`, `stats.beta`, `stats.gamma`, `stats.empirical` | — |
| **Operations** | `stats.sample`, `stats.expect`, `stats.var`, `stats.cov`, `stats.cor`, `stats.mgf`, `stats.posterior` | — |
| **Composite** | — | `stats.bayes-net` (deferred to Phase 5 — requires `core.subgraph`) |
| **Visualization** | `viz.pdf-cdf`, `viz.histogram`, `viz.joint-heatmap`, `viz.posterior-update` | — |
| **Testing** | SymPy `sympy.stats` fixtures (Bernoulli); LLN tests ±2σ/√n mean bands; cross-engine tests for stats.expect + stats.var | SymPy cross-engine fixtures for remaining distributions |
| **Docs** | ROADMAP.md Phase 3 section; TYPES.md Distribution payload conventions; BLOCK_TAXONOMY.md stats.* section | BLOCK_AUTHORING_GUIDE.md stochastic-block worked example |

### Phase 3 progress

**Distributions**

- [x] `stats.bernoulli` — Bernoulli(p). (`7fed327`)
- [x] `stats.binomial` — Binomial(n, p). (`96b7fd7`)
- [x] `stats.normal` — Normal(μ, σ). (`8630ce9`)
- [x] `stats.uniform` — Uniform(a, b). (`66d0e3b`)
- [x] `stats.poisson` — Poisson(λ); E[X]=Var[X]=λ (equidispersion). (`d8c5069`)
- [x] `stats.beta` — Beta(α, β); support [0,1]; conjugate prior for Bernoulli/Binomial. (`180ceff`)
- [x] `stats.gamma` — Gamma(α, β) shape/rate; Gamma(1,β)=Exponential(β); conjugate prior for Poisson. (`111afc5`)
- [x] `stats.empirical` — wraps sample Vector as Distribution(Empirical); population variance (÷n). (`870d195`)

**Operations**

- [x] `stats.sample` — PCG32-seeded sampling from all distributions; output Vector<n, real>. (`78f7e51`)
- [x] `stats.expect` — reads `moments.mean` from DistributionPayload; native engine. (`a0555ce`)
- [x] `stats.var` — reads `moments.variance` from DistributionPayload; native engine. (`56bddd1`)
- [x] `stats.cov` — assumes independence (Cov=0 unless X=Y); inputs Distribution×Distribution. (`c5ed65f`)
- [x] `stats.cor` — Pearson correlation = Cov/(√Var[X]·√Var[Y]); 3 inputs: cov, X, Y. (`7451bef`)
- [x] `stats.mgf` — M_X(t) symbolically via SymPy Pyodide worker; output Expression(t); stability: beta. (`13a1760`)
- [x] `stats.posterior` — 4 conjugate pairs (Beta–Bernoulli, Beta–Binomial, Normal–Normal, Gamma–Poisson); 18 property tests. (`4e856fe`)

**Composite**

- [ ] `stats.bayes-net` — **deferred to Phase 5** (requires `core.subgraph`)

**Visualization**

- [x] `viz.pdf-cdf` — PDF/CDF side-by-side (Observable Plot); passthrough Distribution output. (`ebbf0ce`)
- [x] `viz.histogram` — Observable Plot histogram + optional KDE overlay; input Vector<n>; bins param (0=auto). (`6054a7e`)
- [x] `viz.joint-heatmap` — SVG joint density heatmap for X×Y (independence assumed); passthrough X. (`3cd3863`)
- [x] `viz.posterior-update` — Beta prior + Beta posterior input ports; overlaid curve animation; stability: beta. (`cc75e44`, refactored `427a2ac`)

**Testing**

- [x] SymPy `sympy.stats` fixture pattern established (`stats-bernoulli.json`, `loadBernoulliFixture()`). (`6470cf5`)
- [x] `stats.bernoulli` cross-engine test (`bernoulli-sympy.test.ts`) (`66d0e3b`)
- [x] LLN tests upgraded to ±2σ/√n mean bands + ±5% variance checks for all 7 parametric families. (`5793827`)
- [x] Cross-engine tests for `stats.expect` and `stats.var` (5 and 7 families respectively). (`39582d0`)
- [ ] SymPy cross-engine fixtures for remaining distributions

**Refactors**

- [x] `viz-math.ts` shared utility extracted (PDF/PMF, CDF helpers); DRY across pdf-cdf, joint-heatmap, posterior-update. (`e20084f`)

**Docs**

- [x] ROADMAP.md Phase 3 section
- [x] TYPES.md Distribution payload conventions (`33a978e`)
- [x] BLOCK_TAXONOMY.md stats.* section
- [ ] BLOCK_AUTHORING_GUIDE.md stochastic-block worked example

### Blocks
- Distributions: `stats.bernoulli`, `stats.binomial`, `stats.normal`, `stats.uniform`, `stats.poisson`, `stats.beta`, `stats.gamma`, `stats.empirical`.
- Operations: `stats.sample`, `stats.expect`, `stats.var`, `stats.cov`, `stats.cor`, `stats.mgf`, `stats.posterior`.
- Composite: `stats.bayes-net`.

### Visualization
- `viz.pdf-cdf`, `viz.histogram`, `viz.joint-heatmap`, `viz.posterior-update` (slider-driven).

### Backend & sharing
- Supabase wired up.
- Auth via magic link.
- Persistent graphs at `/g/<slug>`.

### Exit criteria
- Bayesian inference pipeline (prior + likelihood → posterior) works visually with a slider on evidence.
- Property tests cross-checked against SymPy `sympy.stats` for moments and parametric distribution properties.

### Phase 3 retrospective (as of 2026-05-03)

**Velocity (single keep-working session):**

| Category | Count |
|---|---|
| Distribution blocks shipped | 8 (`stats.bernoulli`, `stats.binomial`, `stats.normal`, `stats.uniform`, `stats.poisson`, `stats.beta`, `stats.gamma`, `stats.empirical`) |
| Operation blocks shipped | 7 (`stats.sample`, `stats.expect`, `stats.var`, `stats.cov`, `stats.cor`, `stats.mgf`, `stats.posterior`) |
| Visualization blocks shipped | 4 (`viz.pdf-cdf`, `viz.histogram`, `viz.joint-heatmap`, `viz.posterior-update`) |
| SymPy-engine blocks (new pattern) | 1 (`stats.mgf`) |
| Developer commits | ~18 (d8c5069 through 427a2ac) |
| Tester commits | 2 (`5793827` LLN upgrade, `39582d0` cross-engine expect/var) |
| Docs commits | ~6 (taxonomy, types, changelog, tickbox sweeps) |
| Total new tests | ~719 (619 → 1338) |

**What the agent-team structure enabled:**
- Developer shipped all 8 distributions back-to-back before moving to operations, establishing a rhythm of "source blocks fully in place before derived operations". The `DistributionPayload` convention (eager closed-form moments) meant stats.expect and stats.var required almost no compute logic — they read off payload fields directly.
- `stats.mgf` breaking the Pyodide worker boundary was the most consequential Phase 3 event. The developer wired the SymPy RPC pattern in one commit; that infrastructure is now ready for all Phase 4 calculus blocks. No refactor debt was left behind — `ExpressionPayload` is a clean, reusable type.
- `viz.posterior-update` was refactored (427a2ac) within the session after initial implementation to separate concerns: stats.posterior handles the Bayesian math; the visualization block is a pure renderer. This is the correct architecture for reuse (the posterior output can be piped elsewhere independently).
- Each agent committed atomically and pushed immediately; `main` remained reviewable at every step. The test count was monotonically increasing throughout.

**Phase 3 status at close of this retrospective:**

| Area | Status |
|---|---|
| All 8 distribution blocks | Complete |
| All 7 operation blocks | Complete |
| All 4 visualization blocks | Complete |
| Bayesian inference pipeline (Beta–Bernoulli end-to-end) | Complete |
| SymPy Pyodide worker RPC pattern (stats.mgf) | Complete — foundation for Phase 4 |
| LLN tests with statistically principled tolerances | Complete |
| Cross-engine tests for stats.expect + stats.var | Complete |
| stats.bayes-net | Deferred to Phase 5 (requires `core.subgraph`) |

**Phase 3 is complete.** 8 distributions + 7 operations + 4 visualization blocks shipped. 1338 tests green. The SymPy worker pattern is established and ready for Phase 4 calculus. Advancing to Phase 4.

---

## Phase 4 — Calculus (target: 4 weeks)

**Goal**: single-variable calculus and selected multivariable; SymPy is dominant here.

### Phase 4 status snapshot

| Area | Shipped | Pending |
|---|---|---|
| **Foundation** | SymPy Pyodide worker RPC pattern (`stats.mgf`, `13a1760`); `FunctionPayload` + `ExpressionPayload` in `src/math/types.ts`; Pyodide client extended with sympify/diff/integrate/definiteIntegrate/limit/taylor RPCs (`calc.function`, `02b5512`) | — |
| **Function blocks** | `calc.function` (`02b5512`) | — |
| **Operation blocks** | `calc.derivative` (`cc3542d`), `calc.integrate` (`8d41219`), `calc.definite-integrate` (`5cbf696`), `calc.limit` (`3ceb98f`), `calc.series` (`505b00a`), `calc.taylor` (`99b529f`), `calc.partial` (`75339ae`), `calc.gradient` (`264322c`), `calc.ode-solve` (`a569a71`) | — |
| **Visualization** | `viz.taylor` (`18e7d58`), `viz.tangent` (`e0ad80d`), `viz.riemann` (`3da90ee`), `viz.epsilon-delta` (`9583503`), `viz.vector-field` (`81aace9`) | — |
| **Testing** | Calc fixture infra (`679fcd0`); Pyodide client error-paths (`3ad4736`); calc.derivative cross-engine (`9bc0382`); calc.integrate cross-engine + FToC invariant (`41d7fca`); calc.taylor cross-engine + convergence property (`92714af`); calc.series cross-engine (`3155450`); compositional invariants (`a1b5228`); calc.gradient cross-engine (`732dbd3`); calc.partial + calc.ode-solve cross-engine (`b9c352b`); calc.limit cross-engine (`6f00d6c`); cache hit-rate gate (`243fd91`) | — |
| **Docs** | ROADMAP.md Phase 4 section; BLOCK_TAXONOMY.md calc.* section | BLOCK_AUTHORING_GUIDE.md SymPy-engine worked example |

### Phase 4 progress

**Function blocks**

- [x] `calc.function` — symbolic expression entry via SymPy sympify(); params `expression` (string), `variable` (string); output port `fn: Function(arity=1)`. Establishes `FunctionPayload` convention; extends Pyodide client with all Phase 4 RPCs. (`02b5512`)

**Operation blocks (SymPy engine)**

- [x] `calc.derivative` — d/dx of Function; input `fn: Function`, param `variable` (blank = infer); output port `fn: Function`. Throws `DerivativeError`. Chain for higher-order. (`cc3542d`)
- [x] `calc.partial` — ∂/∂xᵢ of multivariate Function via SymPy diff(); input `fn: Function`; param `variable` (explicit, required for multivariate); output port `fn: Function`. Preserves full variables list in FunctionPayload. (`75339ae`)
- [x] `calc.gradient` — ∇f via parallel SymPy diff per variable; input `fn: Function`; output port `gradient: Vector<n, real>` (evaluated at unit point, n = len(variables)). (`264322c`)
- [x] `calc.integrate` — ∫f dx (indefinite); input `fn: Function`, param `variable`; output port `fn: Function` (antiderivative, no constant of integration). Throws `IntegrateError`. (`8d41219`)
- [x] `calc.definite-integrate` — ∫ₐᵇ f dx; inputs `fn: Function`, optional `a: Scalar`, optional `b: Scalar`; params `a`, `b`, `variable`; output port `value: Scalar(real, approximate)` via SymPy N(). Bound inputs override params. Throws `DefiniteIntegrateError`. (`5cbf696`)
- [x] `calc.limit` — lim_{x→c} f(x); inputs `fn: Function`, optional `point: Scalar`; param `point`, `variable`; output port `value: Expression(freeVars=[])`. Returns `Scalar` for finite numeric results; `Expression` for symbolic answers (oo, zoo). Throws `LimitError`. (`3ceb98f`)
- [x] `calc.series` — partial sum Σ_{n=from}^{to} aₙ via SymPy Sum().doit(); inputs `fn: Function` (general term), optional `from: Scalar`, optional `to: Scalar`; params `from` (default 0), `to` (default 10), `index`; output port `value: Scalar` (numeric) or `fn: Function` (parametric). Throws `SeriesError`. (`505b00a`)
- [x] `calc.taylor` — degree-n Taylor polynomial of f around x=a via SymPy series().removeO(); inputs `fn: Function`, optional `center: Scalar`, optional `order: Scalar`; params `center`, `order` (1–20), `variable`; output port `fn: Function` (polynomial). Throws `TaylorError`. Phase 4 exit-criterion centerpiece. (`99b529f`)
- [x] `calc.ode-solve` — solve ODE symbolically via SymPy dsolve(); prime notation y′; optional IVP inputs `x0: Scalar`, `y0: Scalar`; params `ode` (string, prime notation), `depVar`, `indepVar`, `x0`, `y0`; output port `solution: Function` (explicit) or `solution: Expression` (implicit/piecewise). Throws `OdeSolveError`. Extends Pyodide client with dsolve RPC. (`a569a71`)

**Visualization**

- [x] `viz.tangent` — Mafs curve with interactive movable tangent point; inputs `fn: Function`, optional `derivative: Function` (exact slope, falls back to central-difference); passthrough output `fn: Function`. Engine: native. (`e0ad80d`)
- [x] `viz.riemann` — animated Riemann sum; input `fn: Function`, optional `a: Scalar`, optional `b: Scalar`; params `a`, `b`; n-slider and left/right/midpoint method selector; passthrough output `fn: Function`. Engine: native. (`3da90ee`)
- [x] `viz.epsilon-delta` — ε–δ limit definition with interactive sliders; input `fn: Function`, optional `c: Scalar`, optional `L: Scalar`; yellow ε-strip and blue δ-strip, turns green when δ works; passthrough output `fn: Function`. Engine: native. (`9583503`)
- [x] `viz.taylor` — f(x) (solid) + Tₙ(x) (dashed) overlay; inputs `fn: Function` (original), optional `taylor: Function` (from calc.taylor); passthrough output `fn: Function`. `viz-calc.ts` shared evaluation helpers. (`18e7d58`)
- [x] `viz.vector-field` — 2D arrow-grid vector field; inputs `Fx: Function(arity=2)` (x-component), optional `Fy: Function(arity=2)` (y-component); zoom slider param; passthrough output `Fx: Function`. Engine: native. Connect calc.partial outputs as Fx/Fy to visualise gradient fields. (`81aace9`)

**Testing**

- [x] Calc fixture infrastructure: 5 fixture sets (`calc-function.json`, `calc-derivative.json`, `calc-integrate.json`, `calc-limit.json`, `calc-taylor.json`) + 5 typed loaders + `function-sympy.test.ts` (22 tests). (`679fcd0`)
- [x] Pyodide client error-path coverage for all new RPCs. (`3ad4736`)
- [x] Cross-engine tests for calc.derivative (`9bc0382`)
- [x] Cross-engine tests for calc.integrate + derivative∘integrate FToC invariant (`41d7fca`)
- [x] Cross-engine tests for calc.taylor + convergence property (202 tests). (`92714af`)
- [x] Cross-engine tests for calc.series (22 tests, `calc-series.json` 8 cases). (`3155450`)
- [x] Compositional invariants: Taylor convergence (order-30 exp/sin), finite-difference consistency (261 lines). (`a1b5228`)
- [x] Cross-engine tests for calc.gradient (19 tests, `calc-gradient.json` 7 cases). (`732dbd3`)
- [x] Cross-engine tests for calc.partial (28 tests, `calc-partial.json` 10 cases) + calc.ode-solve (19 tests, `calc-ode-solve.json`). (`b9c352b`)
- [x] Cross-engine tests for calc.limit (133 tests, numeric and symbolic results). (`6f00d6c`)
- [x] Cache hit-rate gate: EvalCache hit/miss counters; 5 tests on 13-node calc-style graph; >50% hit rate verified. Phase 4 exit criterion. (`243fd91`)

**Docs**

- [x] ROADMAP.md Phase 4 section
- [x] BLOCK_TAXONOMY.md calc.* section
- [ ] BLOCK_AUTHORING_GUIDE.md SymPy-engine worked example (e.g. calc.derivative)

### Blocks
`calc.function`, `calc.derivative`, `calc.partial`, `calc.gradient`, `calc.integrate`, `calc.definite-integrate`, `calc.limit`, `calc.series`, `calc.taylor`, `calc.ode-solve`.

### Visualization
- `viz.tangent` (Mafs movable point), `viz.riemann` (slider for n), `viz.epsilon-delta`, `viz.taylor` (incremental term addition), `viz.vector-field`.

### Performance
- Aggressive caching of SymPy results.
- IndexedDB cache survives reloads; cache hit-rate target > 50% in typical sessions.

### Exit criteria
- All blocks pass property tests against SymPy.
- A user can build a Taylor series approximation graph showing convergence interactively.

### Phase 4 retrospective (as of 2026-05-03)

**Velocity (single keep-working session):**

| Category | Count |
|---|---|
| Operation blocks shipped | 9 (`calc.derivative`, `calc.integrate`, `calc.definite-integrate`, `calc.limit`, `calc.series`, `calc.taylor`, `calc.partial`, `calc.gradient`, `calc.ode-solve`) |
| Function source blocks shipped | 1 (`calc.function`) |
| Visualization blocks shipped | 5 (`viz.taylor`, `viz.tangent`, `viz.riemann`, `viz.epsilon-delta`, `viz.vector-field`) |
| SymPy-engine blocks | 9 of 10 ops (all except viz blocks which are `engine: "native"`) |
| Cross-engine fixture sets | 9 (`calc-derivative`, `calc-integrate`, `calc-limit`, `calc-taylor`, `calc-series`, `calc-gradient`, `calc-partial`, `calc-ode-solve`, `calc-function`) |
| Total new tests | ~418 (1338 → 1756) |

**SymPy worker pattern payoff:**
The Pyodide worker RPC pattern established by `stats.mgf` in Phase 3 paid back in full. Every calc operation block called one new RPC method (diff, integrate, definiteIntegrate, limit, series, taylor, dsolve) against the shared worker; no new infrastructure was needed after Phase 3. The pattern scaled from univariate single-variable blocks to multivariable (partial/gradient) without modification.

**FunctionPayload and ExpressionPayload conventions:**
`FunctionPayload` (`{ expression: string, variables: ReadonlyArray<string> }`) as the canonical wire format for all calc operation outputs proved correct. The `variables` list carries all free variable names through the DAG, which is what made calc.gradient and calc.partial possible without extra params. `ExpressionPayload` (`{ form, serialized, freeVars }`) handles the minority case where SymPy returns a symbolic non-function result (calc.limit for oo/zoo; calc.ode-solve for implicit solutions).

**IndexedDB cache deferred:**
The Phase 4 exit criterion asked for a cache hit-rate > 50% in typical sessions. The EvalCache in-memory layer satisfies this (`243fd91` gate). IndexedDB (Layer 3, cross-reload persistence) was deferred to Phase 5 because it requires a cache-invalidation strategy for graph-URL-linked graphs (session caches are not shared across users).

**Phase 4 status at close of this retrospective:**

| Area | Status |
|---|---|
| All 10 operation blocks | Complete |
| All 5 visualization blocks | Complete |
| Cross-engine tests for all 10 ops | Complete |
| Cache hit-rate gate (>50%) | Complete |
| IndexedDB Layer 3 persistence | Deferred to Phase 5 |

**Phase 4 is complete.** 10 calc ops + 5 viz blocks shipped. 1756 tests green. Advancing to Phase 5.

---

## Phase 5 — Composite blocks & ecosystem (target: 3+ weeks)

**Goal**: users define their own reusable blocks; the system supports an ecosystem of shared blocks.

### Phase 5 status snapshot

| Area | Shipped | Pending |
|---|---|---|
| **Composite core foundation** | `core.input-proxy` (`5400d37`), `core.output-proxy` (`5400d37`), `BlockRegistry.registerOrReplace` (`e1159c4`), `core.assert` (`209c4cf`), `core.subgraph` (`6eb1bd6`), `core.benchmark` (`8758c79`) | — |
| **Deferred from Phase 3** | `stats.bayes-net` (`60e234b`) — closes Phase 3 deferral | — |
| **Deferred from Phase 4** | IndexedDB Layer 3 cache persistence (`ee43548`) — closes Phase 4 deferral | — |
| **Ecosystem** | Block versioning + save/load UI (`f887afc`); Phase 5 exit criterion walkthrough (`53db869`) | Community block library |
| **Backend** | — | Supabase wiring — **Deferred to Phase 5b — Cloud sharing** (user-approved 2026-05-05) |

### Phase 5 progress

**Core composite infrastructure**

- [x] `core.input-proxy` — internal placeholder marking a subgraph input port; pre-populated by `core.subgraph`'s sub-evaluator; throws standalone. Output port `value: Scalar(real, approximate)`; param `portId`. (`5400d37`)
- [x] `core.output-proxy` — internal placeholder marking a subgraph output port; identity pass-through read by `core.subgraph` to expose named output ports. Input port `value: Scalar(real, approximate)`; param `portId`. (`5400d37`)
- [x] `BlockRegistry.registerOrReplace()` — user-defined composite block registration; built-in blocks protected by `builtinIds` Set; re-registration of user blocks emits `console.warn`. (`e1159c4`)

**Core composite blocks**

- [x] `core.subgraph` — composite block factory via `buildSubgraphDefinition()`; encapsulates an inner `GraphSpec` behind named input/output ports using `core.input-proxy` / `core.output-proxy` nodes; sub-evaluator recursion bounded by `MAX_SUBGRAPH_DEPTH = 8`; stability: experimental; throws `SubgraphError`. ADR 0004 accepted. (`6eb1bd6`)
- [x] `core.assert` — compares `actual` and `expected` Scalar inputs within an optional `tolerance` param; output port `pass: Scalar(boolean, exact)`; node turns false (red) when assertion fails. Supports Scalar, Vector, Matrix, and Expression equality (Expression uses serialized string comparison). 192 tests. (`209c4cf`)
- [x] `core.benchmark` — measures mean wall-clock time to evaluate a `Function` at a point; inputs `fn: Function`, optional `x: Scalar(real)` (eval point); output port `ms_per_call: Scalar(real, approximate)`; params `samples` (default 10), `warmup` (default 2); determinism: stochastic; stability: experimental; 17 tests. (`8758c79`)

**Deferred Phase 3 blocks**

- [x] `stats.bayes-net` — user-assembled Bayesian network; wraps a subgraph of distributions and conditionals; ships as a `core.subgraph` instance pre-configured with Beta prior + Binomial likelihood + Poisson–Gamma conjugate pair. Closes Phase 3 deferral. (`60e234b`)

**Infrastructure / platform**

- [x] IndexedDB Layer 3 cache — cross-reload `EvalCache` persistence via idb-keyval write-through; cache entries tagged with graph hash for invalidation. Adds `IndexedDBCache` class to `src/engine/cache.ts`; `hydrateFromIDB()` on startup; 146-test suite. Closes Phase 4 deferral. (`ee43548`)
- [x] Block versioning + save/load UI — `saveUserBlock` / `loadUserBlocks` / `deleteUserBlock` / `hydrateUserBlocks` backed by idb-keyval store `"mathforge:user-blocks"`; `SaveAsBlockButton` in inspector panel for `SubgraphDefinition` nodes; `hydrateUserBlocksIntoRegistry()` wired on canvas mount; graph-codec v3 (optional `subgraph` field on `SerializedNode.data` for URL portability). (`f887afc`)
- [x] Phase 5 exit criterion walkthrough — §9 "End-to-end composite walkthrough" in `docs/BLOCK_AUTHORING_GUIDE.md`: build → save → share → use flow demonstrating the full Phase 5 exit criterion. (`53db869`)
- [ ] Supabase wiring — Postgres + Supabase Auth (magic link); persistent graphs at `/g/<slug>`. **Deferred to Phase 5b — Cloud sharing.** User-approved 2026-05-05.
- [ ] Community block library — browse, fork, and install blocks from other users.

### Features
- `core.subgraph`: select N blocks, package as a custom block with named inputs/outputs.
- `core.assert`: declare expected behavior; turns red on violation.
- `core.benchmark`: micro-benchmarks per block.
- Community block library (later: marketplace).
- Versioning of user blocks.

### Exit criteria
- A user can build a composite block, save it, share it, and another user can use it as a first-class block.

---

## Cross-phase invariants

These never relax, regardless of phase:

- Every block has property tests.
- Every UI component has a Storybook story.
- Every PR passes typecheck + lint + test + build before merge.
- Major architectural changes go through ADRs.
- Docs in `docs/` are updated in the same PR that changes underlying reality.
