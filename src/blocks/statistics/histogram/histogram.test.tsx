import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { HistogramBlock } from "./definition";
import { HistogramVisualization } from "./visualization";

const signal = new AbortController().signal;

function vectorValue(data: number[]): MathValue {
  return {
    type: { kind: "Vector", n: data.length, field: "real" },
    payload: data as unknown as number,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const sampleVec = vectorValue([1, 2, 2, 3, 3, 3, 4, 4, 5]);

describe("viz.histogram definition", () => {
  test("compute passes samples through unchanged", () => {
    const result = HistogramBlock.compute({ samples: sampleVec }, {}, { signal });
    expect(result).toBe(sampleVec);
  });

  test("compute throws when samples is missing", () => {
    expect(() => HistogramBlock.compute({}, {}, { signal })).toThrow(/requires a Vector input/);
  });

  test("explain.effect reports sample count", () => {
    const text = HistogramBlock.explain.effect?.({ samples: sampleVec }, sampleVec) ?? "";
    expect(text).toMatch(/9 samples/);
  });

  test("explain.effect placeholder when no input", () => {
    const text = HistogramBlock.explain.effect?.({}, sampleVec) ?? "";
    expect(text).toMatch(/Connect/);
  });
});

describe("HistogramVisualization", () => {
  test("renders placeholder when no samples connected", () => {
    render(<HistogramVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("histogram-placeholder")).toBeInTheDocument();
  });

  test("renders root container when samples are connected", () => {
    render(<HistogramVisualization inputs={{ samples: sampleVec }} output={sampleVec} />);
    expect(screen.getByTestId("histogram-root")).toBeInTheDocument();
  });

  test("renders correctly with kde=false param", () => {
    render(
      <HistogramVisualization
        inputs={{ samples: sampleVec }}
        output={sampleVec}
        params={{ bins: 5, kde: false }}
      />,
    );
    expect(screen.getByTestId("histogram-root")).toBeInTheDocument();
  });

  test("renders correctly with explicit bin count", () => {
    const large = vectorValue(Array.from({ length: 100 }, (_, i) => i));
    render(
      <HistogramVisualization
        inputs={{ samples: large }}
        output={large}
        params={{ bins: 20, kde: true }}
      />,
    );
    expect(screen.getByTestId("histogram-root")).toBeInTheDocument();
  });
});
