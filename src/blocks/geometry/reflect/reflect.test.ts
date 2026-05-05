import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { CirclePayload, LinePayload, MathValue, PolygonPayload } from "~/math/types";
import { ReflectBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makePoint(coords: number[]): MathValue {
  return {
    type: { kind: "Point", n: coords.length },
    payload: coords,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeLine(payload: LinePayload): MathValue {
  return {
    type: { kind: "Line", n: 2 },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeCircle(center: number[], radius: number): MathValue {
  return {
    type: { kind: "Circle" },
    payload: { center, radius } as CirclePayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makePolygon(vertices: number[][]): MathValue {
  return {
    type: { kind: "Polygon" },
    payload: vertices as PolygonPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

// Horizontal mirror line (x-axis): y=0 line, direction (1,0)
const xAxis = makeLine({ point: [0, 0], direction: [1, 0] });
// Vertical mirror line (y-axis): direction (0,1)
const yAxis = makeLine({ point: [0, 0], direction: [0, 1] });

describe("geom.reflect", () => {
  test("id is geom.reflect", () => {
    expect(ReflectBlock.id).toBe("geom.reflect");
  });

  // --- Point ---
  test("reflect (1,2) across x-axis → (1,-2)", () => {
    const out = ReflectBlock.compute(
      { shape: makePoint([1, 2]), line: xAxis },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Point");
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(1, 8);
    expect(p[1]).toBeCloseTo(-2, 8);
  });

  test("reflect (1,2) across y-axis → (-1,2)", () => {
    const out = ReflectBlock.compute(
      { shape: makePoint([1, 2]), line: yAxis },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(-1, 8);
    expect(p[1]).toBeCloseTo(2, 8);
  });

  test("point on mirror line reflects to itself", () => {
    const out = ReflectBlock.compute(
      { shape: makePoint([3, 0]), line: xAxis },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(3, 8);
    expect(p[1]).toBeCloseTo(0, 8);
  });

  test("reflect (1,1) across y=x → (1,1) [fixed point on line]", () => {
    const yEqualsX = makeLine({ point: [0, 0], direction: [1 / Math.SQRT2, 1 / Math.SQRT2] });
    const out = ReflectBlock.compute(
      { shape: makePoint([1, 1]), line: yEqualsX },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(1, 8);
    expect(p[1]).toBeCloseTo(1, 8);
  });

  test("reflect (3,0) across y=x → (0,3)", () => {
    const yEqualsX = makeLine({ point: [0, 0], direction: [1 / Math.SQRT2, 1 / Math.SQRT2] });
    const out = ReflectBlock.compute(
      { shape: makePoint([3, 0]), line: yEqualsX },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(0, 8);
    expect(p[1]).toBeCloseTo(3, 8);
  });

  test("reflect twice → identity (property)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        (px, py) => {
          const r1 = ReflectBlock.compute(
            { shape: makePoint([px, py]), line: xAxis },
            {},
            ctx,
          ) as MathValue;
          const r2 = (ReflectBlock.compute({ shape: r1, line: xAxis }, {}, ctx) as MathValue)
            .payload as number[];
          expect(r2[0]).toBeCloseTo(px, 7);
          expect(r2[1]).toBeCloseTo(py, 7);
        },
      ),
    );
  });

  // --- Circle ---
  test("reflect circle across x-axis: center y-flipped, radius unchanged", () => {
    const c = makeCircle([2, 3], 4);
    const out = ReflectBlock.compute({ shape: c, line: xAxis }, {}, ctx) as MathValue;
    const res = out.payload as CirclePayload;
    expect(res.center[0]).toBeCloseTo(2, 8);
    expect(res.center[1]).toBeCloseTo(-3, 8);
    expect(res.radius).toBeCloseTo(4, 10);
  });

  // --- Polygon ---
  test("reflect polygon across x-axis: y-coordinates flip", () => {
    const poly = makePolygon([
      [0, 0],
      [1, 0],
      [1, 2],
    ]);
    const out = ReflectBlock.compute({ shape: poly, line: xAxis }, {}, ctx) as MathValue;
    const verts = out.payload as number[][];
    expect(verts[2]?.[1]).toBeCloseTo(-2, 8);
  });

  // --- Errors ---
  test("throws when shape is missing", () => {
    expect(() => ReflectBlock.compute({ line: xAxis }, {}, ctx)).toThrow();
  });

  test("throws when line is missing", () => {
    expect(() => ReflectBlock.compute({ shape: makePoint([0, 0]) }, {}, ctx)).toThrow();
  });
});
