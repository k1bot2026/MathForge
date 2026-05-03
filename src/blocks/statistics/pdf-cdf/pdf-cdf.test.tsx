import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { PdfCdfBlock } from "./definition";
import { PdfCdfVisualization } from "./visualization";

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

const poissonDist = distValue(
  {
    parameters: { family: "Poisson", lambda: 3 },
    moments: { mean: 3, variance: 3, skewness: 1 / Math.sqrt(3), excessKurtosis: 1 / 3 },
    support: { kind: "discrete", values: [] },
  },
  "Poisson",
);

describe("viz.pdf-cdf definition", () => {
  test("compute passes the input distribution through unchanged", () => {
    const result = PdfCdfBlock.compute({ X: normalDist }, {}, { signal });
    expect(result).toBe(normalDist);
  });

  test("compute throws when X is missing", () => {
    expect(() => PdfCdfBlock.compute({}, {}, { signal })).toThrow(/requires a Distribution input/);
  });

  test("explain.effect reports the family", () => {
    const text = PdfCdfBlock.explain.effect?.({ X: normalDist }, normalDist) ?? "";
    expect(text).toMatch(/Normal/);
  });

  test("explain.effect placeholder when no input", () => {
    const text = PdfCdfBlock.explain.effect?.({}, normalDist) ?? "";
    expect(text).toMatch(/Connect/);
  });
});

describe("PdfCdfVisualization", () => {
  test("renders placeholder when no distribution connected", () => {
    render(<PdfCdfVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("pdf-cdf-placeholder")).toBeInTheDocument();
  });

  test("renders PDF and CDF panels for Normal distribution", () => {
    render(<PdfCdfVisualization inputs={{ X: normalDist }} output={normalDist} />);
    const root = screen.getByTestId("pdf-cdf-root");
    expect(root).toBeInTheDocument();
  });

  test("renders PDF and CDF panels for Poisson (discrete) distribution", () => {
    render(<PdfCdfVisualization inputs={{ X: poissonDist }} output={poissonDist} />);
    expect(screen.getByTestId("pdf-cdf-root")).toBeInTheDocument();
  });

  test("renders correctly for Bernoulli distribution", () => {
    const bernoulliDist = distValue(
      {
        parameters: { family: "Bernoulli", p: 0.3 },
        moments: { mean: 0.3, variance: 0.21, skewness: 0.872, excessKurtosis: -1.24 },
        support: { kind: "discrete", values: [0, 1] },
      },
      "Bernoulli",
    );
    render(<PdfCdfVisualization inputs={{ X: bernoulliDist }} output={bernoulliDist} />);
    expect(screen.getByTestId("pdf-cdf-root")).toBeInTheDocument();
  });

  test("renders correctly for Beta distribution", () => {
    const betaDist = distValue(
      {
        parameters: { family: "Beta", alpha: 2, beta: 5 },
        moments: {
          mean: 2 / 7,
          variance: (2 * 5) / (49 * 8),
          skewness: 0.596,
          excessKurtosis: -0.12,
        },
        support: { kind: "continuous", lo: 0, hi: 1 },
      },
      "Beta",
    );
    render(<PdfCdfVisualization inputs={{ X: betaDist }} output={betaDist} />);
    expect(screen.getByTestId("pdf-cdf-root")).toBeInTheDocument();
  });

  test("renders correctly for Gamma distribution", () => {
    const gammaDist = distValue(
      {
        parameters: { family: "Gamma", alpha: 3, beta: 1 },
        moments: { mean: 3, variance: 3, skewness: 2 / Math.sqrt(3), excessKurtosis: 2 },
        support: { kind: "continuous", lo: 0, hi: Infinity },
      },
      "Gamma",
    );
    render(<PdfCdfVisualization inputs={{ X: gammaDist }} output={gammaDist} />);
    expect(screen.getByTestId("pdf-cdf-root")).toBeInTheDocument();
  });

  test("renders correctly for Uniform distribution", () => {
    const uniformDist = distValue(
      {
        parameters: { family: "Uniform", a: 0, b: 1 },
        moments: { mean: 0.5, variance: 1 / 12, skewness: 0, excessKurtosis: -1.2 },
        support: { kind: "continuous", lo: 0, hi: 1 },
      },
      "Uniform",
    );
    render(<PdfCdfVisualization inputs={{ X: uniformDist }} output={uniformDist} />);
    expect(screen.getByTestId("pdf-cdf-root")).toBeInTheDocument();
  });

  test("renders correctly for Binomial distribution", () => {
    const binomDist = distValue(
      {
        parameters: { family: "Binomial", n: 10, p: 0.4 },
        moments: { mean: 4, variance: 2.4, skewness: 0.13, excessKurtosis: -0.067 },
        support: { kind: "discrete", values: [] },
      },
      "Binomial",
    );
    render(<PdfCdfVisualization inputs={{ X: binomDist }} output={binomDist} />);
    expect(screen.getByTestId("pdf-cdf-root")).toBeInTheDocument();
  });

  test("renders correctly for Empirical distribution", () => {
    const samples = Array.from({ length: 50 }, (_, i) => i * 0.1);
    const empiricalDist = distValue(
      {
        parameters: { family: "Empirical", samples },
        moments: { mean: 2.45, variance: 2.08 },
        support: { kind: "continuous", lo: 0, hi: 4.9 },
      },
      "Empirical",
    );
    render(<PdfCdfVisualization inputs={{ X: empiricalDist }} output={empiricalDist} />);
    expect(screen.getByTestId("pdf-cdf-root")).toBeInTheDocument();
  });
});
