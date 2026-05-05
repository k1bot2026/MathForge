import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue } from "~/math/types";
import { IsConcurrentBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeLine(payload: LinePayload): MathValue {
  return {
    type: { kind: "Line", n: 2 },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.is-concurrent?", () => {
  test("id is geom.is-concurrent?", () => {
    expect(IsConcurrentBlock.id).toBe("geom.is-concurrent?");
  });

  test("three medians of a triangle are concurrent (centroid)", () => {
    // Triangle (0,0),(6,0),(0,6). Medians:
    // m1: from (0,0) to midpoint of (6,0)-(0,6) = (3,3). Direction: (3,3)/√18.
    // m2: from (6,0) to midpoint of (0,0)-(0,6) = (0,3). Direction: (-6,3)/√45.
    // m3: from (0,6) to midpoint of (0,0)-(6,0) = (3,0). Direction: (3,-6)/√45.
    // All pass through centroid (2,2).
    const sq2 = Math.sqrt(2);
    const l1 = makeLine({ point: [0, 0], direction: [1 / sq2, 1 / sq2] });
    // Line from (6,0) to (0,3): direction (-6,3)/sqrt(45)
    const d2 = Math.sqrt(45);
    const l2 = makeLine({ point: [6, 0], direction: [-6 / d2, 3 / d2] });
    // Line from (0,6) to (3,0): direction (3,-6)/sqrt(45)
    const l3 = makeLine({ point: [0, 6], direction: [3 / d2, -6 / d2] });
    const out = IsConcurrentBlock.compute({ l1, l2, l3 }, {}, ctx) as MathValue;
    expect(out.type.kind).toBe("Scalar");
    expect(out.payload).toBe(true);
  });

  test("parallel lines (same direction) are not concurrent", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 1], direction: [1, 0] });
    const l3 = makeLine({ point: [0, 2], direction: [1, 0] });
    const out = IsConcurrentBlock.compute({ l1, l2, l3 }, {}, ctx) as MathValue;
    expect(out.payload).toBe(false);
  });

  test("two lines meeting at one point and third passing elsewhere are not concurrent", () => {
    // l1: x-axis, l2: y-axis (meet at origin). l3: shifted horizontal line y=5.
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 0], direction: [0, 1] });
    const l3 = makeLine({ point: [0, 5], direction: [1, 0] });
    const out = IsConcurrentBlock.compute({ l1, l2, l3 }, {}, ctx) as MathValue;
    expect(out.payload).toBe(false);
  });

  test("three lines through origin are concurrent", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 0], direction: [0, 1] });
    const l3 = makeLine({ point: [0, 0], direction: [1 / Math.SQRT2, 1 / Math.SQRT2] });
    const out = IsConcurrentBlock.compute({ l1, l2, l3 }, {}, ctx) as MathValue;
    expect(out.payload).toBe(true);
  });

  test("throws when a line is missing", () => {
    const l = makeLine({ point: [0, 0], direction: [1, 0] });
    expect(() => IsConcurrentBlock.compute({ l1: l, l2: l }, {}, ctx)).toThrow();
  });
});
