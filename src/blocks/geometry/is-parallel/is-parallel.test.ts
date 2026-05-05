import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue } from "~/math/types";
import { IsParallelBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeLine(payload: LinePayload): MathValue {
  return {
    type: { kind: "Line", n: 2 },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.is-parallel?", () => {
  test("id is geom.is-parallel?", () => {
    expect(IsParallelBlock.id).toBe("geom.is-parallel?");
  });

  test("two horizontal lines are parallel", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 5], direction: [1, 0] });
    const out = IsParallelBlock.compute({ l1, l2 }, {}, ctx) as MathValue;
    expect(out.type.kind).toBe("Scalar");
    expect(out.payload).toBe(true);
  });

  test("horizontal and vertical lines are not parallel", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 0], direction: [0, 1] });
    const out = IsParallelBlock.compute({ l1, l2 }, {}, ctx) as MathValue;
    expect(out.payload).toBe(false);
  });

  test("same line (identical direction and point) is parallel to itself", () => {
    const l = makeLine({ point: [1, 2], direction: [3 / 5, 4 / 5] });
    const out = IsParallelBlock.compute({ l1: l, l2: l }, {}, ctx) as MathValue;
    expect(out.payload).toBe(true);
  });

  test("opposite direction vectors are parallel", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 3], direction: [-1, 0] });
    const out = IsParallelBlock.compute({ l1, l2 }, {}, ctx) as MathValue;
    expect(out.payload).toBe(true);
  });

  test("property: any two lines with the same direction are parallel", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
        (ox, oy) => {
          const dir = [1 / Math.SQRT2, 1 / Math.SQRT2];
          const l1 = makeLine({ point: [0, 0], direction: dir });
          const l2 = makeLine({ point: [ox, oy], direction: dir });
          const out = (IsParallelBlock.compute({ l1, l2 }, {}, ctx) as MathValue)
            .payload as boolean;
          expect(out).toBe(true);
        },
      ),
    );
  });

  test("throws when a line is missing", () => {
    const l = makeLine({ point: [0, 0], direction: [1, 0] });
    expect(() => IsParallelBlock.compute({ l1: l }, {}, ctx)).toThrow();
  });
});
