import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import type { DistributionPayload } from "../distribution-payload";
import { PosteriorUpdateBlock } from "./definition";
import { PosteriorUpdateVisualization } from "./visualization";

const signal = new AbortController().signal;

function betaValue(alpha: number, beta: number): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Beta", alpha, beta },
    moments: {
      mean: alpha / (alpha + beta),
      variance: (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1)),
    },
    support: { kind: "continuous", lo: 0, hi: 1 },
  };
  return {
    type: { kind: "Distribution", family: "Beta" },
    payload: payload as unknown as number,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

function normalValue(): MathValue {
  const payload: DistributionPayload = {
    parameters: { family: "Normal", mu: 0, sigma: 1 },
    moments: { mean: 0, variance: 1 },
    support: { kind: "continuous", lo: -Infinity, hi: Infinity },
  };
  return {
    type: { kind: "Distribution", family: "Normal" },
    payload: payload as unknown as number,
    provenance: { blockId: "test", inputs: [], computedAt: 0, engine: "native" },
  };
}

const uniformPrior = betaValue(1, 1);
const weakPrior = betaValue(2, 2);

describe("viz.posterior-update definition", () => {
  test("Beta-Bernoulli conjugate update: uniform prior + 7/10 → Beta(8,4)", () => {
    const result = PosteriorUpdateBlock.compute(
      { prior: uniformPrior },
      { n_obs: 10, k_hits: 7 },
      { signal },
    ) as MathValue;
    const p = result.payload as unknown as DistributionPayload;
    expect(p.parameters.family).toBe("Beta");
    if (p.parameters.family === "Beta") {
      expect(p.parameters.alpha).toBeCloseTo(8, 10);
      expect(p.parameters.beta).toBeCloseTo(4, 10);
    }
  });

  test("no observations leaves prior unchanged", () => {
    const result = PosteriorUpdateBlock.compute(
      { prior: weakPrior },
      { n_obs: 0, k_hits: 0 },
      { signal },
    ) as MathValue;
    const p = result.payload as unknown as DistributionPayload;
    expect(p.parameters.family).toBe("Beta");
    if (p.parameters.family === "Beta") {
      expect(p.parameters.alpha).toBeCloseTo(2, 10);
      expect(p.parameters.beta).toBeCloseTo(2, 10);
    }
  });

  test("k_hits is clamped to n_obs", () => {
    const result = PosteriorUpdateBlock.compute(
      { prior: uniformPrior },
      { n_obs: 5, k_hits: 100 },
      { signal },
    ) as MathValue;
    const p = result.payload as unknown as DistributionPayload;
    expect(p.parameters.family).toBe("Beta");
    if (p.parameters.family === "Beta") {
      expect(p.parameters.alpha).toBeCloseTo(6, 10);
      expect(p.parameters.beta).toBeCloseTo(1, 10);
    }
  });

  test("throws when prior is missing", () => {
    expect(() => PosteriorUpdateBlock.compute({}, { n_obs: 5, k_hits: 3 }, { signal })).toThrow(
      /requires a Beta Distribution/,
    );
  });

  test("throws when prior is not Beta", () => {
    expect(() =>
      PosteriorUpdateBlock.compute({ prior: normalValue() }, { n_obs: 5, k_hits: 3 }, { signal }),
    ).toThrow(/Beta prior/);
  });

  test("posterior E[theta] = (alpha+k)/(alpha+beta+n)", () => {
    // Beta(3,7) + k=12 of n=20 → Beta(15, 15), E = 15/30 = 0.5
    const result = PosteriorUpdateBlock.compute(
      { prior: betaValue(3, 7) },
      { n_obs: 20, k_hits: 12 },
      { signal },
    ) as MathValue;
    const p = result.payload as unknown as DistributionPayload;
    expect(p.moments.mean).toBeCloseTo(15 / 30, 10);
  });
});

describe("PosteriorUpdateVisualization", () => {
  test("renders placeholder when no prior connected", () => {
    render(<PosteriorUpdateVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("posterior-update-placeholder")).toBeInTheDocument();
  });

  test("renders non-beta notice when prior is Normal", () => {
    render(<PosteriorUpdateVisualization inputs={{ prior: normalValue() }} output={undefined} />);
    expect(screen.getByTestId("posterior-update-non-beta")).toBeInTheDocument();
  });

  test("renders chart when prior is Beta", () => {
    render(
      <PosteriorUpdateVisualization
        inputs={{ prior: uniformPrior }}
        output={uniformPrior}
        params={{ n_obs: 10, k_hits: 7 }}
      />,
    );
    expect(screen.getByTestId("posterior-update-root")).toBeInTheDocument();
  });

  test("renders with default params (no params passed)", () => {
    render(<PosteriorUpdateVisualization inputs={{ prior: weakPrior }} output={weakPrior} />);
    expect(screen.getByTestId("posterior-update-root")).toBeInTheDocument();
  });

  test("renders with n_obs=0 (no observations)", () => {
    render(
      <PosteriorUpdateVisualization
        inputs={{ prior: uniformPrior }}
        output={uniformPrior}
        params={{ n_obs: 0, k_hits: 0 }}
      />,
    );
    expect(screen.getByTestId("posterior-update-root")).toBeInTheDocument();
    expect(screen.getByText(/Adjust n_obs/)).toBeInTheDocument();
  });
});
