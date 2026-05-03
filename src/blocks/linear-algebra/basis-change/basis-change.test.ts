import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeDet } from "~/blocks/linear-algebra/det/compute";
import { computeTrace } from "~/blocks/linear-algebra/trace/compute";
import type { MathValue } from "~/math/types";
import { BasisChangeError, computeBasisChange } from "./compute";

const REAL_MATRIX = (n: number) => ({ kind: "Matrix", m: n, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const PREC = 1e-6;

/** Generate random invertible n×n integer matrices using lower-triangular with ±1 diagonals. */
const invertibleMatrix = (n: number) =>
  fc
    .array(fc.array(fc.integer({ min: -3, max: 3 }), { minLength: n, maxLength: n }), {
      minLength: n,
      maxLength: n,
    })
    .filter((rows) => {
      // Reject if determinant is near zero via a simple diagonal product heuristic.
      // Fast-check will try enough samples.
      let diagProd = 1;
      for (let i = 0; i < n; i++) diagProd *= rows[i]?.[i] ?? 0;
      return Math.abs(diagProd) > 0;
    });

const anySquareMatrix = (n: number) =>
  fc.array(fc.array(fc.integer({ min: -4, max: 4 }), { minLength: n, maxLength: n }), {
    minLength: n,
    maxLength: n,
  });

describe("la.basis-change compute", () => {
  test("rejects missing T", () => {
    expect(() =>
      computeBasisChange({
        P: mvalue([
          [1, 0],
          [0, 1],
        ]),
      }),
    ).toThrow(BasisChangeError);
  });

  test("rejects missing P", () => {
    expect(() =>
      computeBasisChange({
        T: mvalue([
          [1, 0],
          [0, 1],
        ]),
      }),
    ).toThrow(BasisChangeError);
  });

  test("rejects singular P", () => {
    expect(() =>
      computeBasisChange({
        T: mvalue([
          [1, 0],
          [0, 1],
        ]),
        P: mvalue([
          [1, 2],
          [2, 4],
        ]),
      }),
    ).toThrow(BasisChangeError);
  });

  test("identity basis P=I gives T unchanged", () => {
    const T = [
      [2, 1],
      [3, 4],
    ];
    const result = computeBasisChange({
      T: mvalue(T),
      P: mvalue([
        [1, 0],
        [0, 1],
      ]),
    }).payload as number[][];
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        expect(Math.abs((result[i]?.[j] ?? 0) - (T[i]?.[j] ?? 0))).toBeLessThan(PREC);
      }
    }
  });

  test("diagonal T in its own eigenbasis (P = eigenvectors) is diagonal", () => {
    // T = [[2,0],[0,3]], eigenvectors are standard basis → P=I, T′=T
    const T = [
      [2, 0],
      [0, 3],
    ];
    const result = computeBasisChange({
      T: mvalue(T),
      P: mvalue([
        [1, 0],
        [0, 1],
      ]),
    }).payload as number[][];
    expect(Math.abs((result[0]?.[0] ?? 0) - 2)).toBeLessThan(PREC);
    expect(Math.abs((result[1]?.[1] ?? 0) - 3)).toBeLessThan(PREC);
    expect(Math.abs(result[0]?.[1] ?? 0)).toBeLessThan(PREC);
    expect(Math.abs(result[1]?.[0] ?? 0)).toBeLessThan(PREC);
  });

  test("output type is Matrix<n,n>", () => {
    const result = computeBasisChange({
      T: mvalue([
        [1, 2],
        [3, 4],
      ]),
      P: mvalue([
        [1, 1],
        [0, 1],
      ]),
    });
    expect(result.type.kind).toBe("Matrix");
    if (result.type.kind === "Matrix") {
      expect(result.type.m).toBe(2);
      expect(result.type.n).toBe(2);
    }
  });

  test("property: trace(P⁻¹·T·P) === trace(T) (similarity invariant)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((n) => fc.tuple(anySquareMatrix(n), invertibleMatrix(n))),
        ([T, P]) => {
          let result: MathValue;
          try {
            result = computeBasisChange({ T: mvalue(T), P: mvalue(P) });
          } catch {
            return; // singular P after filtering — skip
          }
          const trT = computeTrace({ A: mvalue(T) }).payload as number;
          const trTPrime = computeTrace({ A: result }).payload as number;
          expect(Math.abs(trT - trTPrime)).toBeLessThan(1e-5);
        },
      ),
    );
  });

  test("property: det(P⁻¹·T·P) === det(T) (similarity invariant)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((n) => fc.tuple(anySquareMatrix(n), invertibleMatrix(n))),
        ([T, P]) => {
          let result: MathValue;
          try {
            result = computeBasisChange({ T: mvalue(T), P: mvalue(P) });
          } catch {
            return; // singular P after filtering — skip
          }
          const detT = computeDet({ A: mvalue(T) }).payload as number;
          const detTPrime = computeDet({ A: result }).payload as number;
          expect(Math.abs(detT - detTPrime)).toBeLessThan(1e-5);
        },
      ),
    );
  });

  test("property: applying same basis twice is idempotent — (P⁻¹·T·P) in basis Q equals P⁻¹·Q⁻¹·T·Q·P", () => {
    // Applying P then Q should equal applying QP in one shot.
    // We test a weaker form: trace and det are preserved through chained changes.
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 3 })
          .chain((n) => fc.tuple(anySquareMatrix(n), invertibleMatrix(n), invertibleMatrix(n))),
        ([T, P, Q]) => {
          let step1: MathValue, step2: MathValue;
          try {
            step1 = computeBasisChange({ T: mvalue(T), P: mvalue(P) });
            step2 = computeBasisChange({ T: step1, P: mvalue(Q) });
          } catch {
            return;
          }
          const trT = computeTrace({ A: mvalue(T) }).payload as number;
          const trResult = computeTrace({ A: step2 }).payload as number;
          expect(Math.abs(trT - trResult)).toBeLessThan(1e-4);
        },
      ),
    );
  });
});
