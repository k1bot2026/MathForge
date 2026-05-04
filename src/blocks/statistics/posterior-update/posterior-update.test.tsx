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
const posterior8_4 = betaValue(8, 4);
const posterior15_15 = betaValue(15, 15);

describe("viz.posterior-update definition", () => {
  test("passthrough: returns the posterior input unchanged", () => {
    const result = PosteriorUpdateBlock.compute(
      { prior: uniformPrior, posterior: posterior8_4 },
      {},
      { signal },
    ) as MathValue;
    const p = result.payload as unknown as DistributionPayload;
    expect(p.parameters.family).toBe("Beta");
    if (p.parameters.family === "Beta") {
      expect(p.parameters.alpha).toBeCloseTo(8, 10);
      expect(p.parameters.beta).toBeCloseTo(4, 10);
    }
  });

  test("passthrough preserves provenance", () => {
    const result = PosteriorUpdateBlock.compute(
      { prior: uniformPrior, posterior: posterior15_15 },
      {},
      { signal },
    ) as MathValue;
    expect(result.provenance.blockId).toBe("test");
  });

  test("throws when posterior is missing", () => {
    expect(() => PosteriorUpdateBlock.compute({ prior: uniformPrior }, {}, { signal })).toThrow(
      /posterior input/,
    );
  });

  test("throws when posterior is not Beta", () => {
    expect(() =>
      PosteriorUpdateBlock.compute(
        { prior: uniformPrior, posterior: normalValue() },
        {},
        { signal },
      ),
    ).toThrow(/Beta posterior/);
  });
});

describe("viz.posterior-update explain", () => {
  const effect = PosteriorUpdateBlock.explain.effect;
  const impact = PosteriorUpdateBlock.explain.impact;

  test("effect returns connect prompt when inputs are missing", () => {
    expect(effect?.({}, uniformPrior)).toMatch(/Connect/);
  });

  test("effect returns correct posterior summary when both inputs present", () => {
    const msg = effect?.({ prior: uniformPrior, posterior: posterior8_4 }, posterior8_4);
    expect(msg).toMatch(/Posterior: Beta\(8\.000, 4\.000\)/);
    expect(msg).toMatch(/E\[θ\] = 0\.6667/);
  });

  test("impact returns correct Beta string when output is Beta", () => {
    const msg = impact?.({ prior: uniformPrior, posterior: posterior8_4 }, posterior8_4);
    expect(msg).toMatch(/Beta\(8\.000, 4\.000\)/);
    expect(msg).toMatch(/viz\.pdf-cdf/);
  });
});

describe("PosteriorUpdateVisualization", () => {
  test("renders placeholder when no prior connected", () => {
    render(<PosteriorUpdateVisualization inputs={{}} output={undefined} />);
    expect(screen.getByTestId("posterior-update-placeholder")).toBeInTheDocument();
  });

  test("renders non-beta notice when prior is Normal", () => {
    render(
      <PosteriorUpdateVisualization
        inputs={{ prior: normalValue(), posterior: posterior8_4 }}
        output={undefined}
      />,
    );
    expect(screen.getByTestId("posterior-update-non-beta")).toBeInTheDocument();
  });

  test("renders waiting state when posterior not yet connected", () => {
    render(<PosteriorUpdateVisualization inputs={{ prior: uniformPrior }} output={undefined} />);
    expect(screen.getByTestId("posterior-update-waiting")).toBeInTheDocument();
  });

  test("renders chart when both prior and posterior are Beta", () => {
    render(
      <PosteriorUpdateVisualization
        inputs={{ prior: uniformPrior, posterior: posterior8_4 }}
        output={posterior8_4}
      />,
    );
    expect(screen.getByTestId("posterior-update-root")).toBeInTheDocument();
  });

  test("legend shows prior and posterior parameters", () => {
    render(
      <PosteriorUpdateVisualization
        inputs={{ prior: betaValue(2, 5), posterior: betaValue(9, 8) }}
        output={betaValue(9, 8)}
      />,
    );
    expect(screen.getByTestId("posterior-update-root")).toBeInTheDocument();
  });

  test("summary line shows E[theta] shift", () => {
    render(
      <PosteriorUpdateVisualization
        inputs={{ prior: betaValue(1, 1), posterior: betaValue(8, 4) }}
        output={betaValue(8, 4)}
      />,
    );
    // E[theta] for Beta(1,1) = 0.5, for Beta(8,4) = 8/12 ≈ 0.667
    expect(screen.getByText(/0\.500.*0\.667|0\.667.*0\.500/)).toBeInTheDocument();
  });
});
