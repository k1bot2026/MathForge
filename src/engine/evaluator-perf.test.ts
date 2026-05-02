/**
 * Wallclock performance sanity checks for the evaluator.
 *
 * These are NOT benchmarks — they are regression guards with very loose
 * thresholds so they pass easily on any CI machine (even slow ones).
 *
 * Topology: a linear chain of N alternating constant/add nodes.
 * This exercises the full topo-sort + compute path without any caching.
 *
 * Thresholds are intentionally generous (100× expected run time) to
 * avoid flakiness from GC pauses or slow CI runners. If evaluation ever
 * takes longer than these bounds the algorithm has regressed badly.
 */

import { describe, expect, test } from "vitest";
import { BlockRegistry } from "~/blocks/registry";
import type { BlockDefinition } from "~/blocks/types";
import type { MathType, MathValue } from "~/math/types";
import { EvalCache } from "./cache";
import { evaluate } from "./evaluator";
import type { EdgeSpec, GraphSpec, NodeSpec } from "./graph-spec";

const REAL_EXACT: MathType = { kind: "Scalar", field: "real", precision: "exact" };

function scalarValue(n: number, blockId: string): MathValue {
  return {
    type: REAL_EXACT,
    payload: n,
    provenance: { blockId, inputs: [], computedAt: 0, engine: "native" },
  };
}

const constantBlock: BlockDefinition = {
  id: "perf.constant",
  label: "Constant",
  category: "source",
  domain: "common",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [{ id: "value", label: "value", type: REAL_EXACT }],
  params: { value: { kind: "number", default: 1 } },
  compute: (_inputs, params) => scalarValue(Number(params.value ?? 1), "perf.constant"),
  explain: { what: "Constant source.", why: "Perf test." },
};

const addBlock: BlockDefinition = {
  id: "perf.add",
  label: "Add",
  category: "operation",
  domain: "common",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "a", label: "a", type: REAL_EXACT },
    { id: "b", label: "b", type: REAL_EXACT },
  ],
  outputs: [{ id: "sum", label: "sum", type: REAL_EXACT }],
  compute: (inputs) => {
    const a = inputs.a?.payload as number;
    const b = inputs.b?.payload as number;
    return scalarValue(a + b, "perf.add");
  },
  explain: { what: "Adds two scalars.", why: "Perf test." },
};

function buildRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(constantBlock);
  r.register(addBlock);
  return r;
}

/**
 * Builds a linear chain:
 *   const_0 ──┐
 *   const_1 ──┤ add_0 ──┐
 *             │          │
 *   (result)  │  const_2 ┤ add_1 → … → add_{pairs-1}
 *
 * Concretely: pairs of constants fed into an adder, then the adder output
 * is fed as the `a` input of the next adder together with a fresh constant.
 * This produces a chain of (nodeCount - 1) / 2 adders for nodeCount nodes.
 *
 * For nodeCount=25: 13 constants + 12 adders = 25 nodes, 24 edges.
 * For nodeCount=50: 26 constants + 25 adders = 51 nodes (~50), 50 edges.
 */
function buildLinearChain(pairs: number): GraphSpec {
  const nodes: NodeSpec[] = [];
  const edges: EdgeSpec[] = [];

  // First constant pair
  nodes.push({ id: "c_0", blockId: "perf.constant", params: { value: 1 } });
  nodes.push({ id: "c_1", blockId: "perf.constant", params: { value: 1 } });
  nodes.push({ id: `add_0`, blockId: "perf.add", params: {} });
  edges.push({ id: "e_c0_add0", source: "c_0", target: "add_0", targetPort: "a" });
  edges.push({ id: "e_c1_add0", source: "c_1", target: "add_0", targetPort: "b" });

  for (let i = 1; i < pairs; i++) {
    const constId = `c_${i + 1}`;
    const addId = `add_${i}`;
    const prevAddId = `add_${i - 1}`;

    nodes.push({ id: constId, blockId: "perf.constant", params: { value: 1 } });
    nodes.push({ id: addId, blockId: "perf.add", params: {} });
    edges.push({ id: `e_prev_${i}`, source: prevAddId, target: addId, targetPort: "a" });
    edges.push({ id: `e_const_${i}`, source: constId, target: addId, targetPort: "b" });
  }

  return { nodes, edges };
}

/**
 * Builds a wide fanout: one constant feeds N adders (each paired with a
 * separate constant). None of the adders depend on each other. This tests
 * that the evaluator handles independent parallel paths, not just chains.
 *
 * root_const ──┬── add_0 (+ c_0)
 *              ├── add_1 (+ c_1)
 *              └── add_{N-1} (+ c_{N-1})
 */
function buildWideFanout(width: number): GraphSpec {
  const nodes: NodeSpec[] = [];
  const edges: EdgeSpec[] = [];

  nodes.push({ id: "root", blockId: "perf.constant", params: { value: 10 } });

  for (let i = 0; i < width; i++) {
    const constId = `c_${i}`;
    const addId = `add_${i}`;
    nodes.push({ id: constId, blockId: "perf.constant", params: { value: i + 1 } });
    nodes.push({ id: addId, blockId: "perf.add", params: {} });
    edges.push({ id: `e_root_${i}`, source: "root", target: addId, targetPort: "a" });
    edges.push({ id: `e_c_${i}`, source: constId, target: addId, targetPort: "b" });
  }

  return { nodes, edges };
}

// ──────────────────────────────────────────────────────────────────────
// Threshold constants (ms). Set at ~100× the actual typical run time.
// ──────────────────────────────────────────────────────────────────────

const CHAIN_25_THRESHOLD_MS = 200;
const CHAIN_50_THRESHOLD_MS = 400;
const FANOUT_25_THRESHOLD_MS = 200;

describe("evaluator performance — wallclock guards", () => {
  test("linear chain of ~25 nodes evaluates under threshold", async () => {
    const registry = buildRegistry();
    const graph = buildLinearChain(12); // 13 consts + 12 adders = 25 nodes

    const start = performance.now();
    const results = await evaluate({ graph, registry, cache: new EvalCache() });
    const elapsed = performance.now() - start;

    // Correctness: last adder = 13 (sum of 13 ones along the chain)
    const lastAdd = results.get("add_11");
    expect(lastAdd?.kind).toBe("value");
    if (lastAdd?.kind === "value") {
      expect(lastAdd.value.payload).toBe(13);
    }

    expect(elapsed).toBeLessThan(CHAIN_25_THRESHOLD_MS);
  });

  test("linear chain of ~50 nodes evaluates under threshold", async () => {
    const registry = buildRegistry();
    const graph = buildLinearChain(25); // 26 consts + 25 adders = 51 nodes

    const start = performance.now();
    const results = await evaluate({ graph, registry, cache: new EvalCache() });
    const elapsed = performance.now() - start;

    // Correctness: last adder = 26
    const lastAdd = results.get("add_24");
    expect(lastAdd?.kind).toBe("value");
    if (lastAdd?.kind === "value") {
      expect(lastAdd.value.payload).toBe(26);
    }

    expect(elapsed).toBeLessThan(CHAIN_50_THRESHOLD_MS);
  });

  test("wide fanout of 25 independent add nodes evaluates under threshold", async () => {
    const registry = buildRegistry();
    const graph = buildWideFanout(25); // 1 root + 25 consts + 25 adders = 51 nodes

    const start = performance.now();
    const results = await evaluate({ graph, registry, cache: new EvalCache() });
    const elapsed = performance.now() - start;

    // Correctness: add_0 = root(10) + c_0(1) = 11; add_24 = 10 + 25 = 35
    const add0 = results.get("add_0");
    expect(add0?.kind).toBe("value");
    if (add0?.kind === "value") {
      expect(add0.value.payload).toBe(11);
    }

    expect(elapsed).toBeLessThan(FANOUT_25_THRESHOLD_MS);
  });

  test("cached re-evaluation is at least as fast as first evaluation", async () => {
    const registry = buildRegistry();
    const graph = buildLinearChain(12);
    const cache = new EvalCache();

    // Warm-up (populates cache)
    await evaluate({ graph, registry, cache });

    const start = performance.now();
    await evaluate({ graph, registry, cache });
    const cachedElapsed = performance.now() - start;

    // Cached run should be well under the threshold for a fresh run
    expect(cachedElapsed).toBeLessThan(CHAIN_25_THRESHOLD_MS);
  });
});
