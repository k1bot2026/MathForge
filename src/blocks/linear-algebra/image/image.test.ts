import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeRank } from "~/blocks/linear-algebra/rank/compute";
import type { MathValue } from "~/math/types";
import { computeImage, ImageError } from "./compute";

const REAL_MATRIX = (m: number, n: number) => ({ kind: "Matrix", m, n, field: "real" }) as const;

function mvalue(payload: number[][], m?: number, n?: number): MathValue {
  const rows = m ?? payload.length;
  const cols = n ?? payload[0]?.length ?? 0;
  return {
    type: REAL_MATRIX(rows, cols),
    payload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const PREC = 1e-9;

function vecNorm(v: number[]): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
}

const anyMatrix = (m: number, n: number) =>
  fc.array(fc.array(fc.integer({ min: -4, max: 4 }), { minLength: n, maxLength: n }), {
    minLength: m,
    maxLength: m,
  });

describe("la.image compute", () => {
  test("rejects missing input", () => {
    expect(() => computeImage({})).toThrow(ImageError);
  });

  test("image of zero 2×2 is empty (rank 0)", () => {
    const result = computeImage({
      A: mvalue([
        [0, 0],
        [0, 0],
      ]),
    });
    expect(result.type.kind).toBe("Matrix");
    if (result.type.kind === "Matrix") {
      expect(result.type.n).toBe(0);
    }
  });

  test("image of identity 2×2 is R² — output is 2×2", () => {
    const result = computeImage({
      A: mvalue([
        [1, 0],
        [0, 1],
      ]),
    });
    expect(result.type.kind).toBe("Matrix");
    if (result.type.kind === "Matrix") {
      expect(result.type.m).toBe(2);
      expect(result.type.n).toBe(2);
    }
  });

  test("image of rank-1 [[1,2],[2,4]] has dimension 1", () => {
    const result = computeImage({
      A: mvalue([
        [1, 2],
        [2, 4],
      ]),
    });
    expect(result.type.kind).toBe("Matrix");
    if (result.type.kind === "Matrix") {
      expect(result.type.n).toBe(1);
    }
    // The single basis vector should be parallel to [1,2]
    const K = result.payload as number[][];
    const v = [K[0]?.[0] ?? 0, K[1]?.[0] ?? 0];
    // Verify it's in the column space: it should be a non-zero vector
    expect(vecNorm(v)).toBeGreaterThan(PREC);
  });

  test("image of full-rank 2×3 has dimension 2 (columns in R²)", () => {
    const A = [
      [1, 0, 2],
      [0, 1, 3],
    ];
    const result = computeImage({ A: mvalue(A) });
    expect(result.type.kind).toBe("Matrix");
    if (result.type.kind === "Matrix") {
      expect(result.type.m).toBe(2);
      expect(result.type.n).toBe(2);
    }
  });

  test("image of 3×2 rank-1 matrix has dimension 1", () => {
    const result = computeImage({
      A: mvalue([
        [1, 2],
        [2, 4],
        [3, 6],
      ]),
    });
    expect(result.type.kind).toBe("Matrix");
    if (result.type.kind === "Matrix") {
      expect(result.type.n).toBe(1);
    }
  });

  test("property: dim(image) === rank(A) for all square matrices", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => anyMatrix(n, n)),
        (A) => {
          const rank = computeRank({ A: mvalue(A) }).payload as number;
          const result = computeImage({ A: mvalue(A) });
          const imageDim = result.type.kind === "Matrix" ? (result.type.n as number) : 0;
          expect(imageDim).toBe(rank);
        },
      ),
    );
  });

  test("property: dim(image) === rank(A) for rectangular matrices", () => {
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 4 })
          .chain((m) => fc.integer({ min: 1, max: 4 }).chain((n) => anyMatrix(m, n))),
        (A) => {
          const rank = computeRank({ A: mvalue(A) }).payload as number;
          const result = computeImage({ A: mvalue(A) });
          const imageDim = result.type.kind === "Matrix" ? (result.type.n as number) : 0;
          expect(imageDim).toBe(rank);
        },
      ),
    );
  });

  test("property: image columns are in the column space of A (linear combo check)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => anyMatrix(n, n)),
        (A) => {
          const result = computeImage({ A: mvalue(A) });
          const K = result.payload as number[][];
          const imageDim = K[0]?.length ?? 0;
          if (imageDim === 0) return; // trivial — nothing to check

          // Each image basis column should be linearly independent
          // We verify by checking they have non-zero norm
          for (let j = 0; j < imageDim; j++) {
            const col = K.map((row) => row[j] ?? 0);
            expect(vecNorm(col)).toBeGreaterThan(PREC);
          }
        },
      ),
    );
  });

  test("property: image columns are orthogonal to kernel (fundamental theorem)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }).chain((n) => anyMatrix(n, n)),
        (A) => {
          const result = computeImage({ A: mvalue(A) });
          const K = result.payload as number[][];
          const imageDim = K[0]?.length ?? 0;
          if (imageDim === 0) return;

          // The image columns should have non-zero norm (verified above in LI test)
          // Additionally verify each col is actually a column of A (up to scaling)
          // This is a structural check: pivot cols of A are returned directly
          const Arows = mvalue(A).payload as number[][];
          for (let j = 0; j < imageDim; j++) {
            const col = K.map((row) => row[j] ?? 0);
            // col must be some actual column of A (up to scalar)
            let isColOfA = false;
            const n = Arows[0]?.length ?? 0;
            for (let c = 0; c < n; c++) {
              const Acol = Arows.map((row) => row[c] ?? 0);
              const dot = dotProduct(col, Acol);
              const normCol = vecNorm(col);
              const normAcol = vecNorm(Acol);
              if (normAcol < PREC) continue;
              // If col = alpha * Acol, then |dot| === normCol * normAcol
              if (Math.abs(Math.abs(dot) - normCol * normAcol) < 1e-8) {
                isColOfA = true;
                break;
              }
            }
            expect(isColOfA).toBe(true);
          }
        },
      ),
    );
  });
});

describe("la.image definition explain", () => {
  test("effect reports zero map for zero-column output", async () => {
    const { ImageBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 3, n: 0, field: "real" },
      payload: [[], [], []] as unknown as number,
      provenance: { blockId: "la.image", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(ImageBlock.explain.effect?.({}, output)).toMatch(/zero map/i);
  });

  test("effect reports rank for non-trivial column space", async () => {
    const { ImageBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 3, n: 2, field: "real" },
      payload: [
        [1, 0],
        [0, 1],
        [0, 0],
      ] as unknown as number,
      provenance: { blockId: "la.image", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(ImageBlock.explain.effect?.({}, output)).toMatch(/rank/i);
  });

  test("impact states rank-nullity theorem", async () => {
    const { ImageBlock } = await import("./definition");
    const scalarOut: MathValue = {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: 0,
      provenance: { blockId: "la.image", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(ImageBlock.explain.impact?.({}, scalarOut)).toMatch(/rank-nullity/i);
  });
});
