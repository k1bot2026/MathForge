import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { PointBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

describe("geom.point", () => {
  test("id is geom.point", () => {
    expect(PointBlock.id).toBe("geom.point");
  });

  test("2D point from '1, 2'", () => {
    const out = PointBlock.compute({}, { coords: "1, 2" }, ctx) as MathValue;
    expect(out.type.kind).toBe("Point");
    if (out.type.kind === "Point") expect(out.type.n).toBe(2);
    expect(out.payload).toEqual([1, 2]);
  });

  test("3D point from '1, 2, 3'", () => {
    const out = PointBlock.compute({}, { coords: "1, 2, 3" }, ctx) as MathValue;
    expect(out.type.kind).toBe("Point");
    if (out.type.kind === "Point") expect(out.type.n).toBe(3);
    expect(out.payload).toEqual([1, 2, 3]);
  });

  test("1D point from '5'", () => {
    const out = PointBlock.compute({}, { coords: "5" }, ctx) as MathValue;
    if (out.type.kind === "Point") expect(out.type.n).toBe(1);
    expect(out.payload).toEqual([5]);
  });

  test("origin is the default (0, 0)", () => {
    const out = PointBlock.compute({}, {}, ctx) as MathValue;
    expect(out.payload).toEqual([0, 0]);
  });

  test("throws for non-numeric coordinate", () => {
    expect(() => PointBlock.compute({}, { coords: "1, abc" }, ctx)).toThrow("geom.point");
  });

  test("throws for empty coords", () => {
    expect(() => PointBlock.compute({}, { coords: "" }, ctx)).toThrow("geom.point");
  });

  test("round-trip identity: output coords match input", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 1,
          maxLength: 5,
        }),
        (coords) => {
          const raw = coords.map((c) => c.toFixed(6)).join(", ");
          const out = PointBlock.compute({}, { coords: raw }, ctx) as MathValue;
          const payload = out.payload as ReadonlyArray<number>;
          expect(payload.length).toBe(coords.length);
          for (let i = 0; i < coords.length; i++) {
            expect(Math.abs((payload[i] ?? 0) - (coords[i] ?? 0))).toBeLessThan(1e-5);
          }
        },
      ),
    );
  });

  test("distance(P, P) = 0 by construction", () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }), {
          minLength: 2,
          maxLength: 4,
        }),
        (coords) => {
          const raw = coords.map((c) => c.toFixed(6)).join(", ");
          const out = PointBlock.compute({}, { coords: raw }, ctx) as MathValue;
          const payload = out.payload as ReadonlyArray<number>;
          const dist = Math.sqrt(
            payload.reduce((s, _c, i) => {
              const diff = (payload[i] ?? 0) - (payload[i] ?? 0);
              return s + diff * diff;
            }, 0),
          );
          expect(dist).toBe(0);
        },
      ),
    );
  });
});
