# ADR 0004: Composite blocks via `core.subgraph`

- **Status**: Accepted
- **Date**: 2026-05-03
- **Deciders**: k1bot, kw-developer

## Context

MathForge's evaluator (`src/engine/evaluator.ts`) walks a flat DAG of `NodeSpec` records, resolves each node via the `BlockRegistry`, and calls `definition.compute()`. Every block today is statically defined in TypeScript source and registered at boot time.

Phase 5 requires users to **package a selection of blocks into a reusable first-class block** — `core.subgraph`. The composite must:

1. Encapsulate N internal blocks behind a single named I/O surface visible to the outer graph.
2. Compose freely: a subgraph may contain other subgraphs (bounded depth to prevent infinite recursion).
3. Serialize losslessly alongside the outer graph (URL hash / future Supabase persistence).
4. Integrate with the existing type-checking connection validator (`canConnect`, `src/editor/connections.ts`) so that the composite's ports appear strongly typed.
5. Be registerable at runtime without recompiling — users define them in the browser and they appear in the block palette immediately.

Several constraints make the design non-trivial:

- `BlockRegistry.register()` today throws on duplicate IDs. Runtime-defined blocks change their definition by re-registration (user edits a composite), so the registry needs an upsert path.
- `SerializedNode.data` stores only `{ blockId, params? }`. A subgraph node must also carry its inner graph (`nodes`, `edges`, port mapping) inside the serialized form — the graph-codec needs a v3 schema and a v2→v3 migration that is a no-op for non-subgraph nodes.
- The evaluator's `gatherInputs` routes upstream values to `def.inputs`. A subgraph's `compute()` must run a **sub-evaluator** — a second recursive `evaluate()` call on the inner `GraphSpec` — and map outer edge connections to inner "input proxy" nodes and inner "output proxy" nodes to outer result ports.
- The connection validator needs the subgraph's compiled `InputPort[]` / `OutputPort[]` to do type-checking at connect time. These are derived from the inner graph's designated proxy nodes.

## Decision

**`core.subgraph` is a runtime-registered `BlockDefinition` whose `compute()` recursively calls `evaluate()` on an inner `GraphSpec` stored in the block's payload.**

Concretely:

### 1. Proxy nodes

`core.input-proxy` and `core.output-proxy` are registered as real `BlockDefinition`s in the `BlockRegistry`. Both carry `stability: "internal"` — a new value added to the `stability` union in `src/blocks/types.ts`. The UI palette filter hides `"internal"` blocks from the user-facing block list, while keeping the evaluator fully unaware of any special-casing (it treats them as ordinary blocks).

- **`core.input-proxy`**: zero inputs, one output port (`value`, any `MathType`). Its `compute()` reads the value from a `portId` param that the subgraph's outer `compute()` pre-populates as a virtual result in the sub-evaluator's result map. Carries a `portId: string` param identifying which outer input port it corresponds to.
- **`core.output-proxy`**: one input (`value`, any `MathType`), zero outputs. Its `compute()` is an identity pass-through. The subgraph's outer `compute()` reads the sub-evaluator's resolved result for the output-proxy node to obtain the composite's output for the corresponding port.

### 2. Payload and serialization

A subgraph block's definition extends `BlockDefinition`:

```ts
type SubgraphDefinition = BlockDefinition & {
  subgraph: {
    inner: GraphSpec;
    inputProxies: ReadonlyArray<{ proxyNodeId: string; portId: string }>;
    outputProxies: ReadonlyArray<{ proxyNodeId: string; portId: string }>;
  };
};
```

The `SubgraphDefinition` is serialized in `SerializedNode.data` as:

```ts
data: {
  blockId: "core.subgraph",
  params: { subgraphId: string },
  subgraph: SubgraphPayload;  // inline inner graph + proxy maps
}
```

This requires extending `SerializedNode` and bumping `GRAPH_SCHEMA_VERSION` to 3. The v2→v3 migration is a no-op: existing nodes lack a `subgraph` field, and `validateNode` accepts its absence.

### 3. Registry change

`BlockRegistry` gains a `registerOrReplace(definition)` method alongside `register()`. The existing `register()` retains its duplicate-throw semantics for static built-in blocks. `registerOrReplace()` is used only for user-defined composites. The registry tracks built-in IDs in a `Set<string>` populated at first `register()` call for each ID, preventing user blocks from overwriting built-ins. Replacing an existing user block emits a `console.warn`.

### 4. Evaluator change

When the evaluator encounters a `core.subgraph` node, it calls `def.compute(inputs, params, ctx)` as normal — no evaluator changes required. Inside `compute()`:

1. The outer `inputs` record is used to pre-populate result map entries for each input-proxy node (keyed by `proxyNodeId`) in the inner `GraphSpec`.
2. `evaluate({ graph: innerGraph, registry: outerRegistry, cache: new EvalCache(), signal: ctx.signal, depth: (ctx.depth ?? 0) + 1 })` is called.
3. The sub-evaluator's result for each output-proxy node's single input is read. Each output-proxy corresponds to one named output port on the outer `def.outputs`.
4. If the subgraph has one output port the result is returned directly; if multiple, `compute()` returns a `Tuple` MathValue only as a last resort — the preferred design is multiple named output ports (see §5).

Recursion depth: `EvalContext` gains an optional `depth?: number` field. At depth > 8, `compute()` throws `SubgraphError("Max subgraph nesting depth exceeded")`. The evaluator itself does not know about `depth` — it is passed through `ctx` opaquely.

### 5. Output port multiplicity — named ports, not Tuple

Multi-output subgraphs expose **multiple named output ports** on `def.outputs`, not a single `Tuple` port. Each output port maps 1-to-1 to one `core.output-proxy` node inside the inner graph. The proxy node carries a `portId` param that identifies its corresponding outer output port by name.

Rationale: Tuple outputs require a downstream `core.unpack` node, adding friction. Named ports let the user wire each output directly — consistent with how `la.lu`, `la.qr`, `la.svd`, and `la.eigen` work. The Tuple pattern in those blocks is tolerated as a legacy artifact, not expanded here.

### 6. Type system — I/O signature derivation

When a user saves a composite, the system inspects the `MathType` on the output port of each input-proxy node and the input port of each output-proxy node. These types become the `InputPort[]` / `OutputPort[]` on the outer `SubgraphDefinition`. The connection validator (`canConnect`) needs no changes — it already uses `def.inputs` / `def.outputs`.

Shape variables (e.g., `Vector<n>`) are preserved: if an input-proxy's output port is typed `Vector<n>`, the outer composite's input port is also typed `Vector<n>`.

### 7. Stability and `stats.bayes-net`

`core.subgraph` ships at `stability: "experimental"`. `stats.bayes-net` is implemented as a `core.subgraph` instance (not a hand-coded block) once `core.subgraph` is solid.

## Consequences

**Positive**

- Users gain a composable, strongly-typed block abstraction without introducing a new runtime layer. The evaluator's existing DAG-walk handles recursion transparently.
- All existing blocks, the connection validator, and the graph-codec extend incrementally — no flag day.
- `stats.bayes-net` becomes a configuration of `core.subgraph`, removing the need for a custom hand-coded composite block.
- Proxy nodes are ordinary registered blocks — the evaluator has no knowledge of subgraph internals, keeping `evaluator.ts` unchanged.
- Named output ports (not Tuple) keep the downstream wiring ergonomic and consistent with existing multi-output blocks.

**Trade-offs**

- Sub-evaluator creates a new `EvalCache` per invocation — no cache sharing across top-level evaluations of the same subgraph with the same inputs. Acceptable for Phase 5; deferred to Phase 6.
- `SerializedNode` grows a `subgraph?` field. The graph-codec validator adds a `validateSubgraphPayload()` path, adding complexity to `graph-codec.ts`. This is unavoidable.
- Nesting depth cap (8) is arbitrary. It prevents runaway recursion but means deeply nested user composites will error. Can be raised on explicit user request.
- `registerOrReplace()` can mask user errors (re-registering the wrong definition). Mitigated by the built-in ID protection and the `console.warn` on replacement.
- `stability: "internal"` proxy blocks appear in the registry but not the palette. Any consumer that lists registry contents without filtering must be updated to skip `"internal"` blocks.

**Re-evaluation trigger**

- When a user requests sharing/persistence of composites (Supabase Phase 5 backend) — inline subgraph serialization in `SerializedNode.data` may need to be split into a separate library document rather than inlined per-usage.
- When the sub-evaluator cache miss rate becomes measurable as a user-perceptible slowdown (> 100 ms per subgraph evaluation in profiling). At that point, introduce a shared subgraph result cache keyed on `(subgraphId + inputHashes)`.

## Alternatives considered

### A. Template substitution at deserialization

Flatten the composite at deserialization time: when loading a graph containing a `core.subgraph` node, expand it in-place into its constituent nodes before evaluation. Rejected: (1) loses type information — the outer graph's connection validator can no longer see the composite as a single typed port; (2) makes the serialized form graph-position-dependent; (3) editing a composite and re-using it elsewhere requires re-expanding all instances.

### B. JS-based macro expansion at evaluation

Store the composite as a JS closure captured at definition time. Rejected: (1) not serializable — closures cannot round-trip through JSON; (2) defeats the type system since the closure is opaque to `canConnect`; (3) prevents composites from being shared by URL hash or saved to Supabase.

### C. Separate composite runtime (interpreter-in-interpreter)

Build a distinct composite evaluator with its own node-walking logic, decoupled from `src/engine/evaluator.ts`. Rejected: duplicates the evaluator's cycle detection, error propagation, cache, and abort logic. The recursive `evaluate()` approach reuses all existing infrastructure with a single new code path in `compute()`.

### D. First-class graph type in `MathValue`

Add `kind: "Graph"` to `MathType` so a subgraph's inner graph is a `MathValue` that flows through edges like any other value. Rejected: a graph is a structural description of computation, not a mathematical value — introducing it to `MathValue` would pollute every piece of code that pattern-matches on `MathType`. The subgraph payload lives in `BlockDefinition`, not in the data plane.

### E. Tuple output ports

Multi-output composites return a `Tuple` MathValue from a single output port, requiring a downstream `core.unpack` node. Rejected per lead review: named ports are ergonomically superior and consistent with existing multi-output blocks. Tuple remains an internal implementation detail for blocks that predate this ADR.

## References

- `src/blocks/types.ts` — `BlockDefinition`, `InputPort`, `OutputPort`, `stability` union
- `src/blocks/registry.ts` — `BlockRegistry.register()`
- `src/engine/evaluator.ts` — `evaluate()`, `gatherInputs()`, `EvalContext`
- `src/engine/graph-spec.ts` — `GraphSpec`, `NodeSpec`
- `src/lib/graph-codec.ts` — `SerializedGraph`, `GRAPH_SCHEMA_VERSION`
- `docs/ARCHITECTURE.md` — evaluator + caching architecture
- ADR 0002 — fflate codec and `schemaVersion` versioning pattern
