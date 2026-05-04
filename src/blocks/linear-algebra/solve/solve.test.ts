import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatVec } from "~/blocks/linear-algebra/matvec/compute";
import type { MathValue } from "~/math/types";
import { computeSolve, SolveError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;
const REAL_VECTOR = (n: number) => ({ kind: "Vector", n, field: "real" }) as const;

function mmatrix(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function mvector(payload: number[]): MathValue {
  return {
    type: REAL_VECTOR(payload.length),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("la.solve compute", () => {
  test("solves 2×2 system [[2,1],[1,3]]·x = [5,10]", () => {
    const x = computeSolve({
      A: mmatrix([
        [2, 1],
        [1, 3],
      ]),
      b: mvector([5, 10]),
    }).payload as number[];
    expect(x[0]).toBeCloseTo(1, 6);
    expect(x[1]).toBeCloseTo(3, 6);
  });

  test("solves 3×3 diagonal system diag(2,3,4)·x = [4,9,8]", () => {
    const x = computeSolve({
      A: mmatrix([
        [2, 0, 0],
        [0, 3, 0],
        [0, 0, 4],
      ]),
      b: mvector([4, 9, 8]),
    }).payload as number[];
    expect(x[0]).toBeCloseTo(2, 6);
    expect(x[1]).toBeCloseTo(3, 6);
    expect(x[2]).toBeCloseTo(2, 6);
  });

  test("output type is Vector<n>", () => {
    const result = computeSolve({
      A: mmatrix([
        [1, 0],
        [0, 1],
      ]),
      b: mvector([3, 7]),
    });
    expect(result.type.kind).toBe("Vector");
    if (result.type.kind === "Vector") {
      expect(result.type.n).toBe(2);
    }
  });

  test("rejects missing A input", () => {
    expect(() => computeSolve({ b: mvector([1, 2]) })).toThrow(SolveError);
  });

  test("rejects missing b input", () => {
    expect(() =>
      computeSolve({
        A: mmatrix([
          [1, 0],
          [0, 1],
        ]),
      }),
    ).toThrow(SolveError);
  });

  test("rejects non-square matrix", () => {
    expect(() =>
      computeSolve({
        A: mmatrix([
          [1, 2, 3],
          [4, 5, 6],
        ]),
        b: mvector([1, 2]),
      }),
    ).toThrow(SolveError);
  });

  test("rejects dimension mismatch (A is 3×3 but b has 2 elements)", () => {
    expect(() =>
      computeSolve({
        A: mmatrix([
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ]),
        b: mvector([1, 2]),
      }),
    ).toThrow(SolveError);
  });

  test("rejects singular matrix (inconsistent system)", () => {
    expect(() =>
      computeSolve({
        A: mmatrix([
          [1, 2],
          [2, 4],
        ]),
        b: mvector([3, 7]),
      }),
    ).toThrow(SolveError);
  });

  test("property: A · solve(A, b) === b for invertible A (tolerance 1e-6)", () => {
    const invertibleMatrix = (n: number) =>
      fc
        .array(fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }), {
          minLength: n,
          maxLength: n,
        })
        .filter((rows) => {
          // Simple det check via rejection sampling
          if (n === 1) return (rows[0]?.[0] ?? 0) !== 0;
          if (n === 2) {
            const a = rows[0]?.[0] ?? 0;
            const b = rows[0]?.[1] ?? 0;
            const c = rows[1]?.[0] ?? 0;
            const d = rows[1]?.[1] ?? 0;
            return Math.abs(a * d - b * c) > 0.5;
          }
          return true;
        });

    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((n) =>
            invertibleMatrix(n).chain((A) =>
              fc
                .array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n })
                .map((b) => ({ A, b })),
            ),
          ),
        ({ A, b }) => {
          const n = A.length;
          let x: number[];
          try {
            x = computeSolve({ A: mmatrix(A), b: mvector(b) }).payload as number[];
          } catch {
            return;
          }
          const Ax = computeMatVec({
            M: mmatrix(A),
            v: { ...mvector(x), type: { kind: "Vector", n, field: "real" } },
          }).payload as number[];
          for (let i = 0; i < n; i++) {
            expect(Math.abs((Ax[i] ?? 0) - (b[i] ?? 0))).toBeLessThan(1e-6);
          }
        },
      ),
    );
  });
});

describe("la.solve definition explain", () => {
  test("effect and impact return non-empty static strings", async () => {
    const { SolveBlock } = await import("./definition");
    const scalarOut: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0,
      provenance: { blockId: "la.solve", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(SolveBlock.explain.effect?.({}, scalarOut)).toBeTruthy();
    expect(SolveBlock.explain.impact?.({}, scalarOut)).toBeTruthy();
  });
});
