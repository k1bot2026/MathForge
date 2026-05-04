import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { AssertBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function runAssert(inputs: { actual?: MathValue; expected?: MathValue }, tol: number): MathValue {
  return AssertBlock.compute(inputs, { tolerance: tol }, ctx) as MathValue;
}

function scalar(n: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "exact" },
    payload: n,
    provenance: { blockId: "core.constant", inputs: [], computedAt: 0, engine: "native" },
  };
}

function boolScalar(b: boolean): MathValue {
  return {
    type: { kind: "Scalar", field: "boolean", precision: "exact" },
    payload: b,
    provenance: { blockId: "core.constant", inputs: [], computedAt: 0, engine: "native" },
  };
}

function vector(ns: number[]): MathValue {
  return {
    type: { kind: "Vector", n: ns.length, field: "real" },
    payload: ns,
    provenance: { blockId: "la.vector", inputs: [], computedAt: 0, engine: "native" },
  };
}

function matrix(rows: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: rows.length, n: rows[0]?.length ?? 0, field: "real" },
    payload: rows,
    provenance: { blockId: "la.matrix", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("AssertBlock", () => {
  test("has id core.assert", () => {
    expect(AssertBlock.id).toBe("core.assert");
  });

  test("has two inputs and one output", () => {
    expect(AssertBlock.inputs).toHaveLength(2);
    expect(AssertBlock.outputs).toHaveLength(1);
    expect(AssertBlock.outputs[0]?.id).toBe("pass");
  });

  test("output type is boolean Scalar", () => {
    const out = AssertBlock.outputs[0];
    expect(out?.type).toEqual({ kind: "Scalar", field: "boolean", precision: "exact" });
  });

  // ── Exact scalar equality ──

  test("passes when scalars are equal (tolerance 0)", () => {
    const result = runAssert({ actual: scalar(42), expected: scalar(42) }, 0);
    expect(result.payload).toBe(true);
  });

  test("fails when scalars differ (tolerance 0)", () => {
    const result = runAssert({ actual: scalar(42), expected: scalar(43) }, 0);
    expect(result.payload).toBe(false);
  });

  // ── Approx equality ──

  test("passes when difference is within tolerance", () => {
    const result = runAssert({ actual: scalar(1.005), expected: scalar(1.0) }, 0.01);
    expect(result.payload).toBe(true);
  });

  test("fails when difference exceeds tolerance", () => {
    const result = runAssert({ actual: scalar(1.05), expected: scalar(1.0) }, 0.01);
    expect(result.payload).toBe(false);
  });

  test("passes at exact tolerance boundary", () => {
    // Use 0.5 - 0 = 0.5 with tolerance 0.5: exact in binary, no FP rounding issue.
    const result = runAssert({ actual: scalar(0.5), expected: scalar(0) }, 0.5);
    expect(result.payload).toBe(true);
  });

  // ── Boolean scalars ──

  test("passes when both booleans are true", () => {
    const result = runAssert({ actual: boolScalar(true), expected: boolScalar(true) }, 0);
    expect(result.payload).toBe(true);
  });

  test("fails when booleans differ", () => {
    const result = runAssert({ actual: boolScalar(true), expected: boolScalar(false) }, 0);
    expect(result.payload).toBe(false);
  });

  // ── Vector equality ──

  test("passes when vectors are equal", () => {
    const result = runAssert({ actual: vector([1, 2, 3]), expected: vector([1, 2, 3]) }, 0);
    expect(result.payload).toBe(true);
  });

  test("fails when vectors differ", () => {
    const result = runAssert({ actual: vector([1, 2, 3]), expected: vector([1, 2, 4]) }, 0);
    expect(result.payload).toBe(false);
  });

  test("fails when vector lengths differ", () => {
    const result = runAssert({ actual: vector([1, 2]), expected: vector([1, 2, 3]) }, 0);
    expect(result.payload).toBe(false);
  });

  test("passes when vectors are approximately equal within tolerance", () => {
    const result = runAssert(
      { actual: vector([1.005, 2.005]), expected: vector([1.0, 2.0]) },
      0.01,
    );
    expect(result.payload).toBe(true);
  });

  // ── Matrix equality ──

  test("passes when matrices are equal", () => {
    const result = runAssert(
      {
        actual: matrix([
          [1, 2],
          [3, 4],
        ]),
        expected: matrix([
          [1, 2],
          [3, 4],
        ]),
      },
      0,
    );
    expect(result.payload).toBe(true);
  });

  test("fails when matrices differ", () => {
    const result = runAssert(
      {
        actual: matrix([
          [1, 2],
          [3, 4],
        ]),
        expected: matrix([
          [1, 2],
          [3, 5],
        ]),
      },
      0,
    );
    expect(result.payload).toBe(false);
  });

  // ── Type mismatch ──

  test("fails when kinds differ (scalar vs vector)", () => {
    const result = runAssert({ actual: scalar(1), expected: vector([1]) }, 0);
    expect(result.payload).toBe(false);
  });

  // ── Error path ──

  test("throws when actual is not connected", () => {
    expect(() => runAssert({ expected: scalar(1) }, 0)).toThrow("core.assert");
  });

  test("throws when expected is not connected", () => {
    expect(() => runAssert({ actual: scalar(1) }, 0)).toThrow("core.assert");
  });

  // ── explain ──

  test("explain.effect reports pass", () => {
    const result = runAssert({ actual: scalar(1), expected: scalar(1) }, 0);
    const msg = AssertBlock.explain.effect?.({}, result);
    expect(msg).toMatch(/pass/i);
  });

  test("explain.effect reports failure", () => {
    const result = runAssert({ actual: scalar(1), expected: scalar(2) }, 0);
    const msg = AssertBlock.explain.effect?.({}, result);
    expect(msg).toMatch(/FAILED/);
  });
});
