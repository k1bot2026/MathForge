import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { UnitGridBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function matrixValue(rows: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: rows.length, n: rows[0]?.length ?? 0, field: "real" },
    payload: rows as unknown as number,
    provenance: { blockId: "la.matrix", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("viz.unit-grid compute", () => {
  test("returns M passthrough when M is provided", () => {
    const M = matrixValue([
      [1, 0],
      [0, 1],
    ]);
    expect(UnitGridBlock.compute({ M }, {}, ctx)).toBe(M);
  });

  test("throws when M input is missing", () => {
    expect(() => UnitGridBlock.compute({}, {}, ctx)).toThrow(
      "viz.unit-grid requires a Matrix input on port M",
    );
  });
});

describe("viz.unit-grid definition explain", () => {
  test("effect returns connect prompt when M is missing", () => {
    expect(UnitGridBlock.explain.effect?.({}, undefined as never)).toMatch(/Connect/);
  });

  test("effect shows determinant when M is connected", () => {
    const identity = matrixValue([
      [1, 0],
      [0, 1],
    ]);
    const msg = UnitGridBlock.explain.effect?.({ M: identity }, undefined as never);
    expect(msg).toMatch(/det\(M\)/);
    expect(msg).toMatch(/1\.000/);
  });

  test("impact shows downstream matrix dimensions", () => {
    const out = matrixValue([
      [2, 1],
      [0, 3],
    ]);
    const msg = UnitGridBlock.explain.impact?.({}, out);
    expect(msg).toMatch(/2×2/);
  });
});
