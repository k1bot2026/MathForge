import type { BlockDefinition } from "~/blocks/types";
import type { MathValue, PointPayload } from "~/math/types";
import { GeometryError, lineFromTwoPoints, norm, normalize, subtract } from "../geometry";

export const AngleBisectorBlock: BlockDefinition = {
  id: "geom.angle-bisector",
  label: "Angle Bisector",
  symbol: "∠/2",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [
    { id: "vertex", label: "Vertex", type: { kind: "Point", n: 2 } },
    { id: "p1", label: "P₁", type: { kind: "Point", n: 2 } },
    { id: "p2", label: "P₂", type: { kind: "Point", n: 2 } },
  ],
  outputs: [{ id: "line", label: "Bisector", type: { kind: "Line", n: 2 } }],
  params: {},
  compute(inputs): MathValue {
    const vertexVal = inputs.vertex;
    const p1Val = inputs.p1;
    const p2Val = inputs.p2;
    if (vertexVal === undefined) throw new GeometryError("geom.angle-bisector: vertex is required");
    if (p1Val === undefined) throw new GeometryError("geom.angle-bisector: P₁ is required");
    if (p2Val === undefined) throw new GeometryError("geom.angle-bisector: P₂ is required");

    const vertex = vertexVal.payload as PointPayload;
    const p1 = p1Val.payload as PointPayload;
    const p2 = p2Val.payload as PointPayload;

    // Unit vectors from vertex toward each arm
    const arm1 = subtract(p1, vertex);
    const arm2 = subtract(p2, vertex);
    const n1 = norm(arm1);
    const n2 = norm(arm2);
    if (n1 < 1e-12) throw new GeometryError("geom.angle-bisector: P₁ is too close to vertex");
    if (n2 < 1e-12) throw new GeometryError("geom.angle-bisector: P₂ is too close to vertex");

    const u1 = normalize(arm1);
    const u2 = normalize(arm2);

    // Bisector direction = u1 + u2 (normalised sum)
    const bisDir = u1.map((c, i) => c + (u2[i] ?? 0));
    const bisLen = norm(bisDir);

    if (bisLen < 1e-12) {
      // Arms point in exactly opposite directions (180° angle) — bisector is perpendicular
      // to arm1; use the 90° rotation
      const rotatedDir = [-(arm1[1] ?? 0) / n1, (arm1[0] ?? 0) / n1];
      const secPt: PointPayload = [
        (vertex[0] ?? 0) + (rotatedDir[0] ?? 0),
        (vertex[1] ?? 0) + (rotatedDir[1] ?? 0),
      ];
      return {
        type: { kind: "Line", n: 2 },
        payload: lineFromTwoPoints(vertex, secPt),
        provenance: {
          blockId: "geom.angle-bisector",
          inputs: ["vertex", "p1", "p2"],
          computedAt: Date.now(),
          engine: "native",
        },
      };
    }

    const normBisDir = bisDir.map((c) => c / bisLen);
    const secPt: PointPayload = [
      (vertex[0] ?? 0) + (normBisDir[0] ?? 0),
      (vertex[1] ?? 0) + (normBisDir[1] ?? 0),
    ];
    const payload = lineFromTwoPoints(vertex, secPt);

    return {
      type: { kind: "Line", n: 2 },
      payload,
      provenance: {
        blockId: "geom.angle-bisector",
        inputs: ["vertex", "p1", "p2"],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Constructs the angle bisector of the angle at vertex, formed by rays vertex→P₁ and vertex→P₂. The bisector passes through the vertex in the direction that bisects the angle between the two arms.",
    why: "The angle bisector is the locus of points equidistant from both arms; it's the key construction for inscribed circles and triangle centres.",
    effect: (inputs) => {
      if (inputs.vertex === undefined || inputs.p1 === undefined || inputs.p2 === undefined)
        return "Connect a vertex and two arm points to construct the angle bisector.";
      const fmt = (p: PointPayload) => `(${p.map((c) => c.toFixed(2)).join(", ")})`;
      return `Angle bisector at ${fmt(inputs.vertex.payload as PointPayload)}.`;
    },
    impact: (_inputs, _output) =>
      "Outputs a Line value for use in construction and measurement blocks.",
  },
};
