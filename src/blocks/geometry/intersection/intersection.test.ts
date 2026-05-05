import { describe, expect, test } from "vitest";
import type { CirclePayload, LinePayload, MathValue } from "~/math/types";
import { IntersectionBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

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

describe("geom.intersection", () => {
  test("id is geom.intersection", () => {
    expect(IntersectionBlock.id).toBe("geom.intersection");
  });

  // --- Line × Line ---
  test("x-axis and y-axis intersect at origin", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 0], direction: [0, 1] });
    const out = IntersectionBlock.compute({ a: l1, b: l2 }, {}, ctx) as MathValue;
    expect(out.type.kind).toBe("Set");
    const pts = out.payload as number[][];
    expect(pts).toHaveLength(1);
    expect(pts[0]?.[0]).toBeCloseTo(0, 8);
    expect(pts[0]?.[1]).toBeCloseTo(0, 8);
  });

  test("parallel lines have empty intersection", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 1], direction: [1, 0] });
    const out = IntersectionBlock.compute({ a: l1, b: l2 }, {}, ctx) as MathValue;
    const pts = out.payload as number[][];
    expect(pts).toHaveLength(0);
  });

  test("non-axis lines intersecting at known point", () => {
    // l1: y = x → direction (1,1)/√2, point (0,0)
    // l2: y = -x + 4 → direction (1,-1)/√2, point (4,0)
    const l1 = makeLine({ point: [0, 0], direction: [1 / Math.SQRT2, 1 / Math.SQRT2] });
    const l2 = makeLine({ point: [4, 0], direction: [1 / Math.SQRT2, -1 / Math.SQRT2] });
    const out = IntersectionBlock.compute({ a: l1, b: l2 }, {}, ctx) as MathValue;
    const pts = out.payload as number[][];
    expect(pts).toHaveLength(1);
    expect(pts[0]?.[0]).toBeCloseTo(2, 8);
    expect(pts[0]?.[1]).toBeCloseTo(2, 8);
  });

  // --- Line × Circle ---
  test("x-axis intersects unit circle at (±1, 0)", () => {
    const l = makeLine({ point: [0, 0], direction: [1, 0] });
    const c = makeCircle([0, 0], 1);
    const out = IntersectionBlock.compute({ a: l, b: c }, {}, ctx) as MathValue;
    const pts = (out.payload as number[][]).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));
    expect(pts).toHaveLength(2);
    expect(pts[0]?.[0]).toBeCloseTo(-1, 8);
    expect(pts[0]?.[1]).toBeCloseTo(0, 8);
    expect(pts[1]?.[0]).toBeCloseTo(1, 8);
    expect(pts[1]?.[1]).toBeCloseTo(0, 8);
  });

  test("tangent line to circle has 1 intersection point", () => {
    // Circle centered at origin radius 1, tangent line y=1
    const l = makeLine({ point: [0, 1], direction: [1, 0] });
    const c = makeCircle([0, 0], 1);
    const out = IntersectionBlock.compute({ a: l, b: c }, {}, ctx) as MathValue;
    const pts = out.payload as number[][];
    expect(pts).toHaveLength(1);
    expect(pts[0]?.[1]).toBeCloseTo(1, 8);
  });

  test("line outside circle has 0 intersections", () => {
    const l = makeLine({ point: [0, 2], direction: [1, 0] });
    const c = makeCircle([0, 0], 1);
    const out = IntersectionBlock.compute({ a: l, b: c }, {}, ctx) as MathValue;
    const pts = out.payload as number[][];
    expect(pts).toHaveLength(0);
  });

  // --- Circle × Circle ---
  test("two unit circles offset by (1,0) intersect at two points", () => {
    const c1 = makeCircle([0, 0], 1);
    const c2 = makeCircle([1, 0], 1);
    const out = IntersectionBlock.compute({ a: c1, b: c2 }, {}, ctx) as MathValue;
    const pts = (out.payload as number[][]).sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0));
    expect(pts).toHaveLength(2);
    // Intersection at x=0.5, y=±√3/2
    expect(pts[0]?.[0]).toBeCloseTo(0.5, 6);
    expect(pts[0]?.[1]).toBeCloseTo(-Math.sqrt(3) / 2, 6);
    expect(pts[1]?.[1]).toBeCloseTo(Math.sqrt(3) / 2, 6);
  });

  test("non-overlapping circles have 0 intersections", () => {
    const c1 = makeCircle([0, 0], 1);
    const c2 = makeCircle([10, 0], 1);
    const out = IntersectionBlock.compute({ a: c1, b: c2 }, {}, ctx) as MathValue;
    expect((out.payload as number[][]).length).toBe(0);
  });

  // --- Errors ---
  test("throws when both inputs missing", () => {
    expect(() => IntersectionBlock.compute({}, {}, ctx)).toThrow();
  });

  test("throws for unsupported combination (Point × Line)", () => {
    const l = makeLine({ point: [0, 0], direction: [1, 0] });
    const pt: MathValue = {
      type: { kind: "Point", n: 2 },
      payload: [0, 0],
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(() => IntersectionBlock.compute({ a: pt, b: l }, {}, ctx)).toThrow();
  });
});
