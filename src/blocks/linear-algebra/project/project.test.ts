import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { computeProject, ProjectError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;
const REAL_VECTOR = (n: number) => ({ kind: "Vector", n, field: "real" }) as const;

function mvalue(payload: number[][]): MathValue {
  return {
    type: REAL_MATRIX(payload.length, payload[0]?.length ?? 0),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function vvalue(payload: number[]): MathValue {
  return {
    type: REAL_VECTOR(payload.length),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const PREC = 1e-8;

function vecNorm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
}

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((s, a, j) => s + a * (x[j] ?? 0), 0));
}

describe("la.project compute", () => {
  test("rejects missing A", () => {
    expect(() =>
      computeProject({
        v: vvalue([1, 2]),
      }),
    ).toThrow(ProjectError);
  });

  test("rejects missing v", () => {
    expect(() =>
      computeProject({
        A: mvalue([
          [1, 0],
          [0, 1],
        ]),
      }),
    ).toThrow(ProjectError);
  });

  test("rejects dimension mismatch", () => {
    expect(() =>
      computeProject({
        A: mvalue([
          [1, 0],
          [0, 1],
        ]),
        v: vvalue([1, 2, 3]),
      }),
    ).toThrow(ProjectError);
  });

  test("projection onto full space (identity A) equals v", () => {
    const v = [3, 4];
    const result = computeProject({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
      v: vvalue(v),
    });
    const pv = result.payload as number[];
    expect(pv[0]).toBeCloseTo(3, 9);
    expect(pv[1]).toBeCloseTo(4, 9);
  });

  test("projection onto x-axis column span of [[1],[0]] is [v0, 0]", () => {
    // A = [[1],[0]] — column is x-axis
    const result = computeProject({
      A: mvalue([[1], [0]]),
      v: vvalue([3, 5]),
    });
    const pv = result.payload as number[];
    expect(pv[0]).toBeCloseTo(3, 9);
    expect(pv[1]).toBeCloseTo(0, 9);
  });

  test("projection of v onto its own span equals v (idempotent special case)", () => {
    // A = [[1],[1]] — line y=x, v = [2,2]
    const result = computeProject({
      A: mvalue([[1], [1]]),
      v: vvalue([2, 2]),
    });
    const pv = result.payload as number[];
    expect(pv[0]).toBeCloseTo(2, 9);
    expect(pv[1]).toBeCloseTo(2, 9);
  });

  test("projection of orthogonal vector gives zero", () => {
    // A = [[1],[0]], v = [0,1] — v ⊥ span(A)
    const result = computeProject({
      A: mvalue([[1], [0]]),
      v: vvalue([0, 1]),
    });
    const pv = result.payload as number[];
    expect(vecNorm(pv)).toBeCloseTo(0, 9);
  });

  test("output type is Vector<m>", () => {
    const result = computeProject({
      A: mvalue([
        [1, 0],
        [0, 1],
        [0, 0],
      ]),
      v: vvalue([1, 2, 3]),
    });
    expect(result.type.kind).toBe("Vector");
    if (result.type.kind === "Vector") {
      expect(result.type.n).toBe(3);
    }
  });

  test("property: idempotence P·(P·v) ≈ P·v for full-rank square A", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) =>
          fc
            .array(fc.array(fc.integer({ min: -3, max: 3 }), { minLength: n, maxLength: n }), {
              minLength: n,
              maxLength: n,
            })
            .chain((A) =>
              fc
                .array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n })
                .map((v) => ({ A, v })),
            ),
        ),
        ({ A, v }) => {
          // Skip rank-deficient matrices (AᵀA singular)
          let result1: MathValue;
          try {
            result1 = computeProject({ A: mvalue(A), v: vvalue(v) });
          } catch {
            return; // skip singular AᵀA
          }
          const Pv = result1.payload as number[];
          let result2: MathValue;
          try {
            result2 = computeProject({ A: mvalue(A), v: vvalue(Pv) });
          } catch {
            return;
          }
          const PPv = result2.payload as number[];
          for (let i = 0; i < v.length; i++) {
            expect(Math.abs((PPv[i] ?? 0) - (Pv[i] ?? 0))).toBeLessThan(PREC);
          }
        },
      ),
    );
  });

  test("property: (v − P·v) ⊥ image(A) for full-rank A", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) =>
          fc
            .array(fc.array(fc.integer({ min: -3, max: 3 }), { minLength: n, maxLength: n }), {
              minLength: n,
              maxLength: n,
            })
            .chain((A) =>
              fc
                .array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n })
                .map((v) => ({ A, v })),
            ),
        ),
        ({ A, v }) => {
          let result: MathValue;
          try {
            result = computeProject({ A: mvalue(A), v: vvalue(v) });
          } catch {
            return; // skip singular AᵀA
          }
          const Pv = result.payload as number[];
          // residual r = v - P·v
          const r = v.map((x, i) => x - (Pv[i] ?? 0));
          // r should be ⊥ to each column of A
          const m = A.length;
          const ncols = A[0]?.length ?? 0;
          for (let c = 0; c < ncols; c++) {
            const col = Array.from({ length: m }, (_, row) => A[row]?.[c] ?? 0);
            const d = dotProduct(r, col);
            expect(Math.abs(d)).toBeLessThan(PREC);
          }
        },
      ),
    );
  });

  test("property: ||P·v|| ≤ ||v|| (projection never amplifies)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) =>
          fc
            .array(fc.array(fc.integer({ min: -3, max: 3 }), { minLength: n, maxLength: n }), {
              minLength: n,
              maxLength: n,
            })
            .chain((A) =>
              fc
                .array(fc.integer({ min: -5, max: 5 }), { minLength: n, maxLength: n })
                .map((v) => ({ A, v })),
            ),
        ),
        ({ A, v }) => {
          let result: MathValue;
          try {
            result = computeProject({ A: mvalue(A), v: vvalue(v) });
          } catch {
            return;
          }
          const Pv = result.payload as number[];
          // Allow small numerical tolerance
          expect(vecNorm(Pv)).toBeLessThanOrEqual(vecNorm(v) + PREC);
        },
      ),
    );
  });

  test("property: rectangular overdetermined A (m>n) idempotence", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 2, max: 4 })
          .chain((m) =>
            fc
              .integer({ min: 1, max: m })
              .chain((n) =>
                fc
                  .array(
                    fc.array(fc.integer({ min: -3, max: 3 }), { minLength: n, maxLength: n }),
                    { minLength: m, maxLength: m },
                  )
                  .chain((A) =>
                    fc
                      .array(fc.integer({ min: -5, max: 5 }), { minLength: m, maxLength: m })
                      .map((v) => ({ A, v })),
                  ),
              ),
          ),
        ({ A, v }) => {
          let result1: MathValue;
          try {
            result1 = computeProject({ A: mvalue(A), v: vvalue(v) });
          } catch {
            return;
          }
          const Pv = result1.payload as number[];
          let result2: MathValue;
          try {
            result2 = computeProject({ A: mvalue(A), v: vvalue(Pv) });
          } catch {
            return;
          }
          const PPv = result2.payload as number[];
          for (let i = 0; i < v.length; i++) {
            expect(Math.abs((PPv[i] ?? 0) - (Pv[i] ?? 0))).toBeLessThan(PREC);
          }
        },
      ),
    );
  });

  void matVec; // referenced only in comments above for clarity
});
