import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { UnitGrid3dBlock } from "./definition";

const matrixValue = (rows: number[][]): MathValue => ({
  type: { kind: "Matrix", m: rows.length, n: rows[0]?.length ?? 0, field: "real" },
  payload: rows,
  provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
});

const identity3 = matrixValue([
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]);

describe("viz.unit-grid-3d definition", () => {
  test("compute passes the input matrix through unchanged", () => {
    const result = UnitGrid3dBlock.compute(
      { M: identity3 },
      {},
      { signal: new AbortController().signal },
    );
    expect(result).toBe(identity3);
  });

  test("compute rejects missing M with a clear message", () => {
    expect(() => UnitGrid3dBlock.compute({}, {}, { signal: new AbortController().signal })).toThrow(
      /requires a Matrix input/,
    );
  });

  test("explain.effect reports the determinant", () => {
    const text = UnitGrid3dBlock.explain.effect?.({ M: identity3 }, identity3) ?? "";
    expect(text).toMatch(/det\(M\)\s*=\s*1/);
  });

  test("block has id 'viz.unit-grid-3d'", () => {
    expect(UnitGrid3dBlock.id).toBe("viz.unit-grid-3d");
  });

  test("block has category 'visualizer'", () => {
    expect(UnitGrid3dBlock.category).toBe("visualizer");
  });

  test("input port expects a 3×3 matrix", () => {
    const port = UnitGrid3dBlock.inputs[0];
    expect(port?.id).toBe("M");
    expect(port?.type.kind).toBe("Matrix");
    if (port?.type.kind === "Matrix") {
      expect(port.type.m).toBe(3);
      expect(port.type.n).toBe(3);
    }
  });

  test("output port passes through as 3×3 matrix", () => {
    const port = UnitGrid3dBlock.outputs[0];
    expect(port?.id).toBe("M");
    if (port && typeof port.type !== "function" && port.type.kind === "Matrix") {
      expect(port.type.m).toBe(3);
      expect(port.type.n).toBe(3);
    }
  });
});

describe("la.unit-grid-3d definition explain.impact", () => {
  test("impact shows downstream matrix dimensions", () => {
    const M: MathValue = {
      type: { kind: "Matrix", m: 3, n: 3, field: "real" },
      payload: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as number[][],
      provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
    };
    const text = UnitGrid3dBlock.explain.impact?.({ M }, M) ?? "";
    expect(text).toMatch(/3×3/);
  });
});
