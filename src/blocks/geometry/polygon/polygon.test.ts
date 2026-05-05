import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue, PolygonPayload } from "~/math/types";
import { PolygonBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

describe("geom.polygon", () => {
  test("id is geom.polygon", () => {
    expect(PolygonBlock.id).toBe("geom.polygon");
  });

  test("triangle from '0,0;1,0;0,1'", () => {
    const out = PolygonBlock.compute({}, { vertices: "0,0;1,0;0,1" }, ctx) as MathValue;
    expect(out.type.kind).toBe("Polygon");
    const poly = out.payload as PolygonPayload;
    expect(poly.length).toBe(3);
    expect(poly[0]).toEqual([0, 0]);
    expect(poly[1]).toEqual([1, 0]);
    expect(poly[2]).toEqual([0, 1]);
  });

  test("square from '0,0;1,0;1,1;0,1'", () => {
    const out = PolygonBlock.compute({}, { vertices: "0,0;1,0;1,1;0,1" }, ctx) as MathValue;
    const poly = out.payload as PolygonPayload;
    expect(poly.length).toBe(4);
  });

  test("allows 3D vertices '0,0,0;1,0,0;0,1,0'", () => {
    const out = PolygonBlock.compute({}, { vertices: "0,0,0;1,0,0;0,1,0" }, ctx) as MathValue;
    const poly = out.payload as PolygonPayload;
    expect(poly.length).toBe(3);
    expect(poly[0]).toEqual([0, 0, 0]);
  });

  test("default gives a unit square", () => {
    const out = PolygonBlock.compute({}, {}, ctx) as MathValue;
    const poly = out.payload as PolygonPayload;
    expect(poly.length).toBe(4);
  });

  test("throws for fewer than 3 vertices", () => {
    expect(() => PolygonBlock.compute({}, { vertices: "0,0;1,0" }, ctx)).toThrow("3");
  });

  test("throws for non-numeric coordinate", () => {
    expect(() => PolygonBlock.compute({}, { vertices: "0,0;1,abc;2,2" }, ctx)).toThrow();
  });

  test("throws for inconsistent vertex dimensions", () => {
    expect(() => PolygonBlock.compute({}, { vertices: "0,0;1,0,0;2,2" }, ctx)).toThrow("dimension");
  });

  test("vertex count and coordinates match input (property)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })), {
          minLength: 3,
          maxLength: 8,
        }),
        (verts) => {
          const raw = verts.map(([x, y]) => `${x},${y}`).join(";");
          const out = PolygonBlock.compute({}, { vertices: raw }, ctx) as MathValue;
          const poly = out.payload as PolygonPayload;
          expect(poly.length).toBe(verts.length);
          for (let i = 0; i < verts.length; i++) {
            expect((poly[i] ?? [])[0]).toBe(verts[i]?.[0]);
            expect((poly[i] ?? [])[1]).toBe(verts[i]?.[1]);
          }
        },
      ),
    );
  });
});
