import type { Edge, Node } from "@xyflow/react";
import { describe, expect, test } from "vitest";
import { toGraphSpec } from "./graph-spec";

describe("toGraphSpec", () => {
  test("maps node id, blockId from data, and params from data", () => {
    const nodes: Node[] = [
      {
        id: "n1",
        type: "calc.derivative",
        position: { x: 0, y: 0 },
        data: { blockId: "calc.derivative", params: { variable: "x" } },
      },
    ];
    const result = toGraphSpec(nodes, []);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toEqual({
      id: "n1",
      blockId: "calc.derivative",
      params: { variable: "x" },
    });
  });

  test("falls back to node.type when data.blockId is absent", () => {
    const nodes: Node[] = [
      {
        id: "n1",
        type: "calc.function",
        position: { x: 0, y: 0 },
        data: {},
      },
    ];
    const result = toGraphSpec(nodes, []);
    expect(result.nodes[0]?.blockId).toBe("calc.function");
  });

  test("falls back to 'unknown' when both data.blockId and node.type are absent", () => {
    const nodes: Node[] = [
      {
        id: "n1",
        position: { x: 0, y: 0 },
        data: {},
      },
    ];
    const result = toGraphSpec(nodes, []);
    expect(result.nodes[0]?.blockId).toBe("unknown");
  });

  test("uses empty object for params when data.params is absent", () => {
    const nodes: Node[] = [
      {
        id: "n1",
        type: "calc.function",
        position: { x: 0, y: 0 },
        data: { blockId: "calc.function" },
      },
    ];
    const result = toGraphSpec(nodes, []);
    expect(result.nodes[0]?.params).toEqual({});
  });

  test("maps edge id, source, target without handles", () => {
    const edges: Edge[] = [
      {
        id: "e1",
        source: "n1",
        target: "n2",
      },
    ];
    const result = toGraphSpec([], edges);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]).toEqual({ id: "e1", source: "n1", target: "n2" });
  });

  test("includes sourcePort and targetPort when handles are present", () => {
    const edges: Edge[] = [
      {
        id: "e1",
        source: "n1",
        target: "n2",
        sourceHandle: "out",
        targetHandle: "fn",
      },
    ];
    const result = toGraphSpec([], edges);
    expect(result.edges[0]).toEqual({
      id: "e1",
      source: "n1",
      target: "n2",
      sourcePort: "out",
      targetPort: "fn",
    });
  });

  test("does not include sourcePort when sourceHandle is null", () => {
    const edges: Edge[] = [
      {
        id: "e1",
        source: "n1",
        target: "n2",
        sourceHandle: null,
        targetHandle: "fn",
      },
    ];
    const result = toGraphSpec([], edges);
    expect(result.edges[0]).not.toHaveProperty("sourcePort");
    expect(result.edges[0]).toHaveProperty("targetPort", "fn");
  });

  test("converts multiple nodes and edges in one call", () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: { blockId: "src", params: { v: 1 } } },
      { id: "b", position: { x: 0, y: 0 }, data: { blockId: "op", params: {} } },
    ];
    const edges: Edge[] = [{ id: "e1", source: "a", target: "b", targetHandle: "in" }];
    const result = toGraphSpec(nodes, edges);
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.targetPort).toBe("in");
  });

  test("empty input produces empty output", () => {
    const result = toGraphSpec([], []);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  test("data is undefined → falls back to type", () => {
    const nodes: Node[] = [
      {
        id: "n1",
        type: "la.matrix",
        position: { x: 0, y: 0 },
        data: undefined as unknown as Record<string, unknown>,
      },
    ];
    const result = toGraphSpec(nodes, []);
    expect(result.nodes[0]?.blockId).toBe("la.matrix");
  });
});
