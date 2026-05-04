import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { AddError, computeAdd } from "./compute";

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

describe("la.add compute", () => {
  test("2×2 addition: [[1,2],[3,4]] + [[5,6],[7,8]] = [[6,8],[10,12]]", () => {
    const result = computeAdd({
      A: mvalue([
        [1, 2],
        [3, 4],
      ]),
      B: mvalue([
        [5, 6],
        [7, 8],
      ]),
    });
    expect(result.type).toEqual(REAL_MATRIX(2, 2));
    expect(result.payload).toEqual([
      [6, 8],
      [10, 12],
    ]);
  });

  test("rejects shape mismatch with typed error", () => {
    expect(() =>
      computeAdd({
        A: mvalue([
          [1, 2],
          [3, 4],
        ]),
        B: mvalue([[1, 2, 3]]),
      }),
    ).toThrow(AddError);
  });

  test("rejects missing inputs", () => {
    expect(() => computeAdd({})).toThrow(AddError);
    expect(() => computeAdd({ A: mvalue([[1]]) })).toThrow(AddError);
  });

  test("property: commutativity — A + B === B + A", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) =>
            fc.integer({ min: 1, max: 4 }).chain((n) => fc.tuple(intMatrix(m, n), intMatrix(m, n))),
          ),
        ([A, B]) => {
          const ab = computeAdd({ A: mvalue(A), B: mvalue(B) }).payload;
          const ba = computeAdd({ A: mvalue(B), B: mvalue(A) }).payload;
          expect(ab).toEqual(ba);
        },
      ),
    );
  });

  test("property: associativity — (A + B) + C === A + (B + C)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) =>
            fc
              .integer({ min: 1, max: 4 })
              .chain((n) => fc.tuple(intMatrix(m, n), intMatrix(m, n), intMatrix(m, n))),
          ),
        ([A, B, C]) => {
          const left = computeAdd({
            A: computeAdd({ A: mvalue(A), B: mvalue(B) }),
            B: mvalue(C),
          }).payload;
          const right = computeAdd({
            A: mvalue(A),
            B: computeAdd({ A: mvalue(B), B: mvalue(C) }),
          }).payload;
          expect(left).toEqual(right);
        },
      ),
    );
  });

  test("property: identity — A + 0 === A", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const m = A.length;
          const n = A[0]?.length ?? 0;
          const result = computeAdd({ A: mvalue(A), B: mvalue(zeros(m, n)) }).payload;
          expect(result).toEqual(A);
        },
      ),
    );
  });

  test("property: inverse — A + (−A) === 0", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => intMatrix(m, n))),
        (A) => {
          const negA = A.map((row) => row.map((x) => -x));
          const result = computeAdd({ A: mvalue(A), B: mvalue(negA) }).payload as number[][];
          const m = A.length;
          const n = A[0]?.length ?? 0;
          expect(result).toEqual(zeros(m, n));
        },
      ),
    );
  });
});

describe("la.add definition explain", () => {
  test("effect returns output dimensions string", async () => {
    const { AddBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 2, n: 3, field: "real" },
      payload: [
        [1, 2, 3],
        [4, 5, 6],
      ] as unknown as number,
      provenance: { blockId: "la.add", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(AddBlock.explain.effect?.({}, output)).toMatch(/2×3/);
  });

  test("impact returns dimension info string", async () => {
    const { AddBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 2, n: 3, field: "real" },
      payload: [
        [1, 2, 3],
        [4, 5, 6],
      ] as unknown as number,
      provenance: { blockId: "la.add", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(AddBlock.explain.impact?.({}, output)).toMatch(/2×3/);
  });
});
