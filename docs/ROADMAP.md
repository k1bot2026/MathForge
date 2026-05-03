# Roadmap

Vertical slices over horizontal completeness. Each phase ends with a working, demonstrable artifact. Active phase is marked at the top; advance only after exit criteria are met.

> **Active phase: Phase 3 — Statistics.** (Phase 1 shipped. Phase 2 shipped.)

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

---

## Phase 4 — Calculus (target: 4 weeks)

**Goal**: single-variable calculus and selected multivariable; SymPy is dominant here.

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

---

## Phase 5 — Composite blocks & ecosystem (target: 3+ weeks)

**Goal**: users define their own reusable blocks; the system supports an ecosystem of shared blocks.

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
