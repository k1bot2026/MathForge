import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeConstant } from "./compute";

describe("core.constant compute", () => {
  test("returns the value param as a Scalar real exact", () => {
    const result = computeConstant({ value: 42 });
    expect(result.type).toEqual({ kind: "Scalar", field: "real", precision: "exact" });
    expect(result.payload).toBe(42);
  });

  test("defaults to 0 when value param is missing", () => {
    expect(computeConstant({}).payload).toBe(0);
  });

  test("coerces string-shaped numeric inputs", () => {
    expect(computeConstant({ value: "3.14" }).payload).toBe(3.14);
  });

  test("falls back to 0 on non-finite or unparsable input (NaN, Infinity)", () => {
    expect(computeConstant({ value: "not-a-number" }).payload).toBe(0);
    expect(computeConstant({ value: Number.POSITIVE_INFINITY }).payload).toBe(0);
    expect(computeConstant({ value: Number.NaN }).payload).toBe(0);
  });

  test("provenance carries blockId and native engine", () => {
    const result = computeConstant({ value: 7 });
    expect(result.provenance.blockId).toBe("core.constant");
    expect(result.provenance.engine).toBe("native");
    expect(result.provenance.inputs).toEqual([]);
  });

  test("property: any finite number round-trips through compute", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e9, max: 1e9 }), (n) => {
        expect(computeConstant({ value: n }).payload).toBe(n);
      }),
    );
  });
});
