import type { GraphEdgeSpec, GraphPayload, GraphVertex, MathValue } from "~/math/types";

export class GraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphError";
  }
}

export function makeGraph(
  vertices: ReadonlyArray<GraphVertex>,
  edges: ReadonlyArray<GraphEdgeSpec>,
  directed: boolean,
  weighted: boolean,
): MathValue {
  return {
    type: { kind: "Graph", directed, weighted },
    payload: { vertices, edges } satisfies GraphPayload,
    provenance: { blockId: "discrete.graph", inputs: [], computedAt: Date.now(), engine: "native" },
  };
}

/** Dijkstra shortest path. Returns distances from source vertex. */
export function dijkstra(graph: GraphPayload, sourceId: string): Map<string, number> {
  const dist = new Map<string, number>();
  const visited = new Set<string>();

  for (const v of graph.vertices) {
    dist.set(v.id, Infinity);
  }
  dist.set(sourceId, 0);
  if (!dist.has(sourceId)) {
    throw new GraphError(`dijkstra: source vertex '${sourceId}' not found`);
  }

  // Simple priority queue via sorted array (sufficient for small graphs)
  const queue: Array<{ id: string; dist: number }> = [{ id: sourceId, dist: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const current = queue.shift();
    if (current === undefined) break;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    for (const edge of graph.edges) {
      let neighbor: string | undefined;
      if (edge.from === current.id) {
        neighbor = edge.to;
      } else if (edge.to === current.id) {
        // undirected: traverse both directions
        neighbor = edge.from;
      }
      if (neighbor === undefined || visited.has(neighbor)) continue;
      const weight = edge.weight ?? 1;
      const newDist = (dist.get(current.id) ?? Infinity) + weight;
      if (newDist < (dist.get(neighbor) ?? Infinity)) {
        dist.set(neighbor, newDist);
        queue.push({ id: neighbor, dist: newDist });
      }
    }
  }

  return dist;
}

/** Kruskal minimum spanning tree. Returns edges in the MST. */
export function kruskal(graph: GraphPayload): ReadonlyArray<GraphEdgeSpec> {
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  function find(x: string): string {
    if (parent.get(x) === undefined) parent.set(x, x);
    const p = parent.get(x) ?? x;
    if (p !== x) {
      const root = find(p);
      parent.set(x, root);
      return root;
    }
    return x;
  }

  function union(a: string, b: string): boolean {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    const rankA = rank.get(ra) ?? 0;
    const rankB = rank.get(rb) ?? 0;
    if (rankA < rankB) {
      parent.set(ra, rb);
    } else if (rankA > rankB) {
      parent.set(rb, ra);
    } else {
      parent.set(rb, ra);
      rank.set(ra, rankA + 1);
    }
    return true;
  }

  for (const v of graph.vertices) {
    parent.set(v.id, v.id);
    rank.set(v.id, 0);
  }

  const sortedEdges = [...graph.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));
  const mst: GraphEdgeSpec[] = [];
  for (const edge of sortedEdges) {
    if (union(edge.from, edge.to)) {
      mst.push(edge);
    }
  }
  return mst;
}

/** Connected components via BFS. Returns array of vertex-id sets per component. */
export function connectedComponents(graph: GraphPayload): ReadonlyArray<ReadonlyArray<string>> {
  const visited = new Set<string>();
  const components: Array<string[]> = [];

  const adjacency = new Map<string, string[]>();
  for (const v of graph.vertices) {
    adjacency.set(v.id, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  for (const v of graph.vertices) {
    if (visited.has(v.id)) continue;
    const component: string[] = [];
    const queue = [v.id];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      const neighbors = adjacency.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    components.push(component.sort());
  }

  return components;
}

/** Greedy graph coloring (Welsh-Powell: sort vertices by degree descending). */
export function greedyColoring(graph: GraphPayload): Map<string, number> {
  const adjacency = new Map<string, Set<string>>();
  for (const v of graph.vertices) {
    adjacency.set(v.id, new Set());
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }

  // Sort vertices by degree descending
  const sorted = [...graph.vertices].sort(
    (a, b) => (adjacency.get(b.id)?.size ?? 0) - (adjacency.get(a.id)?.size ?? 0),
  );

  const colors = new Map<string, number>();
  for (const v of sorted) {
    const neighborColors = new Set<number>();
    for (const n of adjacency.get(v.id) ?? []) {
      const c = colors.get(n);
      if (c !== undefined) neighborColors.add(c);
    }
    let color = 0;
    while (neighborColors.has(color)) color++;
    colors.set(v.id, color);
  }
  return colors;
}
