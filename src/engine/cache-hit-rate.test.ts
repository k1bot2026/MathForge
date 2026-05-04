/**
 * Phase 4 exit criterion: IndexedDB cache hit-rate > 50% in typical sessions.
 *
 * Approach: builds a synthetic calc-style session graph (12 nodes simulating
 * calc.function → calc.derivative / calc.integrate / calc.limit chains with
 * shared upstream nodes). Runs the evaluator twice with the same shared cache:
 *
 *   Pass 1 (warm-up): all 12 nodes miss and compute.
 *   Pass 2 (no changes): all 12 nodes hit — hit rate = 100%.
 *   Pass 3 (leaf mutation): one leaf param changes, invalidating itself and its
 *             3 descendants. The 9 untouched upstream/sibling nodes hit.
 *             Hit rate = 9/12 = 75% > 50%.
 *
 * Hit rate is measured only on Pass 3 — the "re-evaluation after an edit"
 * scenario that dominates real sessions.
 *
 * The test uses lightweight synthetic blocks (no SymPy) so it runs in jsdom
 * without Pyodide. The cache keying logic is identical to the production path;
 * only the compute() bodies are trivial.
 */

import { describe, expect, test } from "vitest";
import { BlockRegistry } from "~/blocks/registry";
import type { BlockDefinition } from "~/blocks/types";
import type { MathType, MathValue } from "~/math/types";
import { EvalCache } from "./cache";
import { evaluate } from "./evaluator";
import type { EdgeSpec, GraphSpec, NodeSpec } from "./graph-spec";

const REAL: MathType = { kind: "Scalar", field: "real", precision: "approximate" };

function scalarValue(n: number, blockId: string): MathValue {
  return {
    type: REAL,
    payload: n,
    provenance: { blockId, inputs: [], computedAt: 0, engine: "native" },
  };
}

// ── Lightweight block definitions ──────────────────────────────────────────

/** Source block: emits its `value` param as a Scalar. */
const sourceBlock: BlockDefinition = {
  id: "cache-test.source",
  label: "Source",
  category: "source",
  domain: "calculus",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [{ id: "out", label: "out", type: REAL }],
  params: { value: { kind: "number", default: 1 } },
  compute: (_inputs, params) => scalarValue(Number(params.value ?? 1), "cache-test.source"),
  explain: { what: "Source.", why: "Cache test." },
};

/** Transform block: applies a fixed linear transform to a single input. */
const transformBlock: BlockDefinition = {
  id: "cache-test.transform",
  label: "Transform",
  category: "operation",
  domain: "calculus",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",
  inputs: [{ id: "in", label: "in", type: REAL }],
  outputs: [{ id: "out", label: "out", type: REAL }],
  params: { factor: { kind: "number", default: 2 } },
  compute: (inputs, params) => {
    const v = inputs.in?.payload as number;
    const f = Number(params.factor ?? 2);
    return scalarValue(v * f, "cache-test.transform");
  },
  explain: { what: "Transform.", why: "Cache test." },
};

/** Merge block: sums two inputs. */
const mergeBlock: BlockDefinition = {
  id: "cache-test.merge",
  label: "Merge",
  category: "operation",
  domain: "calculus",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "a", label: "a", type: REAL },
    { id: "b", label: "b", type: REAL },
  ],
  outputs: [{ id: "out", label: "out", type: REAL }],
  params: {},
  compute: (inputs) => {
    const a = inputs.a?.payload as number;
    const b = inputs.b?.payload as number;
    return scalarValue(a + b, "cache-test.merge");
  },
  explain: { what: "Merge.", why: "Cache test." },
};

function buildRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(sourceBlock);
  r.register(transformBlock);
  r.register(mergeBlock);
  return r;
}

/**
 * Builds a 12-node calc-style graph:
 *
 *   src_a ─── xfm_a1 ─── xfm_a2 ─── merge_ab ─── xfm_final
 *   src_b ─── xfm_b1 ─── xfm_b2 ───┘
 *   src_c ─── xfm_c1 ─── xfm_c2 (isolated branch — leaf)
 *   src_d ─── xfm_d1 (isolated single-step — leaf)
 *
 * Nodes: src_a, src_b, src_c, src_d, xfm_a1, xfm_a2, xfm_b1, xfm_b2,
 *        xfm_c1, xfm_c2, merge_ab, xfm_final = 12 nodes.
 *
 * The "main pipeline" is src_a → xfm_a1 → xfm_a2 → merge_ab → xfm_final (5 nodes)
 * and src_b → xfm_b1 → xfm_b2 → merge_ab (3 new nodes = 8 total).
 * Isolated branches: src_c → xfm_c1 → xfm_c2 (3 nodes) and src_d → xfm_d1 (1 node) = 12.
 *
 * Changing src_c only invalidates src_c, xfm_c1, xfm_c2 (3 nodes).
 * The remaining 9 nodes hit the cache.
 * Hit rate on re-evaluation = 9/12 = 75%.
 */
function buildGraph(srcCValue: number): GraphSpec {
  const nodes: NodeSpec[] = [
    { id: "src_a", blockId: "cache-test.source", params: { value: 10 } },
    { id: "src_b", blockId: "cache-test.source", params: { value: 20 } },
    { id: "src_c", blockId: "cache-test.source", params: { value: srcCValue } },
    { id: "src_d", blockId: "cache-test.source", params: { value: 5 } },
    { id: "xfm_a1", blockId: "cache-test.transform", params: { factor: 2 } },
    { id: "xfm_a2", blockId: "cache-test.transform", params: { factor: 3 } },
    { id: "xfm_b1", blockId: "cache-test.transform", params: { factor: 4 } },
    { id: "xfm_b2", blockId: "cache-test.transform", params: { factor: 2 } },
    { id: "xfm_c1", blockId: "cache-test.transform", params: { factor: 5 } },
    { id: "xfm_c2", blockId: "cache-test.transform", params: { factor: 2 } },
    { id: "xfm_d1", blockId: "cache-test.transform", params: { factor: 3 } },
    { id: "merge_ab", blockId: "cache-test.merge", params: {} },
    { id: "xfm_final", blockId: "cache-test.transform", params: { factor: 2 } },
  ];

  const edges: EdgeSpec[] = [
    { id: "e1", source: "src_a", target: "xfm_a1", targetPort: "in" },
    { id: "e2", source: "xfm_a1", target: "xfm_a2", targetPort: "in" },
    { id: "e3", source: "src_b", target: "xfm_b1", targetPort: "in" },
    { id: "e4", source: "xfm_b1", target: "xfm_b2", targetPort: "in" },
    { id: "e5", source: "xfm_a2", target: "merge_ab", targetPort: "a" },
    { id: "e6", source: "xfm_b2", target: "merge_ab", targetPort: "b" },
    { id: "e7", source: "merge_ab", target: "xfm_final", targetPort: "in" },
    { id: "e8", source: "src_c", target: "xfm_c1", targetPort: "in" },
    { id: "e9", source: "xfm_c1", target: "xfm_c2", targetPort: "in" },
    { id: "e10", source: "src_d", target: "xfm_d1", targetPort: "in" },
  ];

  // 13 nodes (src_a,b,c,d + xfm_a1,a2,b1,b2,c1,c2,d1 + merge_ab + xfm_final)
  return { nodes, edges };
}

describe("EvalCache hit-rate gate (Phase 4 exit criterion)", () => {
  test("hit-rate > 50% after single-leaf mutation in a 13-node session graph", async () => {
    const registry = buildRegistry();
    const cache = new EvalCache();

    // ── Pass 1: warm-up (all misses) ────────────────────────────────────
    const graph1 = buildGraph(30);
    await evaluate({ graph: graph1, registry, cache });
    const statsAfterWarmup = cache.__getCacheStats();
    expect(statsAfterWarmup.hits).toBe(0);
    expect(statsAfterWarmup.misses).toBeGreaterThan(0);

    // ── Pass 2: identical graph (should be all hits) ─────────────────────
    cache.__resetCacheStats();
    await evaluate({ graph: graph1, registry, cache });
    const statsPass2 = cache.__getCacheStats();
    expect(statsPass2.hits).toBeGreaterThan(0);
    expect(statsPass2.misses).toBe(0);

    // ── Pass 3: mutate src_c (isolated branch: src_c, xfm_c1, xfm_c2 miss)
    cache.__resetCacheStats();
    const graph3 = buildGraph(99); // src_c changed from 30 → 99
    await evaluate({ graph: graph3, registry, cache });
    const statsPass3 = cache.__getCacheStats();

    const total = statsPass3.hits + statsPass3.misses;
    const hitRate = statsPass3.hits / total;

    // src_c, xfm_c1, xfm_c2 miss (3 misses); 10 other nodes hit
    expect(statsPass3.misses).toBe(3);
    expect(statsPass3.hits).toBe(10);
    expect(hitRate).toBeGreaterThan(0.5);
  });

  test("hit-rate = 100% on identical re-evaluation (no mutations)", async () => {
    const registry = buildRegistry();
    const cache = new EvalCache();
    const graph = buildGraph(42);

    // Warm-up
    await evaluate({ graph, registry, cache });

    // Re-evaluate without any change
    cache.__resetCacheStats();
    await evaluate({ graph, registry, cache });
    const stats = cache.__getCacheStats();

    expect(stats.misses).toBe(0);
    expect(stats.hits / (stats.hits + stats.misses)).toBe(1.0);
  });

  test("hit-rate = 0% on first-ever evaluation (cold start)", async () => {
    const registry = buildRegistry();
    const cache = new EvalCache();
    const graph = buildGraph(1);

    await evaluate({ graph, registry, cache });
    const stats = cache.__getCacheStats();

    expect(stats.hits).toBe(0);
    expect(stats.misses).toBeGreaterThan(0);
  });

  test("mutating pipeline root invalidates all descendants but not siblings", async () => {
    const registry = buildRegistry();
    const cache = new EvalCache();

    // Warm-up
    await evaluate({ graph: buildGraph(30), registry, cache });

    // Mutate src_a (root of the 8-node main pipeline)
    // src_a, xfm_a1, xfm_a2, merge_ab, xfm_final should miss (5 misses)
    // src_b, xfm_b1, xfm_b2 share merge_ab so merge_ab misses too — covered
    // src_c, xfm_c1, xfm_c2, src_d, xfm_d1 should hit (5 hits)
    // src_b, xfm_b1, xfm_b2 hit too (3 hits) = 8 hits, 5 misses
    const graph2: GraphSpec = {
      nodes: buildGraph(30).nodes.map((n) =>
        n.id === "src_a" ? { ...n, params: { value: 999 } } : n,
      ),
      edges: buildGraph(30).edges,
    };

    cache.__resetCacheStats();
    await evaluate({ graph: graph2, registry, cache });
    const stats = cache.__getCacheStats();

    // 5 nodes in the main pipeline miss; 8 sibling/isolated nodes hit
    expect(stats.misses).toBe(5);
    expect(stats.hits).toBe(8);
    expect(stats.hits / (stats.hits + stats.misses)).toBeGreaterThan(0.5);
  });

  test("hit-rate exceeds 50% across a multi-step interactive session (3 leaf edits)", async () => {
    const registry = buildRegistry();
    const cache = new EvalCache();

    // Warm-up
    await evaluate({ graph: buildGraph(1), registry, cache });

    let totalHits = 0;
    let totalMisses = 0;

    // Three sequential leaf edits (each time only src_c changes)
    for (const v of [2, 3, 4]) {
      cache.__resetCacheStats();
      await evaluate({ graph: buildGraph(v), registry, cache });
      const s = cache.__getCacheStats();
      totalHits += s.hits;
      totalMisses += s.misses;
    }

    const sessionHitRate = totalHits / (totalHits + totalMisses);
    expect(sessionHitRate).toBeGreaterThan(0.5);
  });
});
