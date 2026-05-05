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

describe("canConnect — shape-variable unification edge cases", () => {
  // Matrix<m,m>: same variable in both row and column dimensions.
  // Connecting to a concrete square matrix binds m once consistently.
  test("Matrix<{m},{m}> → Matrix<3,3> binds m=3 from both axes", () => {
    const result = canConnect(matrix({ var: "m" }, { var: "m" }), matrix(3, 3));
    expect(result).toEqual({ ok: true, bindings: { m: 3 } });
  });

  // A single canConnect call unifies axes independently, so conflicting
  // bindings for the same variable (m=3 vs m=4) are not detected.
  // This is a known limitation: cross-axis consistency is the block
  // manifest's responsibility at evaluator time, not canConnect's.
  test("Matrix<{m},{m}> → Matrix<3,4>: per-axis bindings last-write-wins (m=4)", () => {
    const result = canConnect(matrix({ var: "m" }, { var: "m" }), matrix(3, 4));
    // m is bound independently per axis; mergeOk spreads both maps, so the
    // column binding (m=4) overwrites the row binding (m=3).
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bindings?.m).toBe(4);
    }
  });

  // Same variable on both sides of an axis — no concrete value to bind.
  test("Matrix<{m},{k}> → Matrix<{m},{n}>: both axes have matching-side vars, no binding", () => {
    const result = canConnect(
      matrix({ var: "m" }, { var: "k" }),
      matrix({ var: "m" }, { var: "n" }),
    );
    expect(result).toEqual({ ok: true });
  });

  // Concrete output flows into a fully polymorphic matrix: both dims bound.
  test("Matrix<3,4> → Matrix<{m},{n}>: row and column both bound", () => {
    const result = canConnect(matrix(3, 4), matrix({ var: "m" }, { var: "n" }));
    expect(result).toEqual({ ok: true, bindings: { m: 3, n: 4 } });
  });

  // Non-square concrete mismatch on the m-axis, n-axis check never reached.
  test("Matrix<3,4> → Matrix<5,4> rejected on m mismatch", () => {
    const result = canConnect(matrix(3, 4), matrix(5, 4));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/m mismatch/);
  });

  // Non-square concrete mismatch only on the n-axis.
  test("Matrix<3,4> → Matrix<3,5> rejected on n mismatch", () => {
    const result = canConnect(matrix(3, 4), matrix(3, 5));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/n mismatch/);
  });

  // Chained bindings: a concrete block feeds a polymorphic slot, and then
  // the same slot's output feeds a second polymorphic slot. Each canConnect
  // call in the chain should independently yield the correct bindings.
  test("chained: Matrix<3,4> → Matrix<{m},{n}> then same Matrix<3,4> → Matrix<{p},{q}>", () => {
    const first = canConnect(matrix(3, 4), matrix({ var: "m" }, { var: "n" }));
    const second = canConnect(matrix(3, 4), matrix({ var: "p" }, { var: "q" }));
    expect(first).toEqual({ ok: true, bindings: { m: 3, n: 4 } });
    expect(second).toEqual({ ok: true, bindings: { p: 3, q: 4 } });
  });

  // Two distinct inner variables never produce a shape mismatch on their own.
  test("Matrix<{m},{k}> → Matrix<{j},{n}>: distinct vars on both sides, no binding, no rejection", () => {
    const result = canConnect(
      matrix({ var: "m" }, { var: "k" }),
      matrix({ var: "j" }, { var: "n" }),
    );
    expect(result).toEqual({ ok: true });
  });

  // Concrete inner dim mismatch (k ≠ j): connecting m×k output to j×n input
  // where k and j are concrete and different should be rejected.
  test("Matrix<2,3> → Matrix<4,5> rejected on m axis before n axis is checked", () => {
    const result = canConnect(matrix(2, 3), matrix(4, 5));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/m mismatch/);
  });

  // Wildcard on one axis, concrete on the other — partial wildcard.
  test('Matrix<"any",3> → Matrix<5,3>: any-row accepted, col matched', () => {
    expect(canConnect(matrix("any", 3), matrix(5, 3)).ok).toBe(true);
  });

  test('Matrix<3,"any"> → Matrix<3,7>: row matched, any-col accepted', () => {
    expect(canConnect(matrix(3, "any"), matrix(3, 7)).ok).toBe(true);
  });

  test('Matrix<3,"any"> → Matrix<4,7>: row mismatch despite any-col', () => {
    const result = canConnect(matrix(3, "any"), matrix(4, 7));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/m mismatch/);
  });
});

// ── Phase 8 — Geometry canConnect ────────────────────────────────────

const point = (n: number | "any"): MathType => ({ kind: "Point", n });
const line = (n: 2 | 3): MathType => ({ kind: "Line", n });
const transform = (n: 2 | 3): MathType => ({ kind: "Transformation", n });

describe("canConnect — Point<n>", () => {
  test("Point<2> → Point<2> accepted", () => {
    expect(canConnect(point(2), point(2)).ok).toBe(true);
  });

  test("Point<3> → Point<3> accepted", () => {
    expect(canConnect(point(3), point(3)).ok).toBe(true);
  });

  test("Point<2> → Point<3> rejected (dimension mismatch)", () => {
    const result = canConnect(point(2), point(3));
    expect(result.ok).toBe(false);
  });

  test('Point<"any"> → Point<2> accepted', () => {
    expect(canConnect(point("any"), point(2)).ok).toBe(true);
  });

  test('Point<2> → Point<"any"> accepted', () => {
    expect(canConnect(point(2), point("any")).ok).toBe(true);
  });
});

describe("canConnect — Line<n>", () => {
  test("Line<2> → Line<2> accepted", () => {
    expect(canConnect(line(2), line(2)).ok).toBe(true);
  });

  test("Line<3> → Line<3> accepted", () => {
    expect(canConnect(line(3), line(3)).ok).toBe(true);
  });

  test("Line<2> → Line<3> rejected", () => {
    const result = canConnect(line(2), line(3));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/dimension mismatch/);
  });
});

describe("canConnect — Transformation<n>", () => {
  test("Transformation<2> → Transformation<2> accepted", () => {
    expect(canConnect(transform(2), transform(2)).ok).toBe(true);
  });

  test("Transformation<2> → Transformation<3> rejected", () => {
    const result = canConnect(transform(2), transform(3));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/dimension mismatch/);
  });

  test("Transformation cannot connect to Point (hard type wall)", () => {
    expect(canConnect(transform(2), point(2)).ok).toBe(false);
  });
});

describe("canConnect — Circle / Sphere / Polygon / Conic", () => {
  test("Circle → Circle accepted", () => {
    expect(canConnect({ kind: "Circle" }, { kind: "Circle" }).ok).toBe(true);
  });

  test("Sphere → Sphere accepted", () => {
    expect(canConnect({ kind: "Sphere" }, { kind: "Sphere" }).ok).toBe(true);
  });

  test("Circle → Sphere rejected (different kinds)", () => {
    expect(canConnect({ kind: "Circle" }, { kind: "Sphere" }).ok).toBe(false);
  });

  test("Polygon → Polygon accepted", () => {
    expect(canConnect({ kind: "Polygon" }, { kind: "Polygon" }).ok).toBe(true);
  });

  test("Conic → Conic accepted", () => {
    expect(canConnect({ kind: "Conic" }, { kind: "Conic" }).ok).toBe(true);
  });

  test("Polygon → Conic rejected", () => {
    expect(canConnect({ kind: "Polygon" }, { kind: "Conic" }).ok).toBe(false);
  });

  test("Circle → Polygon rejected", () => {
    expect(canConnect({ kind: "Circle" }, { kind: "Polygon" }).ok).toBe(false);
  });

  test("Conic → Circle rejected", () => {
    expect(canConnect({ kind: "Conic" }, { kind: "Circle" }).ok).toBe(false);
  });

  test("Line<2> → Circle rejected (cross-kind)", () => {
    expect(canConnect(line(2), { kind: "Circle" }).ok).toBe(false);
  });

  test("Point<2> → Conic rejected (cross-kind)", () => {
    expect(canConnect(point(2), { kind: "Conic" }).ok).toBe(false);
  });
});

describe("canConnect — Vector ↔ Point soft-coerce", () => {
  test("Vector<2> → Point<2>: ok with warning", () => {
    const result = canConnect(vector(2), point(2));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warning).toMatch(/position vector/);
  });

  test("Point<2> → Vector<2>: ok with warning", () => {
    const result = canConnect(point(2), vector(2));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warning).toMatch(/position vector/);
  });

  test("Vector<3> → Point<3>: ok with warning", () => {
    const result = canConnect(vector(3), point(3));
    expect(result.ok).toBe(true);
  });

  test("Vector<2> → Point<3>: rejected (dimension mismatch)", () => {
    expect(canConnect(vector(2), point(3)).ok).toBe(false);
  });

  test('Vector<"any"> → Point<2>: ok', () => {
    expect(canConnect(vector("any"), point(2)).ok).toBe(true);
  });
});
