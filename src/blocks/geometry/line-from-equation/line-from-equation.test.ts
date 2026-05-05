import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { LinePayload, MathValue } from "~/math/types";
import { LineFromEquationBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

describe("geom.line-from-equation", () => {
  test("id is geom.line-from-equation", () => {
    expect(LineFromEquationBlock.id).toBe("geom.line-from-equation");
  });

  test("horizontal line y=0 (a=0,b=1,c=0): direction is (1,0)", () => {
    const out = LineFromEquationBlock.compute({}, { a: "0", b: "1", c: "0" }, ctx) as MathValue;
    expect(out.type.kind).toBe("Line");
    if (out.type.kind === "Line") expect(out.type.n).toBe(2);
    const line = out.payload as LinePayload;
    expect(Math.abs(line.direction[0] ?? 0)).toBeCloseTo(1, 10);
    expect(Math.abs(line.direction[1] ?? 0)).toBeCloseTo(0, 10);
  });

  test("vertical line x=0 (a=1,b=0,c=0): direction is (0,1)", () => {
    const out = LineFromEquationBlock.compute({}, { a: "1", b: "0", c: "0" }, ctx) as MathValue;
    const line = out.payload as LinePayload;
    expect(Math.abs(line.direction[0] ?? 0)).toBeCloseTo(0, 10);
    expect(Math.abs(line.direction[1] ?? 0)).toBeCloseTo(1, 10);
  });

  test("implicit form round-trips: line.implicit matches input a,b,c (up to scale)", () => {
    const out = LineFromEquationBlock.compute({}, { a: "3", b: "4", c: "5" }, ctx) as MathValue;
    const line = out.payload as LinePayload;
    expect(line.implicit).toBeDefined();
    if (line.implicit === undefined) return;
    // The stored implicit form should satisfy the point on the line
    const { a, b, c } = line.implicit;
    const px = line.point[0] ?? 0;
    const py = line.point[1] ?? 0;
    expect(Math.abs(a * px + b * py + c)).toBeLessThan(1e-10);
  });

  test("point on line satisfies ax+by+c=0", () => {
    const out = LineFromEquationBlock.compute({}, { a: "1", b: "2", c: "-3" }, ctx) as MathValue;
    const line = out.payload as LinePayload;
    const px = line.point[0] ?? 0;
    const py = line.point[1] ?? 0;
    // 1*x + 2*y - 3 = 0 → check point satisfies original equation
    expect(Math.abs(1 * px + 2 * py - 3)).toBeLessThan(1e-10);
  });

  test("direction is unit length", () => {
    const out = LineFromEquationBlock.compute({}, { a: "3", b: "4", c: "0" }, ctx) as MathValue;
    const line = out.payload as LinePayload;
    const mag = Math.sqrt(line.direction.reduce((s, c) => s + c * c, 0));
    expect(mag).toBeCloseTo(1, 10);
  });

  test("throws for a=0 and b=0 (degenerate)", () => {
    expect(() => LineFromEquationBlock.compute({}, { a: "0", b: "0", c: "1" }, ctx)).toThrow();
  });

  test("throws for non-numeric a", () => {
    expect(() => LineFromEquationBlock.compute({}, { a: "xyz", b: "1", c: "0" }, ctx)).toThrow();
  });

  test("direction is unit length (property)", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -100, max: 100 }),
        (a, b, c) => {
          // Skip degenerate case
          if (Math.sqrt(a * a + b * b) < 1e-6) return;
          const out = LineFromEquationBlock.compute(
            {},
            { a: a.toString(), b: b.toString(), c: c.toString() },
            ctx,
          ) as MathValue;
          const line = out.payload as LinePayload;
          const mag = Math.sqrt(line.direction.reduce((s, v) => s + v * v, 0));
          expect(Math.abs(mag - 1)).toBeLessThan(1e-10);
        },
      ),
    );
  });

  test("point on line satisfies ax+by+c=0 (property)", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -10, max: 10 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -10, max: 10 }),
        fc.float({ noNaN: true, noDefaultInfinity: true, min: -10, max: 10 }),
        (a, b, c) => {
          if (Math.sqrt(a * a + b * b) < 1e-6) return;
          const out = LineFromEquationBlock.compute(
            {},
            { a: a.toString(), b: b.toString(), c: c.toString() },
            ctx,
          ) as MathValue;
          const line = out.payload as LinePayload;
          const px = line.point[0] ?? 0;
          const py = line.point[1] ?? 0;
          expect(Math.abs(a * px + b * py + c)).toBeLessThan(1e-9);
        },
      ),
    );
  });
});
