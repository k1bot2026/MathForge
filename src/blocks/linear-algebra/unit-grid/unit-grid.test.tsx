import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { UnitGridBlock } from "./definition";
import { UnitGridVisualization } from "./visualization";

const matrixValue = (rows: number[][]): MathValue => ({
  type: { kind: "Matrix", m: rows.length, n: rows[0]?.length ?? 0, field: "real" },
  payload: rows,
  provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
});

describe("viz.unit-grid definition", () => {
  test("compute passes the input matrix through unchanged", () => {
    const M = matrixValue([
      [2, 0],
      [0, 1],
    ]);
    const result = UnitGridBlock.compute({ M }, {}, { signal: new AbortController().signal });
    expect(result).toBe(M);
  });

  test("compute rejects missing M with a clear message", () => {
    expect(() => UnitGridBlock.compute({}, {}, { signal: new AbortController().signal })).toThrow(
      /requires a Matrix input/,
    );
  });

  test("explain.effect reports the determinant", () => {
    const M = matrixValue([
      [2, 0],
      [0, 3],
    ]);
    const text = UnitGridBlock.explain.effect?.({ M }, M) ?? "";
    expect(text).toMatch(/det\(M\)\s*=\s*6/);
  });
});

describe("UnitGridVisualization", () => {
  test("renders a placeholder when no matrix is connected", () => {
    render(<UnitGridVisualization inputs={{}} output={undefined} />);
    expect(screen.getByText(/Connect a 2×2 matrix/)).toBeInTheDocument();
  });

  test("renders the SVG when given a 2×2 matrix", () => {
    const M = matrixValue([
      [1, 1],
      [0, 1],
    ]);
    render(<UnitGridVisualization inputs={{ M }} output={M} />);
    const svg = screen.getByTestId("unit-grid-svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-label", expect.stringMatching(/M = \[\[1, 1\], \[0, 1\]\]/));
  });
});
