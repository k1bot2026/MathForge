import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeAdd } from "~/blocks/linear-algebra/add/compute";
import type { MathValue } from "~/math/types";
import { computeSub, SubError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function zeros(m: number, n: number): number[][] {
  return Array.from({ length: m }, () => Array.from({ length: n }, () => 0));
}

const intMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -10, max: 10 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

describe("la.sub compute", () => {
  test("2×2 subtraction: [[6,8],[10,12]] - [[5,6],[7,8]] = [[1,2],[3,4]]", () => {
    const result = computeSub({
      A: mvalue([
        [6, 8],
        [10, 12],
      ]),
      B: mvalue([
        [5, 6],
        [7, 8],
      ]),
    });
    expect(result.type).toEqual(REAL_MATRIX(2, 2));
    expect(result.payload).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  test("rejects shape mismatch with typed error", () => {
    expect(() =>
      computeSub({
        A: mvalue([
          [1, 2],
          [3, 4],
        ]),
        B: mvalue([[1, 2, 3]]),
      }),
    ).toThrow(SubError);
  });

  test("rejects missing inputs", () => {
    expect(() => computeSub({})).toThrow(SubError);
    expect(() => computeSub({ A: mvalue([[1]]) })).toThrow(SubError);
  });

  test("property: A - B === A + (-B)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) =>
            fc.integer({ min: 1, max: 4 }).chain((n) => fc.tuple(intMatrix(m, n), intMatrix(m, n))),
          ),
        ([A, B]) => {
          const sub = computeSub({ A: mvalue(A), B: mvalue(B) }).payload as number[][];
          const negB = B.map((row) => row.map((x) => -x));
          const addNeg = computeAdd({ A: mvalue(A), B: mvalue(negB) }).payload as number[][];
          expect(sub).toEqual(addNeg);
        },
      ),
    );
  });

  test("property: A - A === 0", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const m = A.length;
          const n = A[0]?.length ?? 0;
          const result = computeSub({ A: mvalue(A), B: mvalue(A) }).payload as number[][];
          expect(result).toEqual(zeros(m, n));
        },
      ),
    );
  });

  test("property: A - 0 === A", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const m = A.length;
          const n = A[0]?.length ?? 0;
          const result = computeSub({ A: mvalue(A), B: mvalue(zeros(m, n)) }).payload as number[][];
          expect(result).toEqual(A);
        },
      ),
    );
  });
});

describe("la.sub definition explain", () => {
  test("effect returns output dimensions string", async () => {
    const { SubBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 2, n: 3, field: "real", precision: "approximate" },
      payload: [
        [1, 2, 3],
        [4, 5, 6],
      ] as unknown as number,
      provenance: { blockId: "la.sub", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(SubBlock.explain.effect?.({}, output)).toMatch(/2×3/);
  });

  test("impact returns dimension info string", async () => {
    const { SubBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 2, n: 3, field: "real", precision: "approximate" },
      payload: [
        [1, 2, 3],
        [4, 5, 6],
      ] as unknown as number,
      provenance: { blockId: "la.sub", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(SubBlock.explain.impact?.({}, output)).toMatch(/2×3/);
  });
});
