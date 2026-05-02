// Eigenvector demonstration without `la.eigen` (which lands in Phase 2).
//
// Uses a diagonal scaling matrix M = [[2, 0], [0, 1]] whose eigenvectors
// are exactly e₁ and e₂ with eigenvalues 2 and 1 respectively. Three
// vectors are wired in parallel to three matvec instances:
//   - v_e1 = (1, 0): eigenvector λ=2 → M·v stays parallel, length 2.
//   - v_e2 = (0, 1): eigenvector λ=1 → M·v unchanged.
//   - v_off = (1, 1): not an eigenvector → M·v changes direction.
// Comparing the three results side-by-side shows which directions M
// stretches without rotating.

import { GRAPH_SCHEMA_VERSION } from "../graph-codec";
import type { Template } from "./types";

export const eigenDemoTemplate: Template = {
  id: "eigen-demo",
  label: "Eigenvector demonstration",
  description:
    "M = [[2, 0], [0, 1]] applied to three vectors: the two eigenvectors (1, 0) and (0, 1), plus a non-eigenvector (1, 1). Compare the outputs to see which directions M stretches without rotating.",
  graph: {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [
      {
        id: "matrix-diag",
        type: "block",
        position: { x: 0, y: 220 },
        data: {
          blockId: "la.matrix",
          params: { rows: 2, cols: 2, r0c0: 2, r0c1: 0, r1c0: 0, r1c1: 1 },
        },
      },
      // Three vectors stacked vertically to the left of their matvec.
      {
        id: "v-e1",
        type: "block",
        position: { x: 360, y: 0 },
        data: { blockId: "la.vector", params: { dim: 2, c0: 1, c1: 0 } },
      },
      {
        id: "v-e2",
        type: "block",
        position: { x: 360, y: 220 },
        data: { blockId: "la.vector", params: { dim: 2, c0: 0, c1: 1 } },
      },
      {
        id: "v-off",
        type: "block",
        position: { x: 360, y: 440 },
        data: { blockId: "la.vector", params: { dim: 2, c0: 1, c1: 1 } },
      },
      // Three matvec results.
      {
        id: "mv-e1",
        type: "block",
        position: { x: 720, y: 0 },
        data: { blockId: "la.matvec", params: {} },
      },
      {
        id: "mv-e2",
        type: "block",
        position: { x: 720, y: 220 },
        data: { blockId: "la.matvec", params: {} },
      },
      {
        id: "mv-off",
        type: "block",
        position: { x: 720, y: 440 },
        data: { blockId: "la.matvec", params: {} },
      },
      // One unit-grid showing the matrix's effect on the basis.
      {
        id: "unit-grid",
        type: "block",
        position: { x: 1080, y: 220 },
        data: { blockId: "viz.unit-grid", params: {} },
      },
    ],
    edges: [
      // Matrix → all three matvec inputs.
      {
        id: "e-m-mv-e1",
        source: "matrix-diag",
        target: "mv-e1",
        sourceHandle: "M",
        targetHandle: "M",
      },
      {
        id: "e-m-mv-e2",
        source: "matrix-diag",
        target: "mv-e2",
        sourceHandle: "M",
        targetHandle: "M",
      },
      {
        id: "e-m-mv-off",
        source: "matrix-diag",
        target: "mv-off",
        sourceHandle: "M",
        targetHandle: "M",
      },
      // Each vector → its matvec.
      { id: "e-v-e1", source: "v-e1", target: "mv-e1", sourceHandle: "v", targetHandle: "v" },
      { id: "e-v-e2", source: "v-e2", target: "mv-e2", sourceHandle: "v", targetHandle: "v" },
      { id: "e-v-off", source: "v-off", target: "mv-off", sourceHandle: "v", targetHandle: "v" },
      // Matrix → unit-grid.
      {
        id: "e-m-grid",
        source: "matrix-diag",
        target: "unit-grid",
        sourceHandle: "M",
        targetHandle: "M",
      },
    ],
  },
};
