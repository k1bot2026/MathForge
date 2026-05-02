import type { Edge, Node } from "@xyflow/react";
import { create } from "zustand";

export type GraphState = {
  nodes: Node[];
  edges: Edge[];
  addNode: (node: Node) => void;
  removeNode: (id: string) => void;
  connect: (edge: Edge) => void;
};

const placeholderNode: Node = {
  id: "placeholder-1",
  type: "placeholder",
  position: { x: 0, y: 0 },
  data: {},
};

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [placeholderNode],
  edges: [],
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
}));
