import { describe, expect, test } from "vitest";
import type { MatrixPayload, MathValue, VectorPayload } from "~/math/types";
import { LpStandardBlock, LpStandardError } from "./definition";

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

// Simple 2-variable, 2-constraint LP:
//   minimize  -x1 - x2
//   subject to x1 + x2 ≤ 4
//              x1 - x2 ≤ 2, x1,x2 ≥ 0
const c2 = makeVector([-1, -1]);
const A2 = makeMatrix([
  [1, 1],
  [1, -1],
]);
const b2 = makeVector([4, 2]);

describe("opt.lp-standard", () => {
  test("id is opt.lp-standard", () => {
    expect(LpStandardBlock.id).toBe("opt.lp-standard");
  });

  test("packages c, A, b into a Tuple output", () => {
    const result = LpStandardBlock.compute({ c: c2, A: A2, b: b2 }, {}, ctx) as MathValue;
    expect(result.type.kind).toBe("Tuple");
  });

  test("output Tuple has 3 elements", () => {
    const result = LpStandardBlock.compute({ c: c2, A: A2, b: b2 }, {}, ctx) as MathValue;
    const elements = (result.type as unknown as { elements: unknown[] }).elements;
    expect(elements).toHaveLength(3);
  });

  test("first element type is Vector(n)", () => {
    const result = LpStandardBlock.compute({ c: c2, A: A2, b: b2 }, {}, ctx) as MathValue;
    const elements = (result.type as unknown as { elements: { kind: string; n: number }[] })
      .elements;
    expect(elements[0]?.kind).toBe("Vector");
    expect(elements[0]?.n).toBe(2);
  });

  test("second element type is Matrix(m, n)", () => {
    const result = LpStandardBlock.compute({ c: c2, A: A2, b: b2 }, {}, ctx) as MathValue;
    const elements = (
      result.type as unknown as { elements: { kind: string; m: number; n: number }[] }
    ).elements;
    expect(elements[1]?.kind).toBe("Matrix");
    expect(elements[1]?.m).toBe(2);
    expect(elements[1]?.n).toBe(2);
  });

  test("third element type is Vector(m)", () => {
    const result = LpStandardBlock.compute({ c: c2, A: A2, b: b2 }, {}, ctx) as MathValue;
    const elements = (result.type as unknown as { elements: { kind: string; n: number }[] })
      .elements;
    expect(elements[2]?.kind).toBe("Vector");
    expect(elements[2]?.n).toBe(2);
  });

  test("payload carries the original MathValue references", () => {
    const result = LpStandardBlock.compute({ c: c2, A: A2, b: b2 }, {}, ctx) as MathValue;
    const [cOut, AOut, bOut] = result.payload as [MathValue, MathValue, MathValue];
    expect(cOut).toBe(c2);
    expect(AOut).toBe(A2);
    expect(bOut).toBe(b2);
  });

  test("throws LpStandardError when c missing", () => {
    expect(() => LpStandardBlock.compute({ A: A2, b: b2 }, {}, ctx)).toThrow(LpStandardError);
  });

  test("throws LpStandardError when A missing", () => {
    expect(() => LpStandardBlock.compute({ c: c2, b: b2 }, {}, ctx)).toThrow(LpStandardError);
  });

  test("throws LpStandardError when b missing", () => {
    expect(() => LpStandardBlock.compute({ c: c2, A: A2 }, {}, ctx)).toThrow(LpStandardError);
  });

  test("throws when A rows do not match b length", () => {
    const bWrong = makeVector([4, 2, 1]); // 3 entries but A has 2 rows
    expect(() => LpStandardBlock.compute({ c: c2, A: A2, b: bWrong }, {}, ctx)).toThrow(
      LpStandardError,
    );
  });

  test("throws when A columns do not match c length", () => {
    const cWrong = makeVector([-1, -1, -1]); // 3 entries but A has 2 cols
    expect(() => LpStandardBlock.compute({ c: cWrong, A: A2, b: b2 }, {}, ctx)).toThrow(
      LpStandardError,
    );
  });

  test("explain.effect describes problem dimensions", () => {
    const result = LpStandardBlock.compute({ c: c2, A: A2, b: b2 }, {}, ctx) as MathValue;
    const effect = LpStandardBlock.explain.effect?.({ c: c2, A: A2, b: b2 }, result);
    expect(effect).toContain("2");
  });

  test("explain.effect prompts when inputs missing", () => {
    const result = LpStandardBlock.compute({ c: c2, A: A2, b: b2 }, {}, ctx) as MathValue;
    const effect = LpStandardBlock.explain.effect?.({}, result);
    expect(effect).toContain("Connect");
  });
});
