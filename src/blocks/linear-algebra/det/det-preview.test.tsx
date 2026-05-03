import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { DetPreviewRenderer } from "./det-preview";

function scalarValue(d: number): MathValue {
  return {
    type: { kind: "Scalar", field: "real", precision: "approximate" },
    payload: d,
    provenance: { blockId: "la.det", inputs: [], computedAt: 0, engine: "mathjs" },
  };
}

function matrixValue(rows: number[][]): MathValue {
  return {
    type: { kind: "Matrix", m: rows.length, n: rows[0]?.length ?? 0, field: "real" },
    payload: rows,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("DetPreviewRenderer", () => {
  test("renders det-preview-2d for a 2×2 matrix", () => {
    render(
      <DetPreviewRenderer
        value={scalarValue(2)}
        inputs={{
          A: matrixValue([
            [2, 0],
            [0, 1],
          ]),
        }}
      />,
    );
    expect(screen.getByTestId("det-preview-2d")).toBeInTheDocument();
  });

  test("renders nothing when A input is absent", () => {
    const { container } = render(<DetPreviewRenderer value={scalarValue(5)} inputs={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("negative det shows orientation-flipped label", () => {
    render(
      <DetPreviewRenderer
        value={scalarValue(-1)}
        inputs={{
          A: matrixValue([
            [-1, 0],
            [0, 1],
          ]),
        }}
      />,
    );
    expect(screen.getByText(/orientation flipped/i)).toBeInTheDocument();
  });

  test("zero det shows collapsed label", () => {
    render(
      <DetPreviewRenderer
        value={scalarValue(0)}
        inputs={{
          A: matrixValue([
            [0, 0],
            [0, 0],
          ]),
        }}
      />,
    );
    expect(screen.getByText(/collapsed/i)).toBeInTheDocument();
  });
});
