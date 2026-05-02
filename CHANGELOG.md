# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions map to phase milestones, not calendar releases.

---

## [Unreleased] — Phase 2: Linear algebra full

Shape polymorphism foundation shipped. `la.vector` and `la.matrix` replace the
fixed-size Phase 1 blocks. URL schema is at version 2 with a v1→v2 migrator for
old shared links. Eight operation blocks shipped: `la.transpose`, `la.add`, `la.sub`,
`la.trace`, `la.det`, `la.inverse`, `la.rref`, `la.rank`. SymPy fixture infrastructure
in place with cross-engine tests.
See `docs/ROADMAP.md` Phase 2 progress tracker.

### Operations (Phase 2)

- **`la.transpose`** — `Matrix<m,n> → Matrix<n,m>`. Polymorphic output type. Property tests: involution, shape reversal, `(A·B)ᵀ = BᵀAᵀ`. (`ed24132`)
- **`la.add`** — element-wise matrix addition; same shape required (typed error for mismatch). (`061f40a`)
- **`la.sub`** — element-wise matrix subtraction; same shape required. (`0ccaae9`)
- **`la.trace`** — sum of main diagonal; square-matrix only with typed error for non-square inputs. (`7704e07`)
- **`la.det`** — matrix determinant via math.js LU; square-matrix only. SymPy cross-engine fixture: `det(A·B) = det(A)·det(B)`. (`c50ade4`)
- **`la.inverse`** — matrix inverse with `SingularMatrixError` guard; square + full-rank required. (`eba6346`)
- **`la.rref`** — reduced row echelon form via partial-pivoting Gauss-Jordan. (`7cdcadc`)
- **`la.rank`** — matrix rank via non-zero row count of RREF output. (`74a34d0`)

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
