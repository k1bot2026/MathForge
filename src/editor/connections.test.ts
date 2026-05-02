import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathType } from "~/math/types";
import { linearAlgebraTypeArb, matrixTypeArb } from "../../tests/arbitraries";
import { canConnect, unifyShape } from "./connections";

const scalar = (
  field: "real" | "complex" | "rational" | "integer" | "boolean",
  precision: "exact" | "approximate" = "exact",
): MathType => ({ kind: "Scalar", field, precision });

const vector = (
  n: number | "any" | { var: string },
  field: "real" | "complex" = "real",
): MathType => ({
  kind: "Vector",
  n,
  field,
});

const matrix = (
  m: number | "any" | { var: string },
  n: number | "any" | { var: string },
  field: "real" | "complex" = "real",
): MathType => ({ kind: "Matrix", m, n, field });

describe("canConnect — kind dispatch", () => {
  test("kinds must match", () => {
    const result = canConnect(scalar("real"), vector(3));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Scalar.*Vector/);
  });
});

describe("canConnect — Scalar field subtyping", () => {
  test("real → complex is allowed (subtype lattice)", () => {
    expect(canConnect(scalar("real"), scalar("complex"))).toEqual({ ok: true });
  });
  test("complex → real is rejected", () => {
    const result = canConnect(scalar("complex"), scalar("real"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Field mismatch/);
  });
  test("integer → rational → real → complex chain all accepted", () => {
    expect(canConnect(scalar("integer"), scalar("rational")).ok).toBe(true);
    expect(canConnect(scalar("rational"), scalar("real")).ok).toBe(true);
    expect(canConnect(scalar("real"), scalar("complex")).ok).toBe(true);
  });
  test("boolean → integer is allowed", () => {
    expect(canConnect(scalar("boolean"), scalar("integer")).ok).toBe(true);
  });
});

describe("canConnect — Scalar precision", () => {
  test("exact → approximate is allowed without warning", () => {
    expect(canConnect(scalar("real", "exact"), scalar("real", "approximate"))).toEqual({
      ok: true,
    });
  });
  test("approximate → exact is allowed but warns", () => {
    const result = canConnect(scalar("real", "approximate"), scalar("real", "exact"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warning).toMatch(/precision will be lost/i);
  });
});

describe("canConnect — Vector shape", () => {
  test("Vector<3> → Vector<3>", () => {
    expect(canConnect(vector(3), vector(3))).toEqual({ ok: true });
  });
  test("Vector<3> → Vector<4> rejected", () => {
    const result = canConnect(vector(3), vector(4));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/n mismatch/);
  });
  test("Vector<3> → Vector<{var:n}> binds n=3", () => {
    expect(canConnect(vector(3), vector({ var: "n" }))).toEqual({
      ok: true,
      bindings: { n: 3 },
    });
  });
  test("Vector<{var:k}> → Vector<3> binds k=3", () => {
    expect(canConnect(vector({ var: "k" }), vector(3))).toEqual({
      ok: true,
      bindings: { k: 3 },
    });
  });
  test('Vector<"any"> matches any size', () => {
    expect(canConnect(vector("any"), vector(7)).ok).toBe(true);
    expect(canConnect(vector(7), vector("any")).ok).toBe(true);
  });
});

describe("canConnect — Matrix shape", () => {
  test("inner-dim mismatch rejected (2,3) vs (4,5) on the m axis", () => {
    const result = canConnect(matrix(2, 3), matrix(4, 5));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/m mismatch/);
  });
  test("Matrix<3,4> → Matrix<{m},{n}> binds both", () => {
    const result = canConnect(matrix(3, 4), matrix({ var: "m" }, { var: "n" }));
    expect(result).toEqual({ ok: true, bindings: { m: 3, n: 4 } });
  });
  test("Matrix<3,{var:k}> → Matrix<{var:m},5> binds m=3 and k=5", () => {
    const result = canConnect(matrix(3, { var: "k" }), matrix({ var: "m" }, 5));
    expect(result).toEqual({ ok: true, bindings: { m: 3, k: 5 } });
  });
});

describe("canConnect — Tuple", () => {
  test("equal-length tuples whose elements all connect", () => {
    const t1: MathType = { kind: "Tuple", elements: [scalar("real"), vector(3)] };
    const t2: MathType = { kind: "Tuple", elements: [scalar("complex"), vector(3)] };
    expect(canConnect(t1, t2).ok).toBe(true);
  });
  test("length mismatch rejected", () => {
    const t1: MathType = { kind: "Tuple", elements: [scalar("real")] };
    const t2: MathType = { kind: "Tuple", elements: [scalar("real"), scalar("real")] };
    const result = canConnect(t1, t2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/length mismatch/);
  });
});

describe("canConnect — Set", () => {
  test("Set element types unify", () => {
    const s1: MathType = { kind: "Set", element: scalar("real") };
    const s2: MathType = { kind: "Set", element: scalar("complex") };
    expect(canConnect(s1, s2).ok).toBe(true);
  });
});

describe("canConnect — properties", () => {
  test("connecting any Scalar/Vector/Matrix type to itself succeeds", () => {
    fc.assert(
      fc.property(linearAlgebraTypeArb, (t) => {
        expect(canConnect(t, t).ok).toBe(true);
      }),
    );
  });

  test("Matrix subtyping in the field axis is one-way (low rank → high rank)", () => {
    fc.assert(
      fc.property(matrixTypeArb, matrixTypeArb, (a, b) => {
        const ab = canConnect(a, b);
        if (!ab.ok) return; // not all (a,b) pairs are compatible; only test the ones that are
        // If a → b ok and the fields differ, then b → a in the field axis must
        // be rejected (unless shapes also disagree, in which case shape rule fires).
        if (a.field !== b.field) {
          // For the property to hold cleanly, restrict to same shape.
          if (a.m === b.m && a.n === b.n) {
            const ba = canConnect(b, a);
            // ba is ok iff b's field is also a subtype of a's, i.e. iff fields are equal.
            expect(ba.ok).toBe(false);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe("unifyShape unit checks", () => {
  test("two equal vars succeed without binding", () => {
    expect(unifyShape({ var: "k" }, { var: "k" }, "n")).toEqual({ ok: true });
  });
  test("two distinct vars succeed without binding", () => {
    expect(unifyShape({ var: "k" }, { var: "m" }, "n")).toEqual({ ok: true });
  });
  test("any matches concrete", () => {
    expect(unifyShape("any", 3, "n").ok).toBe(true);
    expect(unifyShape(3, "any", "n").ok).toBe(true);
  });
});
