import { describe, expect, test } from "vitest";
import { BlockRegistry } from "~/blocks/registry";
import type { BlockDefinition } from "~/blocks/types";
import type { MathType, MathValue } from "~/math/types";
import { evaluate } from "./evaluator";
import type { GraphSpec } from "./graph-spec";

const REAL_EXACT: MathType = { kind: "Scalar", field: "real", precision: "exact" };

function scalarValue(n: number, blockId: string): MathValue {
  return {
    type: REAL_EXACT,
    payload: n,
    provenance: { blockId, inputs: [], computedAt: 0, engine: "native" },
  };
}

const constantBlock: BlockDefinition = {
  id: "test.constant",
  label: "Constant",
  category: "source",
  domain: "common",
  determinism: "pure",
  stability: "stable",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [{ id: "value", label: "value", type: REAL_EXACT }],
  params: { value: { kind: "number", default: 0 } },
  compute: (_inputs, params) => scalarValue(Number(params.value ?? 0), "test.constant"),
  explain: { what: "A constant.", why: "Source for the test graph." },
};

const addBlock: BlockDefinition = {
  id: "test.add",
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
    return scalarValue(a + b, "test.add");
  },
  explain: { what: "Adds two scalars.", why: "Test." },
};

const throwingBlock: BlockDefinition = {
  ...addBlock,
  id: "test.boom",
  compute: () => {
    throw new Error("boom!");
  },
};

const throwStringBlock: BlockDefinition = {
  ...addBlock,
  id: "test.throw-string",
  inputs: [],
  compute: () => {
    // eslint-disable-next-line no-throw-literal
    throw "string error";
  },
};

const throwObjectBlock: BlockDefinition = {
  ...addBlock,
  id: "test.throw-object",
  inputs: [],
  compute: () => {
    // eslint-disable-next-line no-throw-literal
    throw { code: 42 };
  },
};

const asyncBlock: BlockDefinition = {
  ...addBlock,
  id: "test.async",
  compute: async (inputs) => {
    await Promise.resolve();
    return scalarValue(((inputs.a?.payload as number) ?? 0) * 2, "test.async");
  },
  inputs: [{ id: "a", label: "a", type: REAL_EXACT }],
};

function buildRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(constantBlock);
  r.register(addBlock);
  r.register(throwingBlock);
  r.register(throwStringBlock);
  r.register(throwObjectBlock);
  r.register(asyncBlock);
  return r;
}

describe("evaluate", () => {
  test("constant(2) yields the value", async () => {
    const graph: GraphSpec = {
      nodes: [{ id: "c", blockId: "test.constant", params: { value: 2 } }],
      edges: [],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    const result = results.get("c");
    expect(result?.kind).toBe("value");
    if (result?.kind === "value") {
      expect(result.value.payload).toBe(2);
    }
  });

  test("constant(2) → constant(3) → add = 5", async () => {
    const graph: GraphSpec = {
      nodes: [
        { id: "c1", blockId: "test.constant", params: { value: 2 } },
        { id: "c2", blockId: "test.constant", params: { value: 3 } },
        { id: "add", blockId: "test.add", params: {} },
      ],
      edges: [
        { id: "e1", source: "c1", target: "add", targetPort: "a" },
        { id: "e2", source: "c2", target: "add", targetPort: "b" },
      ],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    expect(results.get("add")?.kind).toBe("value");
    if (results.get("add")?.kind === "value") {
      const r = results.get("add");
      if (r?.kind === "value") expect(r.value.payload).toBe(5);
    }
  });

  test("async block awaits before producing a result", async () => {
    const graph: GraphSpec = {
      nodes: [
        { id: "c", blockId: "test.constant", params: { value: 7 } },
        { id: "a", blockId: "test.async", params: {} },
      ],
      edges: [{ id: "e", source: "c", target: "a", targetPort: "a" }],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    const r = results.get("a");
    expect(r?.kind).toBe("value");
    if (r?.kind === "value") expect(r.value.payload).toBe(14);
  });

  test("missing required input → EvalError on the downstream node", async () => {
    const graph: GraphSpec = {
      nodes: [{ id: "add", blockId: "test.add", params: {} }],
      edges: [],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    const r = results.get("add");
    expect(r?.kind).toBe("error");
    if (r?.kind === "error") expect(r.error.message).toMatch(/Required input/);
  });

  test("unknown blockId → EvalError, siblings unaffected", async () => {
    const graph: GraphSpec = {
      nodes: [
        { id: "c", blockId: "test.constant", params: { value: 1 } },
        { id: "x", blockId: "test.does-not-exist", params: {} },
      ],
      edges: [],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    expect(results.get("c")?.kind).toBe("value");
    expect(results.get("x")?.kind).toBe("error");
  });

  test("compute() throwing → EvalError carrying the cause", async () => {
    const graph: GraphSpec = {
      nodes: [
        { id: "c1", blockId: "test.constant", params: { value: 1 } },
        { id: "c2", blockId: "test.constant", params: { value: 2 } },
        { id: "boom", blockId: "test.boom", params: {} },
      ],
      edges: [
        { id: "e1", source: "c1", target: "boom", targetPort: "a" },
        { id: "e2", source: "c2", target: "boom", targetPort: "b" },
      ],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    const r = results.get("boom");
    expect(r?.kind).toBe("error");
    if (r?.kind === "error") {
      expect(r.error.message).toBe("boom!");
      expect(r.error.cause).toBeInstanceOf(Error);
    }
  });

  test("upstream error propagates as a typed EvalError, not a thrown exception", async () => {
    const graph: GraphSpec = {
      nodes: [
        { id: "c1", blockId: "test.constant", params: { value: 1 } },
        { id: "c2", blockId: "test.constant", params: { value: 2 } },
        { id: "boom", blockId: "test.boom", params: {} },
        { id: "a3", blockId: "test.constant", params: { value: 4 } },
        { id: "add", blockId: "test.add", params: {} },
      ],
      edges: [
        { id: "e1", source: "c1", target: "boom", targetPort: "a" },
        { id: "e2", source: "c2", target: "boom", targetPort: "b" },
        { id: "e3", source: "boom", target: "add", targetPort: "a" },
        { id: "e4", source: "a3", target: "add", targetPort: "b" },
      ],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    expect(results.get("boom")?.kind).toBe("error");
    const downstream = results.get("add");
    expect(downstream?.kind).toBe("error");
    if (downstream?.kind === "error") {
      expect(downstream.error.message).toMatch(/not available/);
    }
  });

  test("memoization: same inputs hit the cache on the second call", async () => {
    const registry = new BlockRegistry();
    let computeCount = 0;
    const counted: BlockDefinition = {
      ...addBlock,
      id: "test.counted",
      compute: (inputs) => {
        computeCount += 1;
        const a = inputs.a?.payload as number;
        const b = inputs.b?.payload as number;
        return scalarValue(a + b, "test.counted");
      },
    };
    registry.register(constantBlock);
    registry.register(counted);
    const cache = new (await import("./cache")).EvalCache();
    const graph: GraphSpec = {
      nodes: [
        { id: "c1", blockId: "test.constant", params: { value: 4 } },
        { id: "c2", blockId: "test.constant", params: { value: 5 } },
        { id: "add", blockId: "test.counted", params: {} },
      ],
      edges: [
        { id: "e1", source: "c1", target: "add", targetPort: "a" },
        { id: "e2", source: "c2", target: "add", targetPort: "b" },
      ],
    };
    await evaluate({ graph, registry, cache });
    await evaluate({ graph, registry, cache });
    expect(computeCount).toBe(1);
  });

  test("cycle → every cycle node receives an EvalError 'Cycle detected'", async () => {
    const graph: GraphSpec = {
      nodes: [
        { id: "a", blockId: "test.constant", params: { value: 1 } },
        { id: "b", blockId: "test.constant", params: { value: 2 } },
      ],
      edges: [
        { id: "e1", source: "a", target: "b" },
        { id: "e2", source: "b", target: "a" },
      ],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    expect(results.get("a")?.kind).toBe("error");
    expect(results.get("b")?.kind).toBe("error");
    const ra = results.get("a");
    if (ra?.kind === "error") expect(ra.error.message).toBe("Cycle detected");
  });

  test("compute() throwing a string → message is the string", async () => {
    const graph: GraphSpec = {
      nodes: [{ id: "s", blockId: "test.throw-string", params: {} }],
      edges: [],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    const r = results.get("s");
    expect(r?.kind).toBe("error");
    if (r?.kind === "error") {
      expect(r.error.message).toBe("string error");
    }
  });

  test("compute() throwing a non-Error object → generic message", async () => {
    const graph: GraphSpec = {
      nodes: [{ id: "o", blockId: "test.throw-object", params: {} }],
      edges: [],
    };
    const results = await evaluate({ graph, registry: buildRegistry() });
    const r = results.get("o");
    expect(r?.kind).toBe("error");
    if (r?.kind === "error") {
      expect(r.error.message).toBe("compute() threw a non-Error value");
    }
  });

  test("aborted signal halts evaluation after the first node is processed", async () => {
    const _registry = buildRegistry();
    let computeCount = 0;
    const countedRegistry = new (await import("~/blocks/registry")).BlockRegistry();
    const countedConstant: BlockDefinition = {
      ...constantBlock,
      id: "test.counted-const",
      compute: (_inputs, params) => {
        computeCount++;
        return scalarValue(Number(params.value ?? 0), "test.counted-const");
      },
    };
    countedRegistry.register(countedConstant);

    const controller = new AbortController();
    // Abort immediately before evaluation so no nodes compute
    controller.abort();

    const graph: GraphSpec = {
      nodes: [
        { id: "c1", blockId: "test.counted-const", params: { value: 1 } },
        { id: "c2", blockId: "test.counted-const", params: { value: 2 } },
        { id: "c3", blockId: "test.counted-const", params: { value: 3 } },
      ],
      edges: [],
    };

    await evaluate({ graph, registry: countedRegistry, signal: controller.signal });
    // All nodes skipped due to pre-aborted signal
    expect(computeCount).toBe(0);
  });

  test("aborted signal mid-evaluation stops further processing", async () => {
    let computeCount = 0;
    const countedRegistry = new (await import("~/blocks/registry")).BlockRegistry();
    const controller = new AbortController();

    const countedConstant: BlockDefinition = {
      ...constantBlock,
      id: "test.counted-abort",
      compute: (_inputs, params) => {
        computeCount++;
        // Abort after first node computes
        if (computeCount === 1) controller.abort();
        return scalarValue(Number(params.value ?? 0), "test.counted-abort");
      },
    };
    countedRegistry.register(countedConstant);

    const graph: GraphSpec = {
      nodes: [
        { id: "c1", blockId: "test.counted-abort", params: { value: 1 } },
        { id: "c2", blockId: "test.counted-abort", params: { value: 2 } },
        { id: "c3", blockId: "test.counted-abort", params: { value: 3 } },
      ],
      edges: [],
    };

    await evaluate({ graph, registry: countedRegistry, signal: controller.signal });
    // Only the first node computed before abort
    expect(computeCount).toBe(1);
  });
});
