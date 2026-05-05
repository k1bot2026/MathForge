import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, MatrixPayload, VectorPayload } from "~/math/types";
import { solveLP } from "./compute";
import { SimplexBlock, SimplexError } from "./definition";

const ctx = { signal: new AbortController().signal };

function makeVector(values: number[]): MathValue {
  return {
    type: { kind: "Vector", n: values.length, field: "real" },
    payload: values as VectorPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeMatrix(rows: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: rows.length, n: rows[0]?.length ?? 0, field: "real" },
    payload: rows as MatrixPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function makeLPTuple(c: number[], A: number[][], b: number[]): MathValue {
  return {
    type: {
      kind: "Tuple",
      elements: [
        { kind: "Vector", n: c.length, field: "real" },
        { kind: "Matrix", m: A.length, n: c.length, field: "real" },
        { kind: "Vector", n: b.length, field: "real" },
      ],
    },
    payload: [makeVector(c), makeMatrix(A), makeVector(b)],
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

// Classic 2-variable LP:
//   minimize  -x1 - x2   (maximize x1 + x2)
//   s.t.      x1 + x2 ≤ 4
//             x1 - x2 ≤ 2
//             x1, x2 ≥ 0
// Optimal: x1 = 3, x2 = 1, value = -4
const lp2 = makeLPTuple(
  [-1, -1],
  [
    [1, 1],
    [1, -1],
  ],
  [4, 2],
);

describe("solveLP (unit)", () => {
  test("2-variable LP optimal value", () => {
    const { objectiveValue } = solveLP(
      [-1, -1],
      [
        [1, 1],
        [1, -1],
      ],
      [4, 2],
    );
    expect(objectiveValue).toBeCloseTo(-4, 6);
  });

  test("2-variable LP optimal x", () => {
    const { x } = solveLP(
      [-1, -1],
      [
        [1, 1],
        [1, -1],
      ],
      [4, 2],
    );
    expect(x[0]).toBeCloseTo(3, 6);
    expect(x[1]).toBeCloseTo(1, 6);
  });

  test("single-variable: minimize -x s.t. x ≤ 5", () => {
    const { x, objectiveValue } = solveLP([-1], [[1]], [5]);
    expect(x[0]).toBeCloseTo(5, 6);
    expect(objectiveValue).toBeCloseTo(-5, 6);
  });

  test("zero objective: any feasible x satisfies", () => {
    const { objectiveValue } = solveLP(
      [0, 0],
      [
        [1, 0],
        [0, 1],
      ],
      [3, 3],
    );
    expect(objectiveValue).toBeCloseTo(0, 6);
  });

  test("throws on unbounded LP", () => {
    // minimize -x with no upper bound on x (no constraint)
    // Standard simplex can't proceed — no finite optimum
    expect(() => solveLP([-1], [[-1]], [0])).toThrow(SimplexError);
  });

  test("solution satisfies Ax ≤ b", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 4 }), (n) => {
        // Build a feasible LP with known solution at origin
        const c = Array.from({ length: n }, () => 1); // minimize sum(x)
        const A = Array.from({ length: n }, (_, i) => {
          const row = new Array<number>(n).fill(0);
          row[i] = 1;
          return row;
        });
        const b = Array.from({ length: n }, () => 10);
        const { x } = solveLP(c, A, b);
        // x ≥ 0 (simplex guarantees)
        for (let i = 0; i < n; i++) {
          expect(x[i] ?? 0).toBeGreaterThanOrEqual(-1e-8);
        }
        // Ax ≤ b
        for (let i = 0; i < n; i++) {
          let lhs = 0;
          for (let j = 0; j < n; j++) lhs += (A[i]?.[j] ?? 0) * (x[j] ?? 0);
          expect(lhs).toBeLessThanOrEqual((b[i] ?? 0) + 1e-8);
        }
      }),
    );
  });
});

describe("opt.simplex block", () => {
  test("id is opt.simplex", () => {
    expect(SimplexBlock.id).toBe("opt.simplex");
  });

  test("output type is Tuple", () => {
    const result = SimplexBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    expect(result.type.kind).toBe("Tuple");
  });

  test("first element of result is Vector (optimal x)", () => {
    const result = SimplexBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    const [xOut] = result.payload as [MathValue];
    expect(xOut?.type.kind).toBe("Vector");
  });

  test("second element of result is Scalar (objective value)", () => {
    const result = SimplexBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    const [, objOut] = result.payload as [MathValue, MathValue];
    expect(objOut?.type.kind).toBe("Scalar");
  });

  test("optimal objective value is -4 for classic 2-var LP", () => {
    const result = SimplexBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    const [, objOut] = result.payload as [MathValue, MathValue];
    expect(objOut?.payload as number).toBeCloseTo(-4, 6);
  });

  test("optimal x has correct values for classic 2-var LP", () => {
    const result = SimplexBlock.compute({ lp: lp2 }, {}, ctx) as MathValue;
    const [xOut] = result.payload as [MathValue];
    const vals = xOut?.payload as VectorPayload;
    expect(vals[0] as number).toBeCloseTo(3, 6);
    expect(vals[1] as number).toBeCloseTo(1, 6);
  });

  test("throws SimplexError when lp missing", () => {
    expect(() => SimplexBlock.compute({}, {}, ctx)).toThrow(SimplexError);
  });

  test("explain.effect prompts when lp missing", () => {
    const msg = SimplexBlock.explain.effect?.({}, {} as MathValue);
    expect(msg).toContain("Connect");
  });
});
