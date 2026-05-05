import { describe, expect, it } from "vitest";
import type { MathValue, MatrixPayload } from "~/math/types";
import { ComposeBlock } from "./definition";

function mat(payload: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: payload.length, n: (payload[0] ?? []).length, field: "real" },
    payload: payload as MatrixPayload,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function compute(A: MathValue, B: MathValue): MathValue {
  return ComposeBlock.compute({ A, B }, {}, { signal: new AbortController().signal }) as MathValue;
}

describe("geom.compose", () => {
  it("composes two 2×2 identity matrices to identity", () => {
    const I = mat([
      [1, 0],
      [0, 1],
    ]);
    const result = compute(I, I);
    expect(result.payload).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });

  it("compose(A, B) = A·B matrix product (not B·A)", () => {
    // A·B: [[1,2],[0,1]]·[[1,0],[3,1]] = [[7,2],[3,1]]
    const A = mat([
      [1, 2],
      [0, 1],
    ]);
    const B = mat([
      [1, 0],
      [3, 1],
    ]);
    const result = compute(A, B);
    expect(result.payload).toEqual([
      [7, 2],
      [3, 1],
    ]);
  });

  it("compose(rotation90, reflection_x) produces correct 2×2 result", () => {
    // rotation90 = [[0,-1],[1,0]], reflection_x = [[1,0],[0,-1]]
    // product = [[0,1],[1,0]]
    const R = mat([
      [0, -1],
      [1, 0],
    ]);
    const F = mat([
      [1, 0],
      [0, -1],
    ]);
    const result = compute(R, F);
    expect((result.payload as number[][])[0]?.[0]).toBeCloseTo(0);
    expect((result.payload as number[][])[0]?.[1]).toBeCloseTo(1);
    expect((result.payload as number[][])[1]?.[0]).toBeCloseTo(1);
    expect((result.payload as number[][])[1]?.[1]).toBeCloseTo(0);
  });

  it("compose(A, identity) = A", () => {
    const A = mat([
      [2, 3],
      [-1, 4],
    ]);
    const I = mat([
      [1, 0],
      [0, 1],
    ]);
    const result = compute(A, I);
    const p = result.payload as number[][];
    expect(p[0]?.[0]).toBeCloseTo(2);
    expect(p[0]?.[1]).toBeCloseTo(3);
    expect(p[1]?.[0]).toBeCloseTo(-1);
    expect(p[1]?.[1]).toBeCloseTo(4);
  });

  it("works with 3×3 identity composition", () => {
    const I3 = mat([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    const A = mat([
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, 4],
    ]);
    const result = compute(I3, A);
    expect(result.payload).toEqual([
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, 4],
    ]);
  });

  it("output type carries the same dimensions as the inputs", () => {
    const A = mat([
      [1, 0],
      [0, 1],
    ]);
    const result = compute(A, A);
    expect(result.type).toMatchObject({ kind: "Matrix", m: 2, n: 2 });
  });

  it("throws when A is missing", () => {
    expect(() =>
      ComposeBlock.compute(
        {
          B: mat([
            [1, 0],
            [0, 1],
          ]),
        },
        {},
        { signal: new AbortController().signal },
      ),
    ).toThrow();
  });

  it("throws when B is missing", () => {
    expect(() =>
      ComposeBlock.compute(
        {
          A: mat([
            [1, 0],
            [0, 1],
          ]),
        },
        {},
        { signal: new AbortController().signal },
      ),
    ).toThrow();
  });

  it("throws when dimensions are incompatible", () => {
    const A2 = mat([
      [1, 0],
      [0, 1],
    ]);
    const A3 = mat([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(() => compute(A2, A3)).toThrow();
  });
});
