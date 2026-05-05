import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue } from "~/math/types";
import { ProjectBlock } from "./definition";

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

const xAxis = makeLine({ point: [0, 0], direction: [1, 0] });
const yAxis = makeLine({ point: [0, 0], direction: [0, 1] });

describe("geom.project", () => {
  test("id is geom.project", () => {
    expect(ProjectBlock.id).toBe("geom.project");
  });

  test("project (3,5) onto x-axis → (3,0)", () => {
    const out = ProjectBlock.compute(
      { point: makePoint([3, 5]), line: xAxis },
      {},
      ctx,
    ) as MathValue;
    expect(out.type.kind).toBe("Point");
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(3, 8);
    expect(p[1]).toBeCloseTo(0, 8);
  });

  test("project (3,5) onto y-axis → (0,5)", () => {
    const out = ProjectBlock.compute(
      { point: makePoint([3, 5]), line: yAxis },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(0, 8);
    expect(p[1]).toBeCloseTo(5, 8);
  });

  test("project point on line → same point", () => {
    const out = ProjectBlock.compute(
      { point: makePoint([3, 0]), line: xAxis },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(3, 8);
    expect(p[1]).toBeCloseTo(0, 8);
  });

  test("project onto y=x diagonal", () => {
    // Project (3,1) onto y=x (direction (1,1)/√2)
    // t = dot((3,1)-(0,0), (1,1)/√2) / 1 = (3+1)/√2 ... proj = t * dir = (2,2)
    const yEqX = makeLine({ point: [0, 0], direction: [1 / Math.SQRT2, 1 / Math.SQRT2] });
    const out = ProjectBlock.compute(
      { point: makePoint([3, 1]), line: yEqX },
      {},
      ctx,
    ) as MathValue;
    const p = out.payload as number[];
    expect(p[0]).toBeCloseTo(2, 8);
    expect(p[1]).toBeCloseTo(2, 8);
  });

  test("projection is idempotent: project(project(P)) = project(P)", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        (px, py) => {
          const proj1 = ProjectBlock.compute(
            { point: makePoint([px, py]), line: xAxis },
            {},
            ctx,
          ) as MathValue;
          const proj2 = (ProjectBlock.compute({ point: proj1, line: xAxis }, {}, ctx) as MathValue)
            .payload as number[];
          const p1 = proj1.payload as number[];
          expect(Math.abs((p1[0] ?? 0) - (proj2[0] ?? 0))).toBeLessThan(1e-8);
          expect(Math.abs((p1[1] ?? 0) - (proj2[1] ?? 0))).toBeLessThan(1e-8);
        },
      ),
    );
  });

  test("projected point is on the line: dot(result - anchor, normal) = 0", () => {
    const line = makeLine({ point: [1, 2], direction: [3 / 5, 4 / 5] });
    const out = ProjectBlock.compute({ point: makePoint([5, 0]), line }, {}, ctx) as MathValue;
    const p = out.payload as number[];
    // Normal to line direction (3,4)/5 is (-4,3)/5
    const nx = -4 / 5;
    const ny = 3 / 5;
    const ax = 1;
    const ay = 2;
    // dot(p - anchor, normal) ≈ 0 means p is on the line
    const dot = ((p[0] ?? 0) - ax) * nx + ((p[1] ?? 0) - ay) * ny;
    expect(Math.abs(dot)).toBeLessThan(1e-8);
  });

  test("throws when point is missing", () => {
    expect(() => ProjectBlock.compute({ line: xAxis }, {}, ctx)).toThrow();
  });

  test("throws when line is missing", () => {
    expect(() => ProjectBlock.compute({ point: makePoint([0, 0]) }, {}, ctx)).toThrow();
  });
});
