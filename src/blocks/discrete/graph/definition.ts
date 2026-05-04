import type { BlockDefinition, ParamSpec } from "~/blocks/types";
import type { GraphEdgeSpec, GraphVertex } from "~/math/types";
import { GraphError, makeGraph } from "../graph-theory";

const MAX_VERTICES = 12;
const MAX_EDGES = 20;

function makeVertexParams(count: number): Record<string, ParamSpec> {
  const result: Record<string, ParamSpec> = {};
  for (let i = 0; i < count; i++) {
    result[`v${String(i)}`] = {
      kind: "integer",
      default: i,
      min: 0,
      max: 999,
      label: `v${String(i)}`,
    };
  }
  return result;
}

function makeEdgeParams(count: number): Record<string, ParamSpec> {
  const result: Record<string, ParamSpec> = {};
  for (let i = 0; i < count; i++) {
    result[`e${String(i)}_from`] = {
      kind: "integer",
      default: 0,
      min: 0,
      max: 999,
      label: `e${String(i)} from`,
    };
    result[`e${String(i)}_to`] = {
      kind: "integer",
      default: i + 1,
      min: 0,
      max: 999,
      label: `e${String(i)} to`,
    };
    result[`e${String(i)}_w`] = { kind: "number", default: 1, label: `e${String(i)} weight` };
  }
  return result;
}

const GRAPH_TYPE = { kind: "Graph" as const, directed: false, weighted: false };

export const GraphBlock: BlockDefinition = {
  id: "discrete.graph",
  label: "Graph",
  symbol: "G",
  category: "source",
  domain: "discrete",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "source",
  inputs: [],
  outputs: [{ id: "G", label: "G", type: GRAPH_TYPE }],
  params: {
    directed: { kind: "boolean", default: false, label: "Directed" },
    weighted: { kind: "boolean", default: false, label: "Weighted" },
    vertex_count: { kind: "integer", default: 4, min: 0, max: MAX_VERTICES, label: "Vertices" },
    edge_count: { kind: "integer", default: 3, min: 0, max: MAX_EDGES, label: "Edges" },
    ...makeVertexParams(MAX_VERTICES),
    ...makeEdgeParams(MAX_EDGES),
  },
  compute(_inputs, params) {
    const directed = params.directed === true;
    const weighted = params.weighted === true;
    const vCount = Math.max(
      0,
      Math.min(
        typeof params.vertex_count === "number" ? Math.floor(params.vertex_count) : 4,
        MAX_VERTICES,
      ),
    );
    const eCount = Math.max(
      0,
      Math.min(
        typeof params.edge_count === "number" ? Math.floor(params.edge_count) : 3,
        MAX_EDGES,
      ),
    );

    const vertices: GraphVertex[] = [];
    for (let i = 0; i < vCount; i++) {
      const id = String(typeof params[`v${String(i)}`] === "number" ? params[`v${String(i)}`] : i);
      vertices.push({ id, label: id });
    }

    const vertexIds = new Set(vertices.map((v) => v.id));
    const edges: GraphEdgeSpec[] = [];
    for (let i = 0; i < eCount; i++) {
      const from = String(
        typeof params[`e${String(i)}_from`] === "number" ? params[`e${String(i)}_from`] : 0,
      );
      const to = String(
        typeof params[`e${String(i)}_to`] === "number" ? params[`e${String(i)}_to`] : 0,
      );
      if (!vertexIds.has(from) || !vertexIds.has(to)) {
        throw new GraphError(`discrete.graph: edge ${String(i)} references unknown vertex`);
      }
      const weight =
        typeof params[`e${String(i)}_w`] === "number" ? (params[`e${String(i)}_w`] as number) : 1;
      edges.push(weighted ? { from, to, weight } : { from, to });
    }

    return makeGraph(vertices, edges, directed, weighted);
  },
  explain: {
    what: "Defines an explicit graph with named vertices and edges. Supports directed/undirected and weighted/unweighted modes.",
    why: "Foundation for graph theory pipelines — feeds adjacency-matrix, shortest-path, spanning-tree, and coloring blocks.",
    effect: (_inputs, output) => {
      const { vertices, edges } = output.payload as {
        vertices: GraphVertex[];
        edges: GraphEdgeSpec[];
      };
      return `${String(vertices.length)} vertices, ${String(edges.length)} edges.`;
    },
  },
};
