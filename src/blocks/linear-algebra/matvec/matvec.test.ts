import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { computeMatVec, MatVecError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;
const REAL_VECTOR = (n: number) => ({ kind: "Vector", n, field: "real" }) as const;

function asMathValue(payload: unknown, type: MathValue["type"]): MathValue {
  return {
    type,
    payload: payload as MathValue["payload"],
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const integerMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -10, max: 10 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

const integerVector = (n: number) =>
  fc.array(fc.integer({ min: -10, max: 10 }), { minLength: n, maxLength: n });

describe("la.matvec compute", () => {
  test("[[1,2],[3,4]] · [5,6] = [17, 39]", () => {
    const result = computeMatVec({
      M: asMathValue(
        [
          [1, 2],
          [3, 4],
        ],
        REAL_MATRIX(2, 2),
      ),
      v: asMathValue([5, 6], REAL_VECTOR(2)),
    });
    expect(result.payload).toEqual([17, 39]);
    expect(result.type).toEqual({ kind: "Vector", n: 2, field: "real" });
  });

  test("identity: I · v = v", () => {
    const v = [3, -7, 5];
    const I = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const result = computeMatVec({
      M: asMathValue(I, REAL_MATRIX(3, 3)),
      v: asMathValue(v, REAL_VECTOR(3)),
    });
    expect(result.payload).toEqual(v);
  });

  test("rejects mismatched inner dimensions with a typed error", () => {
    expect(() =>
      computeMatVec({
        M: asMathValue([[1, 2, 3]], REAL_MATRIX(1, 3)),
        v: asMathValue([1, 2], REAL_VECTOR(2)),
      }),
    ).toThrow(MatVecError);
  });

  test("rejects missing inputs", () => {
    expect(() => computeMatVec({})).toThrow(MatVecError);
  });

  test("property: linearity — M(av + bw) = a(Mv) + b(Mw)", () => {
    fc.assert(
      fc.property(
        integerMatrix(3, 2),
        integerVector(2),
        integerVector(2),
        fc.integer({ min: -5, max: 5 }),
        fc.integer({ min: -5, max: 5 }),
        (M, v, w, a, b) => {
          const mvalue = (mat: number[][]) =>
            asMathValue(mat, REAL_MATRIX(mat.length, mat[0]?.length ?? 0));
          const vvalue = (vec: number[]) => asMathValue(vec, REAL_VECTOR(vec.length));
          const av_bw = v.map((x, i) => a * x + b * (w[i] ?? 0));
          const left = computeMatVec({ M: mvalue(M), v: vvalue(av_bw) }).payload as number[];
          const Mv = computeMatVec({ M: mvalue(M), v: vvalue(v) }).payload as number[];
          const Mw = computeMatVec({ M: mvalue(M), v: vvalue(w) }).payload as number[];
          // Normalise -0 → +0 on the test-computed side so it matches what
          // computeMatVec emits; toEqual uses Object.is and treats -0 as ≠ 0.
          const right = Mv.map((x, i) => {
            const r = a * x + b * (Mw[i] ?? 0);
            return r === 0 ? 0 : r;
          });
          expect(left).toEqual(right);
        },
      ),
      { numRuns: 50 },
    );
  });
});
