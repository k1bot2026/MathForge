import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { computeScalarInput } from "./compute";

describe("core.scalar-input compute", () => {
  test("output is approximate real (vs constant's exact)", () => {
    const result = computeScalarInput({ value: 3.14 });
    expect(result.type).toEqual({
      kind: "Scalar",
      field: "real",
      precision: "approximate",
    });
  });

  test("falls back to 0 on missing or unparsable value", () => {
    expect(computeScalarInput({}).payload).toBe(0);
    expect(computeScalarInput({ value: "nope" }).payload).toBe(0);
  });

  test("property: any finite real round-trips", () => {
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 }), (n) => {
        expect(computeScalarInput({ value: n }).payload).toBe(n);
      }),
    );
  });
});
