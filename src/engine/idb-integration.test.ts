// fake-indexeddb must be imported before idb-keyval so its globals are in
// place when createStore() opens the database for the first time.
import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { BlockRegistry } from "~/blocks/registry";
import type { BlockDefinition } from "~/blocks/types";
import type { MathType, MathValue } from "~/math/types";
import { IndexedDBCache } from "./cache";
import { evaluate } from "./evaluator";
import type { EdgeSpec, GraphSpec, NodeSpec } from "./graph-spec";

// ── Lightweight block definitions (identical to cache-hit-rate.test.ts) ───────

const REAL: MathType = { kind: "Scalar", field: "real", precision: "approximate" };

function scalarValue(n: number, blockId: string): MathValue {
  return {
    type: REAL,
    payload: n,
    provenance: { blockId, inputs: [], computedAt: 0, engine: "native" },
  };
}

const sourceBlock: BlockDefinition = {
  id: "idb-test.source",
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
  compute: (_inputs, params) => scalarValue(Number(params.value ?? 1), "idb-test.source"),
  explain: { what: "Source.", why: "IDB integration test." },
};

const transformBlock: BlockDefinition = {
  id: "idb-test.transform",
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
    return scalarValue(v * f, "idb-test.transform");
  },
  explain: { what: "Transform.", why: "IDB integration test." },
};

function buildRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(sourceBlock);
  r.register(transformBlock);
  return r;
}

// 3-node linear graph: src → xfm1 → xfm2
const GRAPH: GraphSpec = {
  nodes: [
    { id: "src", blockId: "idb-test.source", params: { value: 7 } },
    { id: "xfm1", blockId: "idb-test.transform", params: { factor: 3 } },
    { id: "xfm2", blockId: "idb-test.transform", params: { factor: 5 } },
  ] as NodeSpec[],
  edges: [
    { id: "e1", source: "src", target: "xfm1", targetPort: "in" },
    { id: "e2", source: "xfm1", target: "xfm2", targetPort: "in" },
  ] as EdgeSpec[],
};

let session1Cache: IndexedDBCache;

beforeEach(() => {
  session1Cache = new IndexedDBCache();
  session1Cache.clear();
});

afterEach(async () => {
  // Drain pending void-idbSet promises before the next test starts
  await new Promise((r) => setTimeout(r, 0));
});

describe("IndexedDBCache + evaluate — cross-reload integration", () => {
  test("session 2 gets all cache hits after hydrate() from session 1", async () => {
    const registry = buildRegistry();

    // Session 1: warm-up — evaluate writes results through to IDB
    await evaluate({ graph: GRAPH, registry, cache: session1Cache });
    const statsSession1 = session1Cache.__getCacheStats();
    expect(statsSession1.hits).toBe(0);
    expect(statsSession1.misses).toBe(3); // src, xfm1, xfm2 all miss

    // Allow IDB writes to settle
    await new Promise((r) => setTimeout(r, 20));

    // Session 2: fresh instance (no in-memory data), hydrate from IDB
    const session2Cache = new IndexedDBCache();
    session2Cache.__resetCacheStats();
    await session2Cache.hydrate();

    // Verify IDB data was loaded into memory
    expect(session2Cache.size()).toBe(3);

    // Re-evaluate the identical graph — all 3 nodes must hit
    await evaluate({ graph: GRAPH, registry, cache: session2Cache });
    const statsSession2 = session2Cache.__getCacheStats();

    expect(statsSession2.misses).toBe(0);
    expect(statsSession2.hits).toBe(3);
  });

  test("session 2 without hydrate() has all cache misses (cold start)", async () => {
    const registry = buildRegistry();

    // Session 1: populate IDB
    await evaluate({ graph: GRAPH, registry, cache: session1Cache });
    await new Promise((r) => setTimeout(r, 20));

    // Session 2: fresh instance, no hydrate — all misses expected
    const session2Cache = new IndexedDBCache();
    session2Cache.__resetCacheStats();

    await evaluate({ graph: GRAPH, registry, cache: session2Cache });
    const stats = session2Cache.__getCacheStats();

    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(3);
  });

  test("session 2 correctly computes the same output values as session 1", async () => {
    const registry = buildRegistry();

    // Session 1: warm-up
    const results1 = await evaluate({ graph: GRAPH, registry, cache: session1Cache });
    await new Promise((r) => setTimeout(r, 20));

    // Session 2: hydrate and re-evaluate
    const session2Cache = new IndexedDBCache();
    await session2Cache.hydrate();
    const results2 = await evaluate({ graph: GRAPH, registry, cache: session2Cache });

    // src: 7, xfm1: 7 * 3 = 21, xfm2: 21 * 5 = 105
    const r1Xfm2 = results1.get("xfm2");
    const r2Xfm2 = results2.get("xfm2");
    expect(r1Xfm2?.kind).toBe("value");
    expect(r2Xfm2?.kind).toBe("value");
    if (r1Xfm2?.kind === "value" && r2Xfm2?.kind === "value") {
      expect(r2Xfm2.value.payload).toBe(r1Xfm2.value.payload);
      expect(r2Xfm2.value.payload).toBe(105);
    }
  });

  test("clear() before session 2 means hydrate() loads nothing", async () => {
    const registry = buildRegistry();

    // Session 1: populate IDB
    await evaluate({ graph: GRAPH, registry, cache: session1Cache });
    await new Promise((r) => setTimeout(r, 20));

    // Clear wipes both memory and IDB
    session1Cache.clear();
    await new Promise((r) => setTimeout(r, 20));

    // Session 2: hydrate should find nothing
    const session2Cache = new IndexedDBCache();
    await session2Cache.hydrate();

    expect(session2Cache.size()).toBe(0);

    // All 3 nodes miss
    session2Cache.__resetCacheStats();
    await evaluate({ graph: GRAPH, registry, cache: session2Cache });
    const stats = session2Cache.__getCacheStats();

    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(3);
  });
});
