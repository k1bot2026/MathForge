// Horizontal shear: M = [[1, 1], [0, 1]] sends (x, y) → (x + y, y).
// Applied to a non-axis-aligned vector so the change is visible.

import { GRAPH_SCHEMA_VERSION } from "../graph-codec";
import type { Template } from "./types";

export const shearTemplate: Template = {
  id: "shear",
  label: "Horizontal shear",
  description:
    "A shear matrix [[1, 1], [0, 1]] applied to a slanted vector — note how the unit-square parallelogram tilts but its area is preserved (det = 1).",
  graph: {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [
      {
        id: "matrix-shear",
        type: "block",
        position: { x: 0, y: 0 },
        data: {
          blockId: "la.matrix",
          params: { rows: 2, cols: 2, r0c0: 1, r0c1: 1, r1c0: 0, r1c1: 1 },
        },
      },
      {
        id: "vector-slant",
        type: "block",
        position: { x: 0, y: 220 },
        data: { blockId: "la.vector", params: { dim: 2, c0: 1, c1: 1 } },
      },
      {
        id: "matvec",
        type: "block",
        position: { x: 360, y: 110 },
        data: { blockId: "la.matvec", params: {} },
      },
      {
        id: "unit-grid",
        type: "block",
        position: { x: 720, y: 0 },
        data: { blockId: "viz.unit-grid", params: {} },
      },
    ],
    edges: [
      {
        id: "e-matrix-matvec",
        source: "matrix-shear",
        target: "matvec",
        sourceHandle: "M",
        targetHandle: "M",
      },
      {
        id: "e-vector-matvec",
        source: "vector-slant",
        target: "matvec",
        sourceHandle: "v",
        targetHandle: "v",
      },
      {
        id: "e-matrix-grid",
        source: "matrix-shear",
        target: "unit-grid",
        sourceHandle: "M",
        targetHandle: "M",
      },
    ],
  },
};
