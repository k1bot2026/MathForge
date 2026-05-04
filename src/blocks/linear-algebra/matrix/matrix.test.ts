import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { computeMatrix } from "./compute";

describe("la.matrix compute", () => {
  test("1×1 matrix packs a single entry", () => {
    const result = computeMatrix(1, 1, [[5]]);
    expect(result.type).toEqual({ kind: "Matrix", m: 1, n: 1, field: "real" });
    expect(result.payload).toEqual([[5]]);
  });

  test("2×2 identity matrix", () => {
    const result = computeMatrix(2, 2, [
      [1, 0],
      [0, 1],
    ]);
    expect(result.type).toEqual({ kind: "Matrix", m: 2, n: 2, field: "real" });
    expect(result.payload).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  test("3×2 non-square matrix", () => {
    const result = computeMatrix(3, 2, [
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    expect(result.type).toEqual({ kind: "Matrix", m: 3, n: 2, field: "real" });
    expect(result.payload).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  test("5×5 upper bound", () => {
    const data = Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 5 }, (_, c) => r * 5 + c),
    );
    const result = computeMatrix(5, 5, data);
    expect(result.type).toEqual({ kind: "Matrix", m: 5, n: 5, field: "real" });
    expect(result.payload).toEqual(data);
  });

  test("missing rows/columns beyond provided default to 0", () => {
    const result = computeMatrix(2, 3, [[1, 2]]);
    expect(result.payload).toEqual([
      [1, 2, 0],
      [0, 0, 0],
    ]);
  });

  test("non-finite entries are coerced to 0", () => {
    const result = computeMatrix(2, 2, [
      [Number.NaN, 1],
      [Infinity, -Infinity],
    ]);
    expect(result.payload).toEqual([
      [0, 1],
      [0, 0],
    ]);
  });

  test("type.m and type.n match the declared dimensions", () => {
    for (let m = 1; m <= 5; m++) {
      for (let n = 1; n <= 5; n++) {
        const data = Array.from({ length: m }, () => Array.from({ length: n }, () => 0));
        const result = computeMatrix(m, n, data);
        const t = result.type as { kind: "Matrix"; m: number; n: number };
        expect(t.m).toBe(m);
        expect(t.n).toBe(n);
      }
    }
  });

  test("property: any m×n (1-5) with finite entries round-trips exactly", () => {
    const finite = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 });
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }).chain((m) =>
          fc.integer({ min: 1, max: 5 }).chain((n) =>
            fc.tuple(
              fc.constant(m),
              fc.constant(n),
              fc.array(fc.array(finite, { minLength: n, maxLength: n }), {
                minLength: m,
                maxLength: m,
              }),
            ),
          ),
        ),
        ([m, n, rows]) => {
          const result = computeMatrix(m, n, rows);
          expect(result.payload).toEqual(rows);
          const t = result.type as { m: number; n: number };
          expect(t.m).toBe(m);
          expect(t.n).toBe(n);
        },
      ),
    );
  });

  test("property: payload dimensions always equal m×n", () => {
    const finite = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 });
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.array(finite, { maxLength: 6 }), { maxLength: 6 }),
        (m, n, rows) => {
          const result = computeMatrix(m, n, rows);
          const payload = result.payload as unknown[][];
          expect(payload.length).toBe(m);
          for (const row of payload) {
            expect(row.length).toBe(n);
          }
        },
      ),
    );
  });
});

describe("la.matrix definition explain", () => {
  test("effect shows matrix shape and top-left entry", async () => {
    const { MatrixBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 2, n: 2, field: "real" },
      payload: [
        [7, 0],
        [0, 1],
      ] as unknown as number,
      provenance: { blockId: "la.matrix", inputs: [], computedAt: 0, engine: "native" },
    };
    const msg = MatrixBlock.explain.effect?.({}, output);
    expect(msg).toMatch(/2×2/);
    expect(msg).toMatch(/7/);
  });

  test("impact shows matrix dimensions in ℝ^(m×n)", async () => {
    const { MatrixBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Matrix", m: 3, n: 3, field: "real" },
      payload: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as unknown as number,
      provenance: { blockId: "la.matrix", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(MatrixBlock.explain.impact?.({}, output)).toMatch(/3×3/);
  });
});
