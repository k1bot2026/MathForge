import type { Edge, Node } from "@xyflow/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useGraphStore } from "./graph-store";
import { useHistoryStore } from "./history-store";

const initialState = useGraphStore.getState();

beforeEach(() => {
  // Clear out the Phase-1 seed graph so each test starts from a clean
  // store; the "seeds with…" test below restores the original state
  // explicitly before asserting on it.
  useGraphStore.setState(
    { ...initialState, nodes: [], edges: [], results: {}, evalStatus: "idle" },
    true,
  );
});

describe("graph-store", () => {
  test("seeds with the Phase-2 demo (matrix + vector → matvec, matrix → unit-grid, plus a constant)", () => {
    useGraphStore.setState(initialState, true);
    const { nodes, edges, results, evalStatus } = useGraphStore.getState();
    expect(nodes).toHaveLength(5);
    const blockIds = nodes
      .map((n) => (n.data as { blockId?: string } | undefined)?.blockId)
      .filter(Boolean)
      .sort();
    expect(blockIds).toEqual(
      ["core.constant", "la.matrix", "la.matvec", "la.vector", "viz.unit-grid"].sort(),
    );
    expect(edges).toHaveLength(3);
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
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toEqual(node);
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
    expect(useGraphStore.getState().nodes).toHaveLength(2);

    useGraphStore.getState().removeNode("a");
    const { nodes, edges } = useGraphStore.getState();
    expect(nodes.find((n) => n.id === "a")).toBeUndefined();
    expect(edges).toHaveLength(0);
  });

  test("addNode pushes a node-added event to the history store", () => {
    useHistoryStore.getState().reset();
    const node: Node = {
      id: "n1",
      type: "block",
      position: { x: 0, y: 0 },
      data: { blockId: "core.constant", params: { value: 1 } },
    };
    useGraphStore.getState().addNode(node);
    const ev = useHistoryStore.getState().events.at(-1);
    expect(ev?.kind).toBe("node-added");
    if (ev?.kind === "node-added") expect(ev.node.id).toBe("n1");
  });

  test("removeNode pushes a node-removed event", () => {
    useHistoryStore.getState().reset();
    useGraphStore.getState().addNode({
      id: "n1",
      type: "block",
      position: { x: 0, y: 0 },
      data: {},
    });
    useGraphStore.getState().removeNode("n1");
    const ev = useHistoryStore.getState().events.at(-1);
    expect(ev?.kind).toBe("node-removed");
    if (ev?.kind === "node-removed") expect(ev.nodeId).toBe("n1");
  });

  test("connect pushes an edge-added event", () => {
    useHistoryStore.getState().reset();
    useGraphStore.getState().connect({ id: "e1", source: "a", target: "b" });
    const ev = useHistoryStore.getState().events.at(-1);
    expect(ev?.kind).toBe("edge-added");
  });

  test("connect on a duplicate id does NOT emit a second event", () => {
    useHistoryStore.getState().reset();
    useGraphStore.getState().connect({ id: "e1", source: "a", target: "b" });
    useGraphStore.getState().connect({ id: "e1", source: "x", target: "y" });
    expect(useHistoryStore.getState().events).toHaveLength(1);
  });

  test("updateNodeParams pushes a params-updated event", () => {
    useHistoryStore.getState().reset();
    useGraphStore.getState().addNode({
      id: "n1",
      type: "block",
      position: { x: 0, y: 0 },
      data: { blockId: "core.constant", params: { value: 1 } },
    });
    useGraphStore.getState().updateNodeParams("n1", { value: 7 });
    const ev = useHistoryStore.getState().events.at(-1);
    expect(ev?.kind).toBe("params-updated");
    if (ev?.kind === "params-updated") expect(ev.params).toEqual({ value: 7 });
  });

  test("replaceGraph synthesizes graph-reset + node-added + edge-added", () => {
    useHistoryStore.getState().reset();
    useGraphStore
      .getState()
      .replaceGraph(
        [{ id: "a", type: "block", position: { x: 0, y: 0 }, data: {} }],
        [{ id: "e", source: "a", target: "a" }],
      );
    const events = useHistoryStore.getState().events;
    expect(events.map((e) => e.kind)).toEqual(["graph-reset", "node-added", "edge-added"]);
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

  test("setNodes replaces the node array directly", () => {
    const nodes: Node[] = [{ id: "x", type: "block", position: { x: 0, y: 0 }, data: {} }];
    useGraphStore.getState().setNodes(nodes);
    expect(useGraphStore.getState().nodes).toEqual(nodes);
  });

  test("setEdges replaces the edge array directly", () => {
    const edges: Edge[] = [{ id: "e1", source: "a", target: "b" }];
    useGraphStore.getState().setEdges(edges);
    expect(useGraphStore.getState().edges).toEqual(edges);
  });

  test("setEvalStatus updates evalStatus", () => {
    useGraphStore.getState().setEvalStatus("running");
    expect(useGraphStore.getState().evalStatus).toBe("running");
    useGraphStore.getState().setEvalStatus("idle");
    expect(useGraphStore.getState().evalStatus).toBe("idle");
  });

  test("onNodesChange removes node and records event", () => {
    useHistoryStore.getState().reset();
    const node: Node = {
      id: "n1",
      type: "block",
      position: { x: 0, y: 0 },
      data: {},
    };
    useGraphStore.getState().addNode(node);
    useGraphStore.getState().onNodesChange([{ type: "remove", id: "n1" }]);
    expect(useGraphStore.getState().nodes.find((n) => n.id === "n1")).toBeUndefined();
    const ev = useHistoryStore.getState().events.at(-1);
    expect(ev?.kind).toBe("node-removed");
  });

  test("onNodesChange records node-moved when position change is not dragging", () => {
    useHistoryStore.getState().reset();
    const node: Node = {
      id: "n1",
      type: "block",
      position: { x: 0, y: 0 },
      data: {},
    };
    useGraphStore.setState({ nodes: [node] });
    useGraphStore
      .getState()
      .onNodesChange([{ type: "position", id: "n1", dragging: false, position: { x: 50, y: 75 } }]);
    const ev = useHistoryStore.getState().events.at(-1);
    expect(ev?.kind).toBe("node-moved");
    if (ev?.kind === "node-moved") {
      expect(ev.position).toEqual({ x: 50, y: 75 });
    }
  });

  test("onNodesChange does not record event for in-progress drag", () => {
    useHistoryStore.getState().reset();
    const node: Node = { id: "n1", type: "block", position: { x: 0, y: 0 }, data: {} };
    useGraphStore.setState({ nodes: [node] });
    useGraphStore
      .getState()
      .onNodesChange([{ type: "position", id: "n1", dragging: true, position: { x: 50, y: 75 } }]);
    expect(useHistoryStore.getState().events).toHaveLength(0);
  });

  test("onEdgesChange removes edge and records event", () => {
    useHistoryStore.getState().reset();
    useGraphStore.setState({ edges: [{ id: "e1", source: "a", target: "b" }] });
    useGraphStore.getState().onEdgesChange([{ type: "remove", id: "e1" }]);
    expect(useGraphStore.getState().edges).toHaveLength(0);
    const ev = useHistoryStore.getState().events.at(-1);
    expect(ev?.kind).toBe("edge-removed");
    if (ev?.kind === "edge-removed") {
      expect(ev.edgeId).toBe("e1");
    }
  });
});
