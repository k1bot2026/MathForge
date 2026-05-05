import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload, PolygonPayload } from "~/math/types";
import { GeometryError } from "../geometry";

const DEFAULT_VERTICES = "0,0;1,0;1,1;0,1";

function parseVertices(raw: string): PolygonPayload {
  const vertexStrings = raw
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (vertexStrings.length < 3) {
    throw new GeometryError(
      `geom.polygon: at least 3 vertices required (got ${vertexStrings.length})`,
    );
  }

  const vertices: PointPayload[] = vertexStrings.map((vs, idx) => {
    const parts = vs.split(",").map((s) => s.trim());
    const coords = parts.map((s, ci) => {
      const n = Number(s);
      if (!Number.isFinite(n) || Number.isNaN(n)) {
        throw new GeometryError(
          `geom.polygon: vertex ${idx} coordinate ${ci} is not a valid number: '${s}'`,
        );
      }
      return n;
    });
    return coords;
  });

  // Verify all vertices have the same dimension
  const dim = vertices[0]?.length ?? 0;
  for (let i = 1; i < vertices.length; i++) {
    if ((vertices[i]?.length ?? 0) !== dim) {
      throw new GeometryError(
        `geom.polygon: dimension mismatch — vertex 0 has ${dim}D but vertex ${i} has ${vertices[i]?.length ?? 0}D`,
      );
    }
  }

  return vertices;
}

export const PolygonBlock: BlockDefinition = {
  id: "geom.polygon",
  label: "Polygon",
  symbol: "▷",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [],
  outputs: [{ id: "polygon", label: "Polygon", type: { kind: "Polygon" } }],
  params: {
    vertices: {
      kind: "string",
      label: "Vertices (x,y;x,y;…)",
      default: DEFAULT_VERTICES,
    },
  },
  compute(_inputs, params): MathValue {
    const raw = (params.vertices as string | undefined) ?? DEFAULT_VERTICES;
    const polygon = parseVertices(raw);
    return {
      type: { kind: "Polygon" },
      payload: polygon,
      provenance: {
        blockId: "geom.polygon",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Constructs a polygon from an ordered list of vertices in 'x,y;x,y;…' format. Vertices are interpreted as 2D or 3D depending on the coordinate count.",
    why: "The ordered-vertex representation is the universal substrate for area, perimeter, centroid, and transformation operations on polygons.",
    impact: (_inputs, _output) =>
      "Outputs a Polygon value for use in measurement and visualization blocks.",
  },
};
