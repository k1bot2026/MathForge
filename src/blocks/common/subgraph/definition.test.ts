import { describe, expect, test } from "vitest";
import { ConstantBlock } from "~/blocks/common/constant/definition";
import { InputProxyBlock } from "~/blocks/common/input-proxy/definition";
import { OutputProxyBlock } from "~/blocks/common/output-proxy/definition";
import { BlockRegistry } from "~/blocks/registry";
import type { GraphSpec } from "~/engine/graph-spec";
import type { MathValue } from "~/math/types";
import { buildSubgraphDefinition, MAX_SUBGRAPH_DEPTH, SubgraphError } from "./definition";
import type { SubgraphPayload } from "./types";

const ctx = { signal: new AbortController().signal };

function makeRegistry(): BlockRegistry {
  const r = new BlockRegistry();
  r.register(ConstantBlock);
  r.register(InputProxyBlock);
  r.register(OutputProxyBlock);
  return r;
}

function scalarValue(n: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: n,
    provenance: { blockId: "core.constant", inputs: [], computedAt: 0, engine: "native" },
  };
}

// Inner graph: core.constant(7) → core.output-proxy
const trivialInner: GraphSpec = {
  nodes: [
    { id: "c1", blockId: "core.constant", params: { value: 7 } },
    { id: "op1", blockId: "core.output-proxy", params: { portId: "result" } },
  ],
  edges: [{ id: "e1", source: "c1", sourcePort: "value", target: "op1", targetPort: "value" }],
};

const trivialPayload: SubgraphPayload = {
  inner: trivialInner,
  inputProxies: [],
  outputProxies: [{ proxyNodeId: "op1", portId: "result" }],
};

describe("buildSubgraphDefinition", () => {
  test("has correct metadata", () => {
    const r = makeRegistry();
    const def = buildSubgraphDefinition(
      "user.trivial",
      "Trivial",
      trivialPayload,
      [],
      [
        {
          id: "result",
          label: "result",
          type: { kind: "Scalar", field: "real", precision: "exact" },
        },
      ],
      r,
    );
    expect(def.id).toBe("user.trivial");
    expect(def.stability).toBe("experimental");
    expect(def.category).toBe("composite");
    expect(def.subgraph).toBe(trivialPayload);
  });

  test("trivial subgraph (constant → output-proxy) exposes the constant value", async () => {
    const r = makeRegistry();
    const def = buildSubgraphDefinition(
      "user.trivial",
      "Trivial",
      trivialPayload,
      [],
      [
        {
          id: "result",
          label: "result",
          type: { kind: "Scalar", field: "real", precision: "exact" },
        },
      ],
      r,
    );
    const result = await def.compute({}, {}, ctx);
    expect(result.payload).toBe(7);
  });

  test("subgraph with input-proxy forwards outer input into inner graph", async () => {
    // Inner: input-proxy → output-proxy (identity pass-through)
    const innerWithProxy: GraphSpec = {
      nodes: [
        { id: "ip1", blockId: "core.input-proxy", params: { portId: "x" } },
        { id: "op1", blockId: "core.output-proxy", params: { portId: "result" } },
      ],
      edges: [{ id: "e1", source: "ip1", sourcePort: "value", target: "op1", targetPort: "value" }],
    };
    const payload: SubgraphPayload = {
      inner: innerWithProxy,
      inputProxies: [{ proxyNodeId: "ip1", portId: "x" }],
      outputProxies: [{ proxyNodeId: "op1", portId: "result" }],
    };
    const r = makeRegistry();
    const def = buildSubgraphDefinition(
      "user.identity",
      "Identity",
      payload,
      [{ id: "x", label: "x", type: { kind: "Scalar", field: "real", precision: "exact" } }],
      [
        {
          id: "result",
          label: "result",
          type: { kind: "Scalar", field: "real", precision: "exact" },
        },
      ],
      r,
    );
    const input = scalarValue(99);
    const result = await def.compute({ x: input }, {}, ctx);
    expect(result).toBe(input);
  });

  test("throws SubgraphError when nesting depth exceeds limit", async () => {
    const r = makeRegistry();
    const def = buildSubgraphDefinition(
      "user.trivial",
      "Trivial",
      trivialPayload,
      [],
      [
        {
          id: "result",
          label: "result",
          type: { kind: "Scalar", field: "real", precision: "exact" },
        },
      ],
      r,
    );
    const deepCtx = { signal: new AbortController().signal, depth: MAX_SUBGRAPH_DEPTH + 1 };
    await expect(def.compute({}, {}, deepCtx)).rejects.toThrow(SubgraphError);
  });

  test("throws SubgraphError when inner output-proxy has no value", async () => {
    // Inner graph has output-proxy but no node connecting to it
    const brokenInner: GraphSpec = {
      nodes: [{ id: "op1", blockId: "core.output-proxy", params: { portId: "result" } }],
      edges: [],
    };
    const payload: SubgraphPayload = {
      inner: brokenInner,
      inputProxies: [],
      outputProxies: [{ proxyNodeId: "op1", portId: "result" }],
    };
    const r = makeRegistry();
    const def = buildSubgraphDefinition(
      "user.broken",
      "Broken",
      payload,
      [],
      [
        {
          id: "result",
          label: "result",
          type: { kind: "Scalar", field: "real", precision: "exact" },
        },
      ],
      r,
    );
    await expect(def.compute({}, {}, ctx)).rejects.toThrow(SubgraphError);
  });
});
