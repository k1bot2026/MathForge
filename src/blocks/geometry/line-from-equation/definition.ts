import type { BlockDefinition } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import { GeometryError } from "../geometry";

export const LineFromEquationBlock: BlockDefinition = {
  id: "geom.line-from-equation",
  label: "Line from Equation",
  symbol: "ax+by+c",
  category: "operation",
  domain: "geometry",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "operation",
  inputs: [],
  outputs: [
    {
      id: "line",
      label: "Line",
      type: { kind: "Line", n: 2 },
    },
  ],
  params: {
    a: { kind: "string", label: "a", default: "1" },
    b: { kind: "string", label: "b", default: "0" },
    c: { kind: "string", label: "c", default: "0" },
  },
  compute(_inputs, params): MathValue {
    const aRaw = params.a ?? "1";
    const bRaw = params.b ?? "0";
    const cRaw = params.c ?? "0";

    const a = Number(aRaw);
    const b = Number(bRaw);
    const c = Number(cRaw);

    if (!Number.isFinite(a) || Number.isNaN(a))
      throw new GeometryError(`geom.line-from-equation: 'a' is not a valid number: ${aRaw}`);
    if (!Number.isFinite(b) || Number.isNaN(b))
      throw new GeometryError(`geom.line-from-equation: 'b' is not a valid number: ${bRaw}`);
    if (!Number.isFinite(c) || Number.isNaN(c))
      throw new GeometryError(`geom.line-from-equation: 'c' is not a valid number: ${cRaw}`);

    const normalLen = Math.sqrt(a * a + b * b);
    if (normalLen < 1e-15) {
      throw new GeometryError(
        "geom.line-from-equation: a and b cannot both be zero (degenerate equation)",
      );
    }

    // Direction is perpendicular to the normal (a, b): direction = (-b, a) normalised
    const direction = [-b / normalLen, a / normalLen];

    // Find a point on the line: choose the foot of the perpendicular from the origin
    // The foot is -(c / (a²+b²)) * (a, b)
    const scale = -c / (a * a + b * b);
    const point = [a * scale, b * scale];

    // Normalise the stored implicit coefficients so the normal is unit length
    const aN = a / normalLen;
    const bN = b / normalLen;
    const cN = c / normalLen;

    return {
      type: { kind: "Line", n: 2 },
      payload: {
        point,
        direction,
        implicit: { a: aN, b: bN, c: cN },
      },
      provenance: {
        blockId: "geom.line-from-equation",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Constructs a 2D line from implicit form ax+by+c=0. Stores in parametric form (point + unit direction) with implicit coefficients cached.",
    why: "Implicit form is the natural output of algebraic geometry operations and the input to many intersection algorithms.",
    impact: (_inputs, _output) =>
      "Outputs a Line value for use in construction and measurement blocks.",
  },
};
