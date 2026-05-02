# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions map to phase milestones, not calendar releases.

---

## [Unreleased] — Phase 2: Linear algebra full

Shape polymorphism foundation in progress. `la.vector` and `la.matrix` replace
the fixed-size Phase 1 blocks; URL schema bumps to version 2 with a v1→v2
migrator. New operations: `la.transpose`, `la.add`, `la.sub`, `la.trace`,
`la.det`, and more to follow. See `docs/ROADMAP.md` Phase 2 progress tracker.

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
