# Construction Protocol — Design

**Date:** 2026-05-02
**Owner:** Phase 1 stretch
**Status:** Approved (decisions confirmed via AskUserQuestion 2026-05-02)

## Goal

Let a viewer scrub through the construction history of a graph and see nodes light up in the order they were added. Per `docs/DESIGN_PRINCIPLES.md` Animation grammar: "Construction Protocol scrubs; affected nodes glow in order — 300–600 ms per step."

## Approved decisions

| Decision | Choice |
|---|---|
| Event model | Explicit event log (instrument store mutators) |
| Persistence | In-memory only this session |
| Playback | Scrub-anywhere + auto-play forward, 400 ms/step |
| UI surface | Bottom bar visible only in replay mode |

## Data model

### `ConstructionEvent` (discriminated union)

```ts
type ConstructionEvent =
  | { kind: "node-added";   node: NodeSnapshot;  at: number }
  | { kind: "node-removed"; nodeId: string;       at: number }
  | { kind: "node-moved";   nodeId: string; position: { x: number; y: number }; at: number }
  | { kind: "params-updated"; nodeId: string; params: ResolvedParams; at: number }
  | { kind: "edge-added";   edge: EdgeSnapshot;   at: number }
  | { kind: "edge-removed"; edgeId: string;       at: number }
  | { kind: "graph-reset";  reason: "seed" | "url-hash" | "template" | "user"; at: number };
```

`at` is `performance.now()` at capture time. Snapshots are deep-copied to prevent later mutations bleeding into history.

### Why explicit events, not snapshot diffing
The store has discrete mutators (`addNode`, `removeNode`, `connect`, `updateNodeParams`, `replaceGraph`). Each one's *intent* is unambiguous — diffing two snapshots cannot distinguish "param edited" from "node removed and re-added with same id". Lossless intent matters for the "nodes glow in order" contract.

### Where the log lives
A new `useHistoryStore` (Zustand) holds:
- `events: ConstructionEvent[]`
- `currentStep: number` — index into events; `events.slice(0, currentStep)` is the projected state
- `mode: "edit" | "replay"`
- `playing: boolean`

In-memory only. Reset on `replaceGraph` (which itself records a `graph-reset` event followed by synthesized `node-added`/`edge-added` for each node/edge in the new state — so loading a template gives a meaningful replay sequence).

## Projection

`projectGraph(events: ConstructionEvent[], step: number) → { nodes, edges, justAppearedIds }` is a pure function. Replays events `0..step` over an empty initial state, returning the resulting nodes/edges plus the ids touched by event `step-1` (for the glow).

Pure-function design = trivially unit-testable + deterministic + memoizable.

## UI

### Bottom bar (`<ReplayBar />`)

```
┌──────────────────────────────────────────────────────────────────┐
│ ▶ ┃ ●─────────●─────────●─────────●  step 3/8: matvec node added │
└──────────────────────────────────────────────────────────────────┘
```

- Slim height (~56 px); appears only when `mode === "replay"`.
- Play/pause button (Space toggles).
- Scrubber: drag the dot to step N. Click on a tick goes to that step.
- Step label: short description derived from the event (`"matrix-1 added"`, `"matvec-1 connected to vector-1"`, etc.).
- Respects `prefers-reduced-motion`: glow becomes a 1-frame highlight instead of an animated ramp.

### Replay-mode toggle

A button in the top-right of the canvas (consistent with the minimal top bar) toggles `mode`. When entering replay mode, `currentStep` resets to 0 (or stays where it was previously? — reset to 0 for predictability). When exiting, the canvas returns to the live editing graph.

### Canvas glow

In replay mode the canvas reads from the projection, not directly from `graph-store`. `justAppearedIds` get a `data-just-appeared` attribute; CSS handles the 400 ms ramp-up + soft border-glow per Animation grammar. `BlockNode` reads the attribute and applies the class.

## Test strategy

### Unit (Vitest)
- `construction-events.test.ts`: projection round-trips, edge cases (remove a non-existent node, params on a non-existent node, out-of-order edges).
- `history-store.test.ts`: pushEvent ordering, currentStep clamping, mode transitions.
- `graph-store.test.ts` (extended): each mutator emits the right event with the right payload.
- `use-graph-projection.test.ts`: hook returns the right projection for a given step; memoizes correctly.

### Component (Vitest + @testing-library/react)
- `replay-bar.test.tsx`: scrubber drag updates store; play button starts a 400 ms interval; pause stops it.

### E2E (Playwright)
- `tests/e2e/construction-protocol.spec.ts`:
  1. Open `/templates/rotation` (or seed page).
  2. Click replay-mode toggle.
  3. Verify ReplayBar visible; canvas shows zero nodes (step 0).
  4. Click play; verify nodes appear sequentially with `data-just-appeared` attributes.
  5. Scrub to step 2; verify exactly 2 nodes rendered.
  6. Toggle replay off; verify full graph restored.

## Out of scope

- Persisting history across sessions or to URL.
- Branching history / undo-redo trees.
- Replay of user-driven node drags (canvas doesn't currently wire `onNodesChange`; that's a separate gap).
- Mobile UI for the timeline (use desktop pattern; mobile is a Phase-1 stretch).
