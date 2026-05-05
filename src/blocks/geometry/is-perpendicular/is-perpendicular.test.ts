import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue } from "~/math/types";
import { IsPerpendicularBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeLine(payload: LinePayload): MathValue {
  return {
    type: { kind: "Line", n: 2 },
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("geom.is-perpendicular?", () => {
  test("id is geom.is-perpendicular?", () => {
    expect(IsPerpendicularBlock.id).toBe("geom.is-perpendicular?");
  });

  test("horizontal and vertical lines are perpendicular", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [3, 0], direction: [0, 1] });
    const out = IsPerpendicularBlock.compute({ l1, l2 }, {}, ctx) as MathValue;
    expect(out.type.kind).toBe("Scalar");
    expect(out.payload).toBe(true);
  });

  test("two parallel lines are not perpendicular", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 1], direction: [1, 0] });
    const out = IsPerpendicularBlock.compute({ l1, l2 }, {}, ctx) as MathValue;
    expect(out.payload).toBe(false);
  });

  test("lines with direction (1,1) and (1,-1) are perpendicular", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1 / Math.SQRT2, 1 / Math.SQRT2] });
    const l2 = makeLine({ point: [0, 0], direction: [1 / Math.SQRT2, -1 / Math.SQRT2] });
    const out = IsPerpendicularBlock.compute({ l1, l2 }, {}, ctx) as MathValue;
    expect(out.payload).toBe(true);
  });

  test("perpendicularity is symmetric", () => {
    const l1 = makeLine({ point: [0, 0], direction: [1, 0] });
    const l2 = makeLine({ point: [0, 0], direction: [0, 1] });
    const r1 = (IsPerpendicularBlock.compute({ l1, l2 }, {}, ctx) as MathValue).payload;
    const r2 = (IsPerpendicularBlock.compute({ l1: l2, l2: l1 }, {}, ctx) as MathValue).payload;
    expect(r1).toBe(r2);
  });

  test("property: any line is perpendicular to its 90-degree rotation", () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(10), noNaN: true }),
        (dx, dy) => {
          const mag = Math.sqrt(dx * dx + dy * dy);
          const dir = [dx / mag, dy / mag];
          const perp = [-dy / mag, dx / mag];
          const l1 = makeLine({ point: [0, 0], direction: dir });
          const l2 = makeLine({ point: [0, 0], direction: perp });
          const out = (IsPerpendicularBlock.compute({ l1, l2 }, {}, ctx) as MathValue)
            .payload as boolean;
          expect(out).toBe(true);
        },
      ),
    );
  });

  test("throws when a line is missing", () => {
    const l = makeLine({ point: [0, 0], direction: [1, 0] });
    expect(() => IsPerpendicularBlock.compute({ l1: l }, {}, ctx)).toThrow();
  });
});
