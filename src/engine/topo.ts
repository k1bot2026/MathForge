// Kahn's-algorithm topological sort with cycle reporting.
//
// `topoSort` returns either an order in which to evaluate nodes or
// the set of nodes that participate in a cycle. Cycles are forbidden
// in normal connections per docs/ARCHITECTURE.md; the upcoming
// `Iterate` block (Phase 5) will introduce controlled feedback under
// its own evaluator path.

export type TopoNode = { id: string };
export type TopoEdge = { source: string; target: string };

export type TopoGraph = {
  nodes: ReadonlyArray<TopoNode>;
  edges: ReadonlyArray<TopoEdge>;
};

export type TopoResult =
  | { ok: true; order: ReadonlyArray<string> }
  | { ok: false; cycle: ReadonlyArray<string> };

export function topoSort(graph: TopoGraph): TopoResult {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (!inDegree.has(edge.source) || !inDegree.has(edge.target)) continue;
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    adj.get(edge.source)?.push(edge.target);
  }
  const ready: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) ready.push(id);
  }
  const order: string[] = [];
  while (ready.length > 0) {
    // shift() is O(n) but n is small in practice; correctness > micro-perf here.
    const id = ready.shift();
    if (id === undefined) break;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const remaining = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) ready.push(next);
    }
  }
  if (order.length !== graph.nodes.length) {
    const cycle = graph.nodes.filter((n) => (inDegree.get(n.id) ?? 0) > 0).map((n) => n.id);
    return { ok: false, cycle };
  }
  return { ok: true, order };
}
