import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatrix2x2 } from "./compute";

describe("la.matrix2x2 compute", () => {
  test("all zeros when params are missing (defaults only apply via the inspector layer)", () => {
    expect(computeMatrix2x2({}).payload).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  test("packs (a, b, c, d) row-major into a 2×2 real matrix", () => {
    const result = computeMatrix2x2({ a: 1, b: 2, c: 3, d: 4 });
    expect(result.type).toEqual({ kind: "Matrix", m: 2, n: 2, field: "real" });
    expect(result.payload).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  test("non-finite entries fall back to 0", () => {
    expect(computeMatrix2x2({ a: Number.NaN, b: 1, c: 2, d: 3 }).payload).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });

  test("property: any 4-tuple of finite reals survives round-trip", () => {
    const finite = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 });
    fc.assert(
      fc.property(finite, finite, finite, finite, (a, b, c, d) => {
        expect(computeMatrix2x2({ a, b, c, d }).payload).toEqual([
          [a, b],
          [c, d],
        ]);
      }),
    );
  });
});
