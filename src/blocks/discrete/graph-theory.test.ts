import { describe, expect, test } from "vitest";
import type { GraphPayload, MatrixPayload } from "~/math/types";
import { AdjacencyMatrixBlock } from "./adjacency-matrix/definition";
import { ColoringBlock } from "./coloring/definition";
import { ConnectedComponentsBlock } from "./connected-components/definition";
import { GraphBlock } from "./graph/definition";
import {
  connectedComponents,
  dijkstra,
  GraphError,
  greedyColoring,
  kruskal,
  makeGraph,
} from "./graph-theory";
import { MinimumSpanningTreeBlock } from "./minimum-spanning-tree/definition";
import { ShortestPathBlock } from "./shortest-path/definition";

const ctx = { signal: new AbortController().signal };

// Shared test graphs
function makeSquareGraph(): ReturnType<typeof makeGraph> {
  return makeGraph(
    [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
    [
      { from: "A", to: "B", weight: 1 },
      { from: "B", to: "C", weight: 2 },
      { from: "C", to: "D", weight: 3 },
      { from: "D", to: "A", weight: 4 },
      { from: "A", to: "C", weight: 5 },
    ],
    false,
    true,
  );
}

function makeDisconnectedGraph(): ReturnType<typeof makeGraph> {
  return makeGraph(
    [{ id: "0" }, { id: "1" }, { id: "2" }, { id: "3" }],
    [{ from: "0", to: "1" }],
    false,
    false,
  );
}

function makeTriangle(): ReturnType<typeof makeGraph> {
  return makeGraph(
    [{ id: "X" }, { id: "Y" }, { id: "Z" }],
    [
      { from: "X", to: "Y" },
      { from: "Y", to: "Z" },
      { from: "Z", to: "X" },
    ],
    false,
    false,
  );
}

// ──────────────────────────────────────────────────────────────────────
// dijkstra
// ──────────────────────────────────────────────────────────────────────

describe("dijkstra", () => {
  test("source dist = 0", () => {
    const g = makeSquareGraph();
    const dist = dijkstra(g.payload as GraphPayload, "A");
    expect(dist.get("A")).toBe(0);
  });

  test("nearest neighbor", () => {
    const g = makeSquareGraph();
    const dist = dijkstra(g.payload as GraphPayload, "A");
    expect(dist.get("B")).toBe(1);
  });

  test("shortest path via fewer edges wins over fewer hops", () => {
    // A→C directly is weight 5; A→B→C is weight 1+2=3
    const g = makeSquareGraph();
    const dist = dijkstra(g.payload as GraphPayload, "A");
    expect(dist.get("C")).toBe(3);
  });

  test("all vertices reachable from connected graph", () => {
    const g = makeSquareGraph();
    const dist = dijkstra(g.payload as GraphPayload, "A");
    for (const v of ["A", "B", "C", "D"]) {
      expect(dist.get(v)).toBeLessThan(Infinity);
    }
  });

  test("disconnected vertices have Infinity distance", () => {
    const g = makeDisconnectedGraph();
    const dist = dijkstra(g.payload as GraphPayload, "0");
    expect(dist.get("2")).toBe(Infinity);
    expect(dist.get("3")).toBe(Infinity);
  });
});

// ──────────────────────────────────────────────────────────────────────
// kruskal
// ──────────────────────────────────────────────────────────────────────

describe("kruskal", () => {
  test("MST has n-1 edges for connected graph", () => {
    const g = makeSquareGraph();
    const mst = kruskal(g.payload as GraphPayload);
    expect(mst.length).toBe(3);
  });

  test("MST uses lightest edges", () => {
    const g = makeSquareGraph();
    const mst = kruskal(g.payload as GraphPayload);
    const total = mst.reduce((s, e) => s + (e.weight ?? 1), 0);
    // lightest spanning tree: A-B(1) + B-C(2) + C-D(3) = 6
    expect(total).toBe(6);
  });

  test("MST of single vertex has 0 edges", () => {
    const g = makeGraph([{ id: "X" }], [], false, false);
    expect(kruskal(g.payload as GraphPayload).length).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// connectedComponents
// ──────────────────────────────────────────────────────────────────────

describe("connectedComponents", () => {
  test("connected graph: 1 component", () => {
    const g = makeSquareGraph();
    expect(connectedComponents(g.payload as GraphPayload).length).toBe(1);
  });

  test("disconnected graph: 3 components", () => {
    const g = makeDisconnectedGraph();
    // {0,1}, {2}, {3}
    expect(connectedComponents(g.payload as GraphPayload).length).toBe(3);
  });

  test("empty graph: 0 components", () => {
    const g = makeGraph([], [], false, false);
    expect(connectedComponents(g.payload as GraphPayload).length).toBe(0);
  });

  test("isolated vertices each form their own component", () => {
    const g = makeGraph([{ id: "A" }, { id: "B" }, { id: "C" }], [], false, false);
    expect(connectedComponents(g.payload as GraphPayload).length).toBe(3);
  });
});

// ──────────────────────────────────────────────────────────────────────
// greedyColoring
// ──────────────────────────────────────────────────────────────────────

describe("greedyColoring", () => {
  test("triangle needs 3 colors", () => {
    const g = makeTriangle();
    const colors = greedyColoring(g.payload as GraphPayload);
    const numColors = new Set(colors.values()).size;
    expect(numColors).toBe(3);
  });

  test("no two adjacent vertices have the same color", () => {
    const g = makeSquareGraph();
    const colors = greedyColoring(g.payload as GraphPayload);
    const gp = g.payload as GraphPayload;
    for (const edge of gp.edges) {
      expect(colors.get(edge.from)).not.toBe(colors.get(edge.to));
    }
  });

  test("empty graph needs 0 colors", () => {
    const g = makeGraph([], [], false, false);
    const colors = greedyColoring(g.payload as GraphPayload);
    expect(colors.size).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Block smoke tests
// ──────────────────────────────────────────────────────────────────────

describe("GraphBlock", () => {
  test("id is discrete.graph", () => expect(GraphBlock.id).toBe("discrete.graph"));

  test("default params produce a 4-vertex 3-edge graph", () => {
    const result = GraphBlock.compute(
      {},
      {
        directed: false,
        weighted: false,
        vertex_count: 4,
        edge_count: 3,
        v0: 0,
        v1: 1,
        v2: 2,
        v3: 3,
        e0_from: 0,
        e0_to: 1,
        e0_w: 1,
        e1_from: 1,
        e1_to: 2,
        e1_w: 1,
        e2_from: 2,
        e2_to: 3,
        e2_w: 1,
      },
      ctx,
    ) as import("~/math/types").MathValue;
    const g = result.payload as GraphPayload;
    expect(g.vertices.length).toBe(4);
    expect(g.edges.length).toBe(3);
  });

  test("output type is Graph", () => {
    const result = GraphBlock.compute(
      {},
      {
        directed: false,
        weighted: false,
        vertex_count: 2,
        edge_count: 1,
        v0: 0,
        v1: 1,
        e0_from: 0,
        e0_to: 1,
        e0_w: 1,
      },
      ctx,
    ) as import("~/math/types").MathValue;
    expect(result.type.kind).toBe("Graph");
  });
});

describe("AdjacencyMatrixBlock", () => {
  test("id is discrete.adjacency-matrix", () =>
    expect(AdjacencyMatrixBlock.id).toBe("discrete.adjacency-matrix"));

  test("triangle adjacency matrix is 3×3 symmetric", () => {
    const result = AdjacencyMatrixBlock.compute(
      { G: makeTriangle() },
      {},
      ctx,
    ) as import("~/math/types").MathValue;
    const mat = result.payload as MatrixPayload;
    expect(mat.length).toBe(3);
    expect(mat[0]?.length).toBe(3);
    // symmetric
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(mat[i]?.[j]).toBe(mat[j]?.[i]);
      }
    }
  });

  test("throws when G missing", () => {
    expect(() => AdjacencyMatrixBlock.compute({}, {}, ctx)).toThrow(GraphError);
  });
});

describe("ShortestPathBlock", () => {
  test("id is discrete.shortest-path", () =>
    expect(ShortestPathBlock.id).toBe("discrete.shortest-path"));

  test("distances from source 0 on numeric-ID graph", () => {
    // Use makeDisconnectedGraph() which has vertices with string IDs "0".."3"
    const result = ShortestPathBlock.compute(
      { G: makeDisconnectedGraph() },
      { source: 0 },
      ctx,
    ) as import("~/math/types").MathValue;
    expect(result.type.kind).toBe("Set");
    // Source vertex "0" is connected to "1" — distances should be [0, 1, -1, -1]
    const dists = (result.payload as import("~/math/types").SetPayload).map(
      (v) => v.payload as number,
    );
    expect(dists[0]).toBe(0);
    expect(dists[1]).toBe(1);
  });

  test("throws when G missing", () => {
    expect(() => ShortestPathBlock.compute({}, { source: 0 }, ctx)).toThrow(GraphError);
  });
});

describe("MinimumSpanningTreeBlock", () => {
  test("id is discrete.minimum-spanning-tree", () =>
    expect(MinimumSpanningTreeBlock.id).toBe("discrete.minimum-spanning-tree"));

  test("MST has n-1 edges for 4-vertex connected graph", () => {
    const result = MinimumSpanningTreeBlock.compute(
      { G: makeSquareGraph() },
      {},
      ctx,
    ) as import("~/math/types").MathValue;
    const g = result.payload as GraphPayload;
    expect(g.edges.length).toBe(3);
  });
});

describe("ConnectedComponentsBlock", () => {
  test("id is discrete.connected-components", () =>
    expect(ConnectedComponentsBlock.id).toBe("discrete.connected-components"));

  test("disconnected graph has 3 components", () => {
    const result = ConnectedComponentsBlock.compute(
      { G: makeDisconnectedGraph() },
      {},
      ctx,
    ) as import("~/math/types").MathValue;
    expect(result.payload as number).toBe(3);
  });
});

describe("ColoringBlock", () => {
  test("id is discrete.coloring", () => expect(ColoringBlock.id).toBe("discrete.coloring"));

  test("triangle needs 3 colors", () => {
    const result = ColoringBlock.compute(
      { G: makeTriangle() },
      {},
      ctx,
    ) as import("~/math/types").MathValue;
    expect(result.payload as number).toBe(3);
  });
});
