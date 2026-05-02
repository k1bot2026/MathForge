// Rotation by 30°: M = [[cos30, -sin30], [sin30, cos30]] applied to
// the unit x-vector and rendered on the unit grid.
//
// Pre-computed entries (kept literal so the template payload stays
// stable across math.js versions). 30° = π/6:
//   cos30 ≈ 0.8660254037844387
//   sin30 = 0.5

import { GRAPH_SCHEMA_VERSION } from "../graph-codec";
import type { Template } from "./types";

const COS30 = 0.8660254037844387;
const SIN30 = 0.5;

export const rotationTemplate: Template = {
  id: "rotation",
  label: "Rotation 30°",
  description:
    "A 30° rotation matrix applied to the unit x-vector, with the unit grid showing the new basis.",
  graph: {
    schemaVersion: GRAPH_SCHEMA_VERSION,
    nodes: [
      {
        id: "matrix-rot30",
        type: "block",
        position: { x: 0, y: 0 },
        data: {
          blockId: "la.matrix2x2",
          params: { a: COS30, b: -SIN30, c: SIN30, d: COS30 },
        },
      },
      {
        id: "vector-e1",
        type: "block",
        position: { x: 0, y: 220 },
        data: { blockId: "la.vector2", params: { x: 1, y: 0 } },
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
        source: "matrix-rot30",
        target: "matvec",
        sourceHandle: "M",
        targetHandle: "M",
      },
      {
        id: "e-vector-matvec",
        source: "vector-e1",
        target: "matvec",
        sourceHandle: "v",
        targetHandle: "v",
      },
      {
        id: "e-matrix-grid",
        source: "matrix-rot30",
        target: "unit-grid",
        sourceHandle: "M",
        targetHandle: "M",
      },
    ],
  },
};
