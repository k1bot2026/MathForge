import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import type { MathValue } from "~/math/types";
import { computeTranspose, TransposeError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const intMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -10, max: 10 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

describe("la.transpose compute", () => {
  test("2×2 transpose: [[1,2],[3,4]] → [[1,3],[2,4]]", () => {
    const result = computeTranspose({
      A: mvalue([
        [1, 2],
        [3, 4],
      ]),
    });
    expect(result.type).toEqual(REAL_MATRIX(2, 2));
    expect(result.payload).toEqual([
      [1, 3],
      [2, 4],
    ]);
  });

  test("2×3 → 3×2: rows become columns", () => {
    const result = computeTranspose({
      A: mvalue([
        [1, 2, 3],
        [4, 5, 6],
      ]),
    });
    expect(result.type).toEqual(REAL_MATRIX(3, 2));
    expect(result.payload).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });

  test("1×4 row vector transposed to 4×1 column", () => {
    const result = computeTranspose({ A: mvalue([[1, 2, 3, 4]]) });
    expect(result.type).toEqual(REAL_MATRIX(4, 1));
    expect(result.payload).toEqual([[1], [2], [3], [4]]);
  });

  test("rejects missing input", () => {
    expect(() => computeTranspose({})).toThrow(TransposeError);
  });

  test("property: involution — (Aᵀ)ᵀ === A for any m×n matrix", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 5 })
          .chain((m) => fc.integer({ min: 1, max: 5 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const At = computeTranspose({ A: mvalue(A) });
          const Att = computeTranspose({ A: At });
          expect(Att.payload).toEqual(A);
        },
      ),
    );
  });

  test("property: output shape is n×m when input is m×n", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 5 })
          .chain((m) =>
            fc
              .integer({ min: 1, max: 5 })
              .chain((n) => fc.tuple(fc.constant(m), fc.constant(n), intMatrix(m, n))),
          ),
        ([m, n, A]) => {
          const At = computeTranspose({ A: mvalue(A) });
          const t = At.type as { m: number; n: number };
          expect(t.m).toBe(n);
          expect(t.n).toBe(m);
        },
      ),
    );
  });

  test("property: (A·B)ᵀ === Bᵀ·Aᵀ (reversal under transposition)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) =>
            fc
              .integer({ min: 1, max: 4 })
              .chain((k) =>
                fc
                  .integer({ min: 1, max: 4 })
                  .chain((n) => fc.tuple(intMatrix(m, k), intMatrix(k, n))),
              ),
          ),
        ([A, B]) => {
          const AB = computeMatMul({ A: mvalue(A), B: mvalue(B) });
          const ABt = computeTranspose({ A: AB });

          const Bt = computeTranspose({ A: mvalue(B) });
          const At = computeTranspose({ A: mvalue(A) });
          const BtAt = computeMatMul({ A: Bt, B: At });

          expect(ABt.payload).toEqual(BtAt.payload);
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe("la.transpose definition explain", () => {
  test("effect returns transposed dimensions string", async () => {
    const { TransposeBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 3, n: 2, field: "real", precision: "approximate" },
      payload: [] as unknown as number,
      provenance: { blockId: "la.transpose", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(TransposeBlock.explain.effect?.({}, output)).toMatch(/3×2/);
  });

  test("impact notes rows and columns are swapped", async () => {
    const { TransposeBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 3, n: 2, field: "real", precision: "approximate" },
      payload: [] as unknown as number,
      provenance: { blockId: "la.transpose", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(TransposeBlock.explain.impact?.({}, output)).toMatch(/3×2/);
  });
});
