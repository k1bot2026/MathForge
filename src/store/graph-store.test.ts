import type { Edge, Node } from "@xyflow/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useGraphStore } from "./graph-store";

const initialState = useGraphStore.getState();

beforeEach(() => {
  useGraphStore.setState(initialState, true);
});

describe("graph-store", () => {
  test("seeds with one constant block node and zero edges", () => {
    const { nodes, edges, results, evalStatus } = useGraphStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.type).toBe("block");
    expect((nodes[0]?.data as { blockId?: string } | undefined)?.blockId).toBe("core.constant");
    expect(edges).toHaveLength(0);
    expect(results).toEqual({});
    expect(evalStatus).toBe("idle");
  });

  test("addNode appends the new node", () => {
    const node: Node = {
      id: "n2",
      type: "block",
      position: { x: 100, y: 0 },
      data: { blockId: "core.constant", params: { value: 5 } },
    };
    useGraphStore.getState().addNode(node);
    const { nodes } = useGraphStore.getState();
    expect(nodes).toHaveLength(2);
    expect(nodes[1]).toEqual(node);
  });

  test("connect adds the edge to the graph", () => {
    const edge: Edge = { id: "e1", source: "a", target: "b" };
    useGraphStore.getState().connect(edge);
    expect(useGraphStore.getState().edges).toEqual([edge]);
  });

  test("connect rejects duplicate edge ids", () => {
    const edge: Edge = { id: "e1", source: "a", target: "b" };
    const duplicate: Edge = { id: "e1", source: "x", target: "y" };
    const { connect } = useGraphStore.getState();
    connect(edge);
    connect(duplicate);
    const { edges } = useGraphStore.getState();
    expect(edges).toHaveLength(1);
    expect(edges[0]).toEqual(edge);
  });

  test("removeNode drops the node and any incident edges", () => {
    const a: Node = {
      id: "a",
      type: "block",
      position: { x: 0, y: 0 },
      data: { blockId: "core.constant", params: { value: 1 } },
    };
    const b: Node = {
      id: "b",
      type: "block",
      position: { x: 200, y: 0 },
      data: { blockId: "core.constant", params: { value: 2 } },
    };
    const edge: Edge = { id: "e-ab", source: "a", target: "b" };
    const store = useGraphStore.getState();
    store.addNode(a);
    store.addNode(b);
    store.connect(edge);
    expect(useGraphStore.getState().nodes).toHaveLength(3);

    useGraphStore.getState().removeNode("a");
    const { nodes, edges } = useGraphStore.getState();
    expect(nodes.find((n) => n.id === "a")).toBeUndefined();
    expect(edges).toHaveLength(0);
  });

  test("setResults turns the evaluator's Map into a plain record", () => {
    const map = new Map([
      [
        "x",
        {
          kind: "value" as const,
          value: {
            type: { kind: "Scalar" as const, field: "real" as const, precision: "exact" as const },
            payload: 7,
            provenance: {
              blockId: "core.constant",
              inputs: [],
              computedAt: 0,
              engine: "native" as const,
            },
          },
        },
      ],
    ]);
    useGraphStore.getState().setResults(map);
    const { results } = useGraphStore.getState();
    expect(results.x?.kind).toBe("value");
  });
});
