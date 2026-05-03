import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { computeMatVec, MatVecError } from "./compute";
import { MatVecBlock } from "./definition";

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

  test("polymorphic: 4×3 matrix applied to 3-vector yields 4-vector", () => {
    const M = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1],
    ];
    const v = [1, 2, 3];
    const result = computeMatVec({
      M: asMathValue(M, REAL_MATRIX(4, 3)),
      v: asMathValue(v, REAL_VECTOR(3)),
    });
    expect(result.payload).toEqual([1, 2, 3, 6]);
    expect(result.type).toEqual({ kind: "Vector", n: 4, field: "real" });
  });

  test("polymorphic: output type.n equals number of rows in M", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }).chain((m) =>
          fc.integer({ min: 1, max: 5 }).chain((n) =>
            fc.tuple(
              fc.constant(m),
              fc.constant(n),
              fc
                .array(fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }), {
                  minLength: m,
                  maxLength: m,
                })
                .chain((mat) =>
                  fc.tuple(
                    fc.constant(mat),
                    fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }),
                  ),
                ),
            ),
          ),
        ),
        ([m, _n, [mat, vec]]) => {
          const result = computeMatVec({
            M: asMathValue(mat, REAL_MATRIX(m, mat[0]?.length ?? 0)),
            v: asMathValue(vec, REAL_VECTOR(vec.length)),
          });
          expect((result.type as { n: number }).n).toBe(m);
          expect((result.payload as number[]).length).toBe(m);
        },
      ),
    );
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

describe("la.matvec definition — explain.effect and output type", () => {
  const ctx = { signal: new AbortController().signal };

  test("explain.effect with M input shows matrix shape and vector length", () => {
    const M: MathValue = {
      type: { kind: "Matrix", m: 3, n: 2, field: "real" },
      payload: [
        [1, 0],
        [0, 1],
        [1, 1],
      ] as number[][],
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    const v: MathValue = {
      type: { kind: "Vector", n: 2, field: "real" },
      payload: [1, 2] as number[],
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    const out = computeMatVec({ M, v });
    const text = MatVecBlock.explain.effect?.({ M, v }, out) ?? "";
    expect(text).toMatch(/3×2/);
    expect(text).toMatch(/3-vector/);
  });

  test("explain.effect without M input shows result array", () => {
    const out: MathValue = {
      type: { kind: "Vector", n: 2, field: "real" },
      payload: [5, 7] as number[],
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    const text = MatVecBlock.explain.effect?.({}, out) ?? "";
    expect(text).toMatch(/5/);
    expect(text).toMatch(/7/);
    expect(text).not.toMatch(/matrix/i);
  });

  test("output type function returns concrete n when M type is present", () => {
    const outputSpec = MatVecBlock.outputs[0];
    if (!outputSpec || typeof outputSpec.type !== "function") return;
    const result = outputSpec.type({
      M: { kind: "Matrix", m: 4, n: 3, field: "real" },
    });
    expect(result).toMatchObject({ kind: "Vector", n: 4, field: "real" });
  });

  test("output type function returns 'any' n when M type is absent", () => {
    const outputSpec = MatVecBlock.outputs[0];
    if (!outputSpec || typeof outputSpec.type !== "function") return;
    const result = outputSpec.type({});
    expect(result).toMatchObject({ kind: "Vector", n: "any" });
  });

  test("compute delegates to computeMatVec", async () => {
    const M: MathValue = {
      type: { kind: "Matrix", m: 2, n: 2, field: "real" },
      payload: [
        [1, 2],
        [3, 4],
      ] as number[][],
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    const v: MathValue = {
      type: { kind: "Vector", n: 2, field: "real" },
      payload: [1, 0] as number[],
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    const raw = MatVecBlock.compute({ M, v }, {}, ctx);
    const result = raw instanceof Promise ? await raw : raw;
    expect(result.payload).toEqual([1, 3]);
  });
});
