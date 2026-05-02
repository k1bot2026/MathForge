import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeVector2 } from "./compute";

describe("la.vector2 compute", () => {
  test("packs (x, y) into a Vector<2, real>", () => {
    const result = computeVector2({ x: 3, y: 4 });
    expect(result.type).toEqual({ kind: "Vector", n: 2, field: "real" });
    expect(result.payload).toEqual([3, 4]);
  });

  test("missing components default to 0", () => {
    expect(computeVector2({}).payload).toEqual([0, 0]);
    expect(computeVector2({ x: 5 }).payload).toEqual([5, 0]);
  });

  test("non-finite components are coerced to 0", () => {
    expect(computeVector2({ x: Number.NaN, y: 2 }).payload).toEqual([0, 2]);
  });

  test("property: any (x, y) of finite reals survives the round-trip", () => {
    const finite = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 });
    fc.assert(
      fc.property(finite, finite, (x, y) => {
        expect(computeVector2({ x, y }).payload).toEqual([x, y]);
      }),
    );
  });
});
