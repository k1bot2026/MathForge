import fc from "fast-check";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { computeVector } from "./compute";

describe("la.vector compute", () => {
  test("zero-length vector: N=0 produces empty payload", () => {
    const result = computeVector(0, []);
    expect(result.type).toEqual({ kind: "Vector", n: 0, field: "real" });
    expect(result.payload).toEqual([]);
  });

  test("unit-length vector: N=1 packs single component", () => {
    const result = computeVector(1, [7]);
    expect(result.type).toEqual({ kind: "Vector", n: 1, field: "real" });
    expect(result.payload).toEqual([7]);
  });

  test("N=2 packs two components", () => {
    const result = computeVector(2, [3, 4]);
    expect(result.type).toEqual({ kind: "Vector", n: 2, field: "real" });
    expect(result.payload).toEqual([3, 4]);
  });

  test("N=3 packs three components", () => {
    const result = computeVector(3, [1, 2, 3]);
    expect(result.type).toEqual({ kind: "Vector", n: 3, field: "real" });
    expect(result.payload).toEqual([1, 2, 3]);
  });

  test("missing components beyond provided default to 0", () => {
    const result = computeVector(4, [1, 2]);
    expect(result.payload).toEqual([1, 2, 0, 0]);
  });

  test("non-finite entries are coerced to 0", () => {
    const result = computeVector(3, [Number.NaN, Infinity, -Infinity]);
    expect(result.payload).toEqual([0, 0, 0]);
  });

  test("type.n matches the declared dimension N", () => {
    for (let n = 0; n <= 8; n++) {
      const result = computeVector(
        n,
        Array.from({ length: n }, (_, i) => i),
      );
      expect((result.type as { kind: "Vector"; n: number }).n).toBe(n);
    }
  });

  test("property: any N in 1..8 with finite components round-trips exactly", () => {
    const finite = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 });
    fc.assert(
      fc.property(
        fc
          .integer({ min: 1, max: 8 })
          .chain((n) => fc.tuple(fc.constant(n), fc.array(finite, { minLength: n, maxLength: n }))),
        ([n, components]) => {
          const result = computeVector(n, components);
          expect(result.payload).toEqual(components);
          expect((result.type as { n: number }).n).toBe(n);
        },
      ),
    );
  });

  test("property: payload length always equals N", () => {
    const finite = fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 });
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.array(finite, { maxLength: 8 }),
        (n, components) => {
          const result = computeVector(n, components);
          expect((result.payload as unknown[]).length).toBe(n);
        },
      ),
    );
  });
});

describe("la.vector definition explain", () => {
  test("effect shows vector components", async () => {
    const { VectorBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Vector", n: 3, field: "real" },
      payload: [1, 2, 3] as unknown as number,
      provenance: { blockId: "la.vector", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(VectorBlock.explain.effect?.({}, output)).toMatch(/1, 2, 3/);
  });

  test("impact shows vector length and dimension", async () => {
    const { VectorBlock } = await import("./definition");
    const output: MathValue = {
      type: { kind: "Vector", n: 2, field: "real" },
      payload: [3, 4] as unknown as number,
      provenance: { blockId: "la.vector", inputs: [], computedAt: 0, engine: "native" },
    };
    const msg = VectorBlock.explain.impact?.({}, output);
    expect(msg).toMatch(/5\.000/);
    expect(msg).toMatch(/2-vector/);
  });
});
