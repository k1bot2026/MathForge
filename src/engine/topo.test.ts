import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { topoSort } from "./topo";

describe("topoSort", () => {
  test("empty graph", () => {
    expect(topoSort({ nodes: [], edges: [] })).toEqual({ ok: true, order: [] });
  });

  test("single node", () => {
    expect(topoSort({ nodes: [{ id: "a" }], edges: [] })).toEqual({ ok: true, order: ["a"] });
  });

  test("linear chain a → b → c", () => {
    const result = topoSort({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
      ],
    });
    expect(result).toEqual({ ok: true, order: ["a", "b", "c"] });
  });

  test("diamond a → {b, c} → d puts a before d", () => {
    const result = topoSort({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      edges: [
        { source: "a", target: "b" },
        { source: "a", target: "c" },
        { source: "b", target: "d" },
        { source: "c", target: "d" },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order[0]).toBe("a");
      expect(result.order[3]).toBe("d");
    }
  });

  test("self-loop is a cycle", () => {
    const result = topoSort({
      nodes: [{ id: "a" }],
      edges: [{ source: "a", target: "a" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.cycle).toEqual(["a"]);
  });

  test("two-node cycle", () => {
    const result = topoSort({
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect([...result.cycle].sort()).toEqual(["a", "b"]);
  });

  test("disconnected components both surface in the order", () => {
    const result = topoSort({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      edges: [
        { source: "a", target: "b" },
        { source: "c", target: "d" },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order).toHaveLength(4);
      expect(result.order.indexOf("a")).toBeLessThan(result.order.indexOf("b"));
      expect(result.order.indexOf("c")).toBeLessThan(result.order.indexOf("d"));
    }
  });

  test("edge referencing unknown node ids is silently skipped", () => {
    const result = topoSort({
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [
        { source: "a", target: "b" },
        { source: "a", target: "ghost" },
        { source: "phantom", target: "b" },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order).toEqual(["a", "b"]);
    }
  });

  test("three-node cycle is detected and all cycle members are reported", () => {
    const result = topoSort({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      edges: [
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "b" },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect([...result.cycle].sort()).toEqual(["b", "c"]);
    }
  });

  test("property: every edge points forward in the result order", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }).chain((n) => {
          const ids = Array.from({ length: n }, (_, i) => `n${i}`);
          const possibleEdges = ids.flatMap((s, si) =>
            ids.slice(si + 1).map((t) => ({ source: s, target: t })),
          );
          return fc
            .subarray(possibleEdges)
            .map((edges) => ({ nodes: ids.map((id) => ({ id })), edges }));
        }),
        (graph) => {
          const result = topoSort(graph);
          if (!result.ok) return; // by construction, all edges go from low to high index, no cycles
          const idx = new Map(result.order.map((id, i) => [id, i]));
          for (const edge of graph.edges) {
            expect(idx.get(edge.source)).toBeLessThan(idx.get(edge.target) ?? -1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
