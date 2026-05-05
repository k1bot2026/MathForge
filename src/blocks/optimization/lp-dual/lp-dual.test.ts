import { describe, expect, test } from "vitest";
import type { MathValue, MatrixPayload, VectorPayload } from "~/math/types";
import { LpDualBlock, LpDualError } from "./definition";

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
    type: {
      kind: "Matrix",
      m: rows.length,
      n: rows[0]?.length ?? 0,
      field: "real",
    },
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

// Primal LP:
//   minimize  -x1 - x2
//   s.t.      x1 + x2 ≤ 4
//             x1 - x2 ≤ 2
//             x1, x2 ≥ 0
//
// Dual LP (max b^T y s.t. A^T y ≤ c, y ≥ 0):
//   max  4y1 + 2y2
//   s.t. y1 + y2 ≤ -1   (column 1 of A^T is [1, 1], dual_b[0] = c[0] = -1)
//        y1 - y2 ≤ -1   (column 2 of A^T is [1, -1], dual_b[1] = c[1] = -1)
//        y1, y2 ≥ 0
//
// In minimization form: min (-4)y1 + (-2)y2
//   dual_c = [-4, -2] = -b
//   dual_A = [[1, 1], [1, -1]] = A^T
//   dual_b = [-1, -1] = c

const primal = makeLPTuple(
  [-1, -1],
  [
    [1, 1],
    [1, -1],
  ],
  [4, 2],
);

describe("opt.lp-dual", () => {
  test("id is opt.lp-dual", () => {
    expect(LpDualBlock.id).toBe("opt.lp-dual");
  });

  test("output type is Tuple", () => {
    const result = LpDualBlock.compute({ lp: primal }, {}, ctx) as MathValue;
    expect(result.type.kind).toBe("Tuple");
  });

  test("output Tuple has 3 elements", () => {
    const result = LpDualBlock.compute({ lp: primal }, {}, ctx) as MathValue;
    const elements = (result.type as unknown as { elements: unknown[] }).elements;
    expect(elements).toHaveLength(3);
  });

  test("dual_c = -b (negated primal RHS)", () => {
    const result = LpDualBlock.compute({ lp: primal }, {}, ctx) as MathValue;
    const [dualCVal] = result.payload as [MathValue];
    const vals = dualCVal?.payload as VectorPayload;
    // primal b = [4, 2], so dual_c = [-4, -2]
    expect(vals[0] as number).toBeCloseTo(-4, 10);
    expect(vals[1] as number).toBeCloseTo(-2, 10);
  });

  test("dual_A = A^T (transposed primal constraint matrix)", () => {
    const result = LpDualBlock.compute({ lp: primal }, {}, ctx) as MathValue;
    const [, dualAVal] = result.payload as [MathValue, MathValue];
    const rows = dualAVal?.payload as MatrixPayload;
    // primal A = [[1,1],[1,-1]], so A^T = [[1,1],[1,-1]] (happens to be symmetric here)
    expect((rows[0] as number[])[0]).toBeCloseTo(1, 10);
    expect((rows[0] as number[])[1]).toBeCloseTo(1, 10);
    expect((rows[1] as number[])[0]).toBeCloseTo(1, 10);
    expect((rows[1] as number[])[1]).toBeCloseTo(-1, 10);
  });

  test("dual_b = c (primal cost vector)", () => {
    const result = LpDualBlock.compute({ lp: primal }, {}, ctx) as MathValue;
    const [, , dualBVal] = result.payload as [MathValue, MathValue, MathValue];
    const vals = dualBVal?.payload as VectorPayload;
    // primal c = [-1, -1], so dual_b = [-1, -1]
    expect(vals[0] as number).toBeCloseTo(-1, 10);
    expect(vals[1] as number).toBeCloseTo(-1, 10);
  });

  test("dual_c has length m (number of primal constraints)", () => {
    const result = LpDualBlock.compute({ lp: primal }, {}, ctx) as MathValue;
    const elements = (result.type as unknown as { elements: { kind: string; n?: number }[] })
      .elements;
    expect(elements[0]?.kind).toBe("Vector");
    expect(elements[0]?.n).toBe(2); // m = 2 constraints
  });

  test("dual_A shape is n×m (primal vars × primal constraints)", () => {
    const result = LpDualBlock.compute({ lp: primal }, {}, ctx) as MathValue;
    const elements = (
      result.type as unknown as { elements: { kind: string; m?: number; n?: number }[] }
    ).elements;
    expect(elements[1]?.kind).toBe("Matrix");
    expect(elements[1]?.m).toBe(2); // n = 2 primal vars
    expect(elements[1]?.n).toBe(2); // m = 2 primal constraints
  });

  test("dual_b has length n (number of primal variables)", () => {
    const result = LpDualBlock.compute({ lp: primal }, {}, ctx) as MathValue;
    const elements = (result.type as unknown as { elements: { kind: string; n?: number }[] })
      .elements;
    expect(elements[2]?.kind).toBe("Vector");
    expect(elements[2]?.n).toBe(2); // n = 2 primal vars
  });

  test("dual of dual has same dimensions as primal", () => {
    const dual = LpDualBlock.compute({ lp: primal }, {}, ctx) as MathValue;
    const dualOfDual = LpDualBlock.compute({ lp: dual }, {}, ctx) as MathValue;
    const primalElements = (primal.type as unknown as { elements: { n?: number; m?: number }[] })
      .elements;
    const ddElements = (dualOfDual.type as unknown as { elements: { n?: number; m?: number }[] })
      .elements;
    // dual-of-dual should have same c length as primal (n vars)
    expect(ddElements[0]?.n).toBe(primalElements[0]?.n);
  });

  test("non-square primal: 3 constraints, 2 variables", () => {
    const lp3x2 = makeLPTuple(
      [-1, -2],
      [
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      [5, 5, 8],
    );
    const result = LpDualBlock.compute({ lp: lp3x2 }, {}, ctx) as MathValue;
    const elements = (
      result.type as unknown as { elements: { kind: string; m?: number; n?: number }[] }
    ).elements;
    // dual_c length = m = 3
    expect(elements[0]?.n).toBe(3);
    // dual_A shape = n×m = 2×3
    expect(elements[1]?.m).toBe(2);
    expect(elements[1]?.n).toBe(3);
    // dual_b length = n = 2
    expect(elements[2]?.n).toBe(2);
  });

  test("throws LpDualError when lp missing", () => {
    expect(() => LpDualBlock.compute({}, {}, ctx)).toThrow(LpDualError);
  });

  test("explain.effect prompts when lp missing", () => {
    const msg = LpDualBlock.explain.effect?.({}, {} as MathValue);
    expect(msg).toContain("Connect");
  });

  test("explain.effect describes dimensions when connected", () => {
    const msg = LpDualBlock.explain.effect?.({ lp: primal }, {} as MathValue);
    expect(msg).toContain("2");
  });
});
