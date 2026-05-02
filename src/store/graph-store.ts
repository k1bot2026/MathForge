import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";
import type { EvalResult } from "~/engine/types";

export type GraphState = {
  nodes: Node[];
  edges: Edge[];
  /** Per-node-id evaluator output. Populated by the auto-evaluate hook. */
  results: Readonly<Record<string, EvalResult>>;
  evalStatus: "idle" | "running";
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  connect: (edge: Edge) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setResults: (results: ReadonlyMap<string, EvalResult>) => void;
  setEvalStatus: (status: "idle" | "running") => void;
};

const seedConstantNode: Node = {
  id: "constant-1",
  type: "block",
  position: { x: 0, y: 0 },
  data: {
    blockId: "core.constant",
    params: { value: 42 },
  },
};

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [seedConstantNode],
  edges: [],
  results: {},
  evalStatus: "idle",
  addNode: (node) => {
    set((state) => ({ nodes: [...state.nodes, node] }));
  },
  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
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
}));
