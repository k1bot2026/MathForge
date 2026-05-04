import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeMatMul } from "~/blocks/linear-algebra/matmul/compute";
import { computeTranspose } from "~/blocks/linear-algebra/transpose/compute";
import type { MathValue } from "~/math/types";
import { computeQr, QrError, type QrPayload } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function approxEqual(a: number[][], b: number[][], tol = 1e-6): boolean {
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

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

const intMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

describe("la.qr compute", () => {
  test("QR of 2×2 identity: Q=I, R=I", () => {
    const result = computeQr({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    const { Q, R } = result.payload as QrPayload;
    expect(
      approxEqual(Q, [
        [1, 0],
        [0, 1],
      ]),
    ).toBe(true);
    expect(
      approxEqual(R, [
        [1, 0],
        [0, 1],
      ]),
    ).toBe(true);
  });

  test("output type is Tuple of two Matrix types", () => {
    const result = computeQr({
      A: mvalue([
        [1, 2],
        [3, 4],
      ]),
    });
    expect(result.type.kind).toBe("Tuple");
  });

  test("rejects missing input", () => {
    expect(() => computeQr({})).toThrow(QrError);
  });

  test("R is upper-triangular for a 3×2 matrix", () => {
    const { R } = computeQr({
      A: mvalue([
        [1, 2],
        [3, 4],
        [5, 6],
      ]),
    }).payload as QrPayload;
    // R is 3×2; entries below diagonal (i>j) should be zero
    for (let i = 0; i < R.length; i++) {
      for (let j = 0; j < i && j < (R[i]?.length ?? 0); j++) {
        expect(Math.abs(R[i]?.[j] ?? 0)).toBeLessThan(1e-9);
      }
    }
  });

  test("property: A === Q · R (tolerance 1e-6)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: m }).chain((n) => intMatrix(m, n))),
        (A) => {
          const { Q, R } = computeQr({ A: mvalue(A) }).payload as QrPayload;
          const QR = computeMatMul({ A: mvalue(Q), B: mvalue(R) }).payload as number[][];
          expect(approxEqual(A, QR, 1e-6)).toBe(true);
        },
      ),
    );
  });

  test("property: Qᵀ · Q === I_m (Q is orthogonal, tolerance 1e-6)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: m }).chain((n) => intMatrix(m, n))),
        (A) => {
          const m = A.length;
          const { Q } = computeQr({ A: mvalue(A) }).payload as QrPayload;
          const Qt = computeTranspose({ A: mvalue(Q) }).payload as number[][];
          const QtQ = computeMatMul({ A: mvalue(Qt), B: mvalue(Q) }).payload as number[][];
          expect(approxEqual(QtQ, identity(m), 1e-6)).toBe(true);
        },
      ),
    );
  });

  test("property: R is upper-triangular for all m×n matrices (m≥n)", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: m }).chain((n) => intMatrix(m, n))),
        (A) => {
          const { R } = computeQr({ A: mvalue(A) }).payload as QrPayload;
          for (let i = 0; i < R.length; i++) {
            for (let j = 0; j < i && j < (R[i]?.length ?? 0); j++) {
              expect(Math.abs(R[i]?.[j] ?? 0)).toBeLessThan(1e-6);
            }
          }
        },
      ),
    );
  });
});

describe("la.qr definition explain", () => {
  test("effect and impact return non-empty static strings", async () => {
    const { QrBlock } = await import("./definition");
    const scalarOut: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0,
      provenance: { blockId: "la.qr", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(QrBlock.explain.effect?.({}, scalarOut)).toBeTruthy();
    expect(QrBlock.explain.impact?.({}, scalarOut)).toBeTruthy();
  });
});
