import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";
import type { ResolvedParams } from "~/blocks/types";
import type { EvalResult } from "~/engine/types";

export type GraphState = {
  nodes: Node[];
  edges: Edge[];
  /** Per-node-id evaluator output. Populated by the auto-evaluate hook. */
  results: Readonly<Record<string, EvalResult>>;
  evalStatus: "idle" | "running";
  /** Currently-selected graph-node id; drives the inspector + explanation rail. */
  selectedNodeId: string | null;
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  connect: (edge: Edge) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setResults: (results: ReadonlyMap<string, EvalResult>) => void;
  setEvalStatus: (status: "idle" | "running") => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeParams: (id: string, params: ResolvedParams) => void;
  /** Atomically replace the entire graph (used by the URL-hash loader). */
  replaceGraph: (nodes: Node[], edges: Edge[]) => void;
};

// Phase-1 seed graph: demos the matvec pipeline end-to-end so a
// first-time visitor can see the type-checked DAG do something visible
// without dragging anything. Two source nodes (a 2×2 scaling matrix
// and a 2-vector) feed an la.matvec operation; the operation's output
// node shows the computed result. A bare core.constant sits to the
// side as the simplest possible source-block example.
const seedNodes: Node[] = [
  {
    id: "matrix-1",
    type: "block",
    position: { x: 0, y: 0 },
    data: { blockId: "la.matrix2x2", params: { a: 2, b: 0, c: 0, d: 1 } },
  },
  {
    id: "vector-1",
    type: "block",
    position: { x: 0, y: 220 },
    data: { blockId: "la.vector2", params: { x: 1, y: 1 } },
  },
  {
    id: "matvec-1",
    type: "block",
    position: { x: 360, y: 110 },
    data: { blockId: "la.matvec", params: {} },
  },
  {
    id: "constant-1",
    type: "block",
    position: { x: 720, y: 0 },
    data: { blockId: "core.constant", params: { value: 42 } },
  },
  {
    id: "unit-grid-1",
    type: "block",
    position: { x: 720, y: 220 },
    data: { blockId: "viz.unit-grid", params: {} },
  },
];

const seedEdges: Edge[] = [
  {
    id: "e-matrix-matvec",
    source: "matrix-1",
    target: "matvec-1",
    sourceHandle: "M",
    targetHandle: "M",
  },
  {
    id: "e-vector-matvec",
    source: "vector-1",
    target: "matvec-1",
    sourceHandle: "v",
    targetHandle: "v",
  },
  {
    id: "e-matrix-unit-grid",
    source: "matrix-1",
    target: "unit-grid-1",
    sourceHandle: "M",
    targetHandle: "M",
  },
];

export const useGraphStore = create<GraphState>((set) => ({
  nodes: seedNodes,
  edges: seedEdges,
  results: {},
  evalStatus: "idle",
  selectedNodeId: null,
  addNode: (node) => {
    set((state) => ({ nodes: [...state.nodes, node] }));
  },
  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },
  connect: (edge) => {
    set((state) => {
      if (state.edges.some((e) => e.id === edge.id)) return state;
      return { edges: [...state.edges, edge] };
    });
  },
  setNodes: (nodes) => {
    set({ nodes });
  },
  setEdges: (edges) => {
    set({ edges });
  },
  setResults: (resultsMap) => {
    const obj: Record<string, EvalResult> = {};
    for (const [id, r] of resultsMap) obj[id] = r;
    set({ results: obj });
  },
  setEvalStatus: (status) => {
    set({ evalStatus: status });
  },
  setSelectedNodeId: (id) => {
    set({ selectedNodeId: id });
  },
  updateNodeParams: (id, params) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== id) return n;
        const data = (n.data ?? {}) as { blockId?: string; params?: ResolvedParams };
        return { ...n, data: { ...data, params } };
      }),
    }));
  },
  replaceGraph: (nodes, edges) => {
    set({
      nodes,
      edges,
      results: {},
      evalStatus: "idle",
      selectedNodeId: null,
    });
  },
}));
