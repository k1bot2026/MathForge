# Architecture

## High-level layers

```
┌────────────────────────────────────────────────────────────────┐
│  UI Layer (React 19 + Tailwind v4 + shadcn/ui)                 │
│  ─────────────────────────────────────────────────────────     │
│  Canvas (React Flow)  │  Inspector  │  Explanation panel       │
│  Block library        │  Replay timeline  │  Settings          │
└──────────────┬─────────────────────────────┬───────────────────┘
               │                             │
               ▼                             ▼
┌────────────────────────────┐   ┌──────────────────────────────┐
│  Graph State (Zustand)     │   │  UI State (Zustand)          │
│  - nodes, edges, types     │   │  - selection, hover           │
│  - undo/redo stack          │   │  - panels, theme             │
└──────────────┬─────────────┘   └──────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────┐
│  Evaluation Engine                                             │
│  ─────────────────────────────────────────────────────────     │
│  • Topological sort of DAG                                     │
│  • Memoization keyed on (block-id + input-hashes)              │
│  • Async by default; results stream into nodes                 │
│  • Type validation at boundaries (Zod)                         │
└──────────────┬─────────────────────────────┬───────────────────┘
               │                             │
               ▼                             ▼
┌────────────────────────────┐   ┌──────────────────────────────┐
│  Math Adapter — math.js    │   │  Math Adapter — SymPy        │
│  Default, in-process       │   │  Heavy / symbolic            │
│  ~150 KB gzipped           │   │  Pyodide in Web Worker        │
│  Matrices, BigNumber,      │   │  Comlink RPC                 │
│  Fraction, simplify, diff  │   │  IndexedDB persistent cache  │
└────────────────────────────┘   └──────────────────────────────┘
```

## Data model

### MathValue (the universal currency)

Every wire between blocks carries a `MathValue` (see `docs/TYPES.md` for the full schema). Conceptually:

```
MathValue =
  | Scalar (real | complex | bool, exact | approx)
  | Vector<n, field>
  | Matrix<m, n, field>
  | Function (arity, domain, codomain)
  | Expression (free variables)
  | RandomVariable (distribution)
  | Distribution (family, parameters)
```

Every `MathValue` carries:
- a **type tag** (the discriminator),
- a **shape descriptor** (e.g. `{ m: 3, n: 4 }`),
- a **payload** (the actual data, possibly lazy / promise),
- a **provenance** (which block produced it, how, with what inputs — used for the explanation panel and replay).

### BlockDefinition (declarative manifests)

A block is **data**, not code. The runtime reads a `BlockDefinition` to know:
- input handles (with types),
- output handles (with types — possibly polymorphic in input shapes),
- `compute(inputs, ctx) → MathValue` (the actual operation),
- `explain` content templates (what / why / effect / impact),
- optional `visual` component for in-node preview,
- property-based test specs.

See `docs/BLOCK_TAXONOMY.md` for the full interface and examples.

## Reactive evaluation

The graph is a DAG. When any input changes (a constant edited, a connection added or removed), the engine:

1. Topologically sorts affected downstream nodes.
2. Recomputes them in order, awaiting async results.
3. Memoizes on `hash(blockId + inputHashes + paramsHash)`.
4. Streams partial results into the UI (skeleton states for in-flight async).

Cycles are forbidden in normal connections. An explicit `Iterate` block introduces controlled loops (fixed-point or n-iterations).

## Engine selection

Default routing:

- math.js → all matrix ops, basic algebra, real/complex scalar arithmetic, statistics moments, simple symbolic derivative/simplify.
- SymPy (Pyodide) → symbolic integration, limits, series, ODEs, advanced `sympy.stats`, anything with non-trivial symbolic manipulation.

Each block declares which engine it wants in its manifest. The router can fall back: if a math.js call fails or returns an approximation when a block requested exactness, escalate to SymPy.

## Web Worker / Pyodide

- Lazy load: Pyodide is *not* fetched on first paint. The first SymPy-requiring block triggers initialization with a visible "loading symbolic engine…" indicator and a progress bar.
- Comlink-typed RPC. Worker exposes a small surface: `evaluate(serializedExpr)`, `simplify(...)`, etc.
- Persistent cache in IndexedDB keyed by hash of the SymPy call. Cleared on engine version bump.
- One worker per session (memory).

## Caching

Three layers:

1. **In-memory memoization** (engine evaluator) — fast, reset on reload.
2. **Block-level cache** (Zustand → sessionStorage on idle) — survives accidental refresh.
3. **Heavy-compute cache** (IndexedDB via idb-keyval) — for SymPy results, persists across sessions.

Cache keys include engine version hashes; bumping a version invalidates correctly.

## Plugin architecture (domains as plugins)

```
src/blocks/
├── linear-algebra/    # plugin: registerLinearAlgebra(registry)
├── statistics/
├── calculus/
└── common/            # base blocks shared everywhere
```

Each domain exposes a `register(registry: PluginRegistry)` function. The registry tracks:
- block definitions,
- type extensions (e.g. statistics adds `Distribution` family enum),
- visualization components,
- documentation snippets.

Adding a new domain = new folder + register call in `src/blocks/index.ts`. **No core changes required.**

## Graph State / UI State

The project uses three Zustand stores. They are distinct in lifecycle, persistence, and responsibility.

### `useGraphStore` (`src/store/graph-store.ts`)

The source of truth for the graph itself: `nodes`, `edges`, the selected node id, and all graph-mutation actions (`addNode`, `removeNode`, `connect`, `updateNodeParams`, `replaceGraph`). Persisted to IndexedDB; survives reloads. Mutations emit side-effects into `useHistoryStore`.

### `useHistoryStore` (`src/store/history-store.ts`)

Append-only log of `ConstructionEvent` values. Used exclusively by the Construction Protocol (replay timeline). In-memory only — it does not survive a reload. See "Construction Protocol (replay timeline)" below.

### `useUiStore` (`src/store/ui-store.ts`)

Workspace-scoped UI state: the active explanation-panel tab and the inspector panel width. **In-memory only** — it is intentionally not persisted to IndexedDB or localStorage. Tab choice and panel width survive node selection changes within a session (workspace-scoped), but reset to defaults on reload.

```typescript
type UiState = {
  activeExplanationTab: "what" | "why" | "effect" | "impact";
  inspectorWidth: number;           // clamped to [320, 520], default 380
  setActiveExplanationTab: (tab: ExplanationTabId) => void;
  setInspectorWidth: (px: number) => void;
  reset: () => void;
};
```

This is distinct from `useGraphStore` (which owns the graph and its nodes) and `useHistoryStore` (which owns the event log). `useUiStore` owns nothing that affects computation — it is purely presentational state that the explanation panel and inspector rail subscribe to.

**Why workspace-scoped, not selection-scoped:** switching from node A to node B keeps the same active tab open. A user exploring the "Effect" tab on one block should not lose their place when they click a different block. The design-handoff document (`design-handoff/2026-05-02-explanation-panel/README.md §3`) established this lifecycle.

## Type-checking on connect

`src/editor/connections.ts` exports `canConnect(out: MathType, into: MathType): ConnectResult`.

```typescript
type ConnectResult =
  | { ok: true; bindings?: Record<string, number>; warning?: string }
  | { ok: false; reason: string };
```

React Flow's `<Handle isValidConnection={…}>` calls this at edit time. On failure the UI shakes the target handle, shows a tooltip with `reason`, and refuses the edge.

`bindings` carries any shape-variable assignments resolved during the check (e.g. connecting a concrete `Vector<3>` to a `Vector<{ var: "n" }>` slot returns `{ bindings: { n: 3 } }`). The evaluator uses these bindings when computing a block's polymorphic output type.

`warning` surfaces soft diagnostics that allow the connection but flag a concern — currently only "approximate value flowing into exact slot" (precision downgrade). The node shows a yellow indicator rather than refusing the edge.

The file also exports `unifyShape(out, into, dim)` for callers that need to check a single dimension — used by block manifests when resolving polymorphic output types at evaluator time.

For full detail on the unifier rules and Phase 2 examples (`la.matvec`, `la.matmul`, `la.transpose`), see `docs/TYPES.md` "Shape polymorphism in Phase 2".

## Persistence and sharing

- **Local-first.** Graph is autosaved to IndexedDB every 5 s.
- **URL serialization.** A graph encodes to JSON, deflate-compressed (fflate 0.8.2, see `docs/adr/0002-fflate-for-url-sharing.md`), then base64url-encoded into the URL hash. Handles graphs up to ~5 KB compressed.
- **Cloud (Phase 3+).** Larger graphs sync to Supabase with a slug; URL `/g/<slug>`. Read-only by default; auth-gated edit access.
- **Schema versioning.** Every encoded payload carries a `schemaVersion` integer. Migration functions live in `src/lib/graph-codec.ts` alongside the codec. Current version: 2. Version history: v1 (Phase 1, `la.vector2`/`la.matrix2x2`); v2 (Phase 2, `la.vector`/`la.matrix`). The v1→v2 migrator (`migrateV1toV2`) runs automatically in `decodeGraph` when it detects a v1 payload, so old shared URLs continue to open.

## Construction Protocol (replay timeline)

A separate `useHistoryStore` records every graph mutation as an explicit
`ConstructionEvent` discriminated union (`node-added`, `node-removed`,
`node-moved`, `params-updated`, `edge-added`, `edge-removed`,
`graph-reset`). The graph-store mutators (`addNode`, `removeNode`,
`connect`, `updateNodeParams`, `replaceGraph`) emit events as a side
effect of applying the mutation; intent is captured losslessly so the
replay UI can distinguish a param edit from a remove-then-re-add at
the same id.

`projectGraph(events, step)` is a pure reducer that returns the graph
state at any step plus the ids touched by the last applied event (drives
the canvas glow). The `<ReplayBar />` in the bottom bar drives play /
pause / scrub at 400 ms per step (centre of the 300–600 ms band in
`docs/DESIGN_PRINCIPLES.md`).

When `replaceGraph` is called (URL-hash hydration, future template
loads, programmatic resets), the history store is replaced with a
synthesized `graph-reset` followed by `node-added` and `edge-added`
events in array order, so loading a template gives a meaningful
"watch it construct itself" replay even though the user didn't build
it interactively. The seed graph is treated identically at module
load.

Replay state is in-memory only; the URL hash continues to encode only
the current snapshot, not the construction history. Persistent
shareable replays are deferred to Phase 3+ alongside Supabase.

## Performance budgets

- Initial JS bundle: < 250 KB gzip (without Pyodide).
- TTI on M1-class laptop: < 2 s.
- 60 fps on the canvas with up to 200 nodes; degrades gracefully beyond.
- SymPy first-call latency: < 2 s of perceived UI block (loading state must appear in < 100 ms).

## Error handling

- Engine errors never crash the UI. They surface as red-bordered nodes with a click-through explanation.
- Property test failures in development cause a console error and a Storybook visual regression.
- All async errors are caught at the engine boundary and converted to typed `EvalError`.

## Architectural Decision Records (ADRs)

Significant changes (changing the engine, swapping the editor library, redesigning types) require an ADR in `docs/adr/NNNN-title.md`. Format: context, decision, consequences. Number sequentially.
