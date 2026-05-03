import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { JointHeatmapBlock } from "./definition";
import { JointHeatmapVisualization } from "./visualization";

const signal = new AbortController().signal;

function distValue(payload: DistributionPayload, family: string): MathValue {
  return {
    type: { kind: "Distribution", family: family as "Normal" },
    payload: payload as unknown as number,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const normalDist = distValue(
  {
    parameters: { family: "Normal", mu: 0, sigma: 1 },
    moments: { mean: 0, variance: 1, skewness: 0, excessKurtosis: 0 },
    support: { kind: "continuous", lo: -Infinity, hi: Infinity },
  },
  "Normal",
);

const uniformDist = distValue(
  {
    parameters: { family: "Uniform", a: 0, b: 1 },
    moments: { mean: 0.5, variance: 1 / 12, skewness: 0, excessKurtosis: -1.2 },
    support: { kind: "continuous", lo: 0, hi: 1 },
  },
  "Uniform",
);

describe("viz.joint-heatmap definition", () => {
  test("compute passes X through unchanged", () => {
    const result = JointHeatmapBlock.compute({ X: normalDist, Y: uniformDist }, {}, { signal });
    expect(result).toBe(normalDist);
  });

  test("compute throws when X is missing", () => {
    expect(() => JointHeatmapBlock.compute({}, {}, { signal })).toThrow(
      /requires Distribution inputs/,
    );
  });

  test("explain.effect reports both families", () => {
    const text =
      JointHeatmapBlock.explain.effect?.({ X: normalDist, Y: uniformDist }, normalDist) ?? "";
    expect(text).toMatch(/Normal/);
    expect(text).toMatch(/Uniform/);
  });
});

describe("JointHeatmapVisualization", () => {
  test("renders placeholder when no distributions connected", () => {
    render(<JointHeatmapVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("joint-heatmap-placeholder")).toBeInTheDocument();
  });

  test("renders placeholder when only X is connected", () => {
    render(<JointHeatmapVisualization inputs={{ X: normalDist }} output={undefined} />);
    expect(screen.getByTestId("joint-heatmap-placeholder")).toBeInTheDocument();
  });

  test("renders heatmap when both X and Y are connected", () => {
    render(
      <JointHeatmapVisualization inputs={{ X: normalDist, Y: uniformDist }} output={normalDist} />,
    );
    expect(screen.getByTestId("joint-heatmap-root")).toBeInTheDocument();
  });

  test("renders heatmap for two Normal distributions", () => {
    render(
      <JointHeatmapVisualization inputs={{ X: normalDist, Y: normalDist }} output={normalDist} />,
    );
    expect(screen.getByTestId("joint-heatmap-root")).toBeInTheDocument();
  });

  test("renders heatmap for Poisson × Beta", () => {
    const poissonDist = distValue(
      {
        parameters: { family: "Poisson", lambda: 3 },
        moments: { mean: 3, variance: 3 },
        support: { kind: "discrete", values: [] },
      },
      "Poisson",
    );
    const betaDist = distValue(
      {
        parameters: { family: "Beta", alpha: 2, beta: 5 },
        moments: { mean: 2 / 7, variance: (2 * 5) / (49 * 8) },
        support: { kind: "continuous", lo: 0, hi: 1 },
      },
      "Beta",
    );
    render(
      <JointHeatmapVisualization inputs={{ X: poissonDist, Y: betaDist }} output={poissonDist} />,
    );
    expect(screen.getByTestId("joint-heatmap-root")).toBeInTheDocument();
  });
});
