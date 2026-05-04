import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import type { MathValue } from "~/math/types";
import { invertibleMatrix } from "../../../../tests/arbitraries";
import { computeLu, LuError, type LuPayload } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function approxEqual(a: number[][], b: number[][], tol = 1e-9): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i] ?? [];
    const rb = b[i] ?? [];
    if (ra.length !== rb.length) return false;
    for (let j = 0; j < ra.length; j++) {
      if (Math.abs((ra[j] ?? 0) - (rb[j] ?? 0)) > tol) return false;
    }
  }
  return true;
}

describe("la.lu compute", () => {
  test("LU of 2×2 identity: P=I, L=I, U=I", () => {
    const result = computeLu({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    const { L, U, P } = result.payload as LuPayload;
    expect(
      approxEqual(P, [
        [1, 0],
        [0, 1],
      ]),
    ).toBe(true);
    expect(
      approxEqual(L, [
        [1, 0],
        [0, 1],
      ]),
    ).toBe(true);
    expect(
      approxEqual(U, [
        [1, 0],
        [0, 1],
      ]),
    ).toBe(true);
  });

  test("output type is Tuple of three Matrix types", () => {
    const result = computeLu({
      A: mvalue([
        [2, 1],
        [4, 3],
      ]),
    });
    expect(result.type.kind).toBe("Tuple");
  });

  test("rejects non-square matrix", () => {
    expect(() =>
      computeLu({
        A: mvalue([
          [1, 2, 3],
          [4, 5, 6],
        ]),
      }),
    ).toThrow(LuError);
  });

  test("rejects missing input", () => {
    expect(() => computeLu({})).toThrow(LuError);
  });

  test("L is lower-triangular with unit diagonal", () => {
    const A = [
      [2, 1, 1],
      [4, 3, 3],
      [8, 7, 9],
    ];
    const { L } = computeLu({ A: mvalue(A) }).payload as LuPayload;
    const n = L.length;
    for (let i = 0; i < n; i++) {
      // Diagonal must be 1
      expect(Math.abs((L[i]?.[i] ?? 0) - 1)).toBeLessThan(1e-9);
      // Above-diagonal must be 0
      for (let j = i + 1; j < n; j++) {
        expect(Math.abs(L[i]?.[j] ?? 0)).toBeLessThan(1e-9);
      }
    }
  });

  test("U is upper-triangular", () => {
    const A = [
      [2, 1, 1],
      [4, 3, 3],
      [8, 7, 9],
    ];
    const { U } = computeLu({ A: mvalue(A) }).payload as LuPayload;
    const n = U.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < i; j++) {
        expect(Math.abs(U[i]?.[j] ?? 0)).toBeLessThan(1e-9);
      }
    }
  });

  test("property: P · A === L · U for invertible matrices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => invertibleMatrix(n)),
        (A) => {
          const { L, U, P } = computeLu({ A: mvalue(A) }).payload as LuPayload;
          const PA = computeMatMul({ A: mvalue(P), B: mvalue(A) }).payload as number[][];
          const LU = computeMatMul({ A: mvalue(L), B: mvalue(U) }).payload as number[][];
          expect(approxEqual(PA, LU)).toBe(true);
        },
      ),
    );
  });

  test("property: L is lower-triangular with unit diagonal for all invertible matrices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => invertibleMatrix(n)),
        (A) => {
          const { L } = computeLu({ A: mvalue(A) }).payload as LuPayload;
          const n = L.length;
          for (let i = 0; i < n; i++) {
            expect(Math.abs((L[i]?.[i] ?? 0) - 1)).toBeLessThan(1e-9);
            for (let j = i + 1; j < n; j++) {
              expect(Math.abs(L[i]?.[j] ?? 0)).toBeLessThan(1e-9);
            }
          }
        },
      ),
    );
  });

  test("property: U is upper-triangular for all invertible matrices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => invertibleMatrix(n)),
        (A) => {
          const { U } = computeLu({ A: mvalue(A) }).payload as LuPayload;
          const n = U.length;
          for (let i = 0; i < n; i++) {
            for (let j = 0; j < i; j++) {
              expect(Math.abs(U[i]?.[j] ?? 0)).toBeLessThan(1e-9);
            }
          }
        },
      ),
    );
  });
});

describe("la.lu definition explain", () => {
  test("effect and impact return non-empty static strings", async () => {
    const { LuBlock } = await import("./definition");
    const scalarOut: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0,
      provenance: { blockId: "la.lu", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(LuBlock.explain.effect?.({}, scalarOut)).toBeTruthy();
    expect(LuBlock.explain.impact?.({}, scalarOut)).toBeTruthy();
  });
});
