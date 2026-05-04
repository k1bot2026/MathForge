import { describe, expect, test } from "vitest";
import type { MathValue } from "~/math/types";
import { computeBernoulli } from "../bernoulli/compute";
import { computeBeta } from "../beta/compute";
import type { DistributionPayload } from "../distribution-payload";
import { computePosterior } from "../posterior/compute";
import { BayesNetError, computeBayesNet } from "./compute";
import { BayesNetBlock } from "./definition";

const ctx = { signal: new AbortController().signal };

function betaPrior(alpha: number, beta: number): MathValue {
  return computeBeta({}, { alpha, beta });
}

function bernoulliLik(p: number): MathValue {
  return computeBernoulli({}, { p });
}

function getPayload(v: MathValue): DistributionPayload {
  return v.payload as unknown as DistributionPayload;
}

describe("BayesNetBlock definition", () => {
  test("has id stats.bayes-net", () => {
    expect(BayesNetBlock.id).toBe("stats.bayes-net");
  });

  test("has three inputs", () => {
    expect(BayesNetBlock.inputs).toHaveLength(3);
    expect(BayesNetBlock.inputs.map((p) => p.id)).toEqual(["prior", "likelihood1", "likelihood2"]);
  });

  test("has one Beta posterior output", () => {
    expect(BayesNetBlock.outputs).toHaveLength(1);
    expect(BayesNetBlock.outputs[0]?.id).toBe("posterior");
    expect(BayesNetBlock.outputs[0]?.type).toEqual({ kind: "Distribution", family: "Beta" });
  });

  test("has n1, k1, n2, k2 params with correct defaults", () => {
    expect(BayesNetBlock.params?.n1?.default).toBe(10);
    expect(BayesNetBlock.params?.k1?.default).toBe(7);
    expect(BayesNetBlock.params?.n2?.default).toBe(10);
    expect(BayesNetBlock.params?.k2?.default).toBe(5);
  });
});

describe("computeBayesNet", () => {
  const lik = bernoulliLik(0.5);

  // Key invariant: two sequential Beta-Bernoulli updates with (n1,k1) and (n2,k2)
  // are algebraically identical to a single update with (n1+n2, k1+k2).
  // Beta(α,β) + (n1+n2 obs, k1+k2 successes) → Beta(α + k1+k2, β + n1+n2 - k1-k2)
  test("two-step update equals single equivalent update (Beta-Bernoulli chain invariant)", () => {
    const prior = betaPrior(2, 3); // Beta(2,3)
    const n1 = 8;
    const k1 = 5;
    const n2 = 6;
    const k2 = 3;

    const twoStep = computeBayesNet(prior, lik, lik, n1, k1, n2, k2);

    // Equivalent single-step update
    const singleStep = computePosterior(
      { prior, likelihood: lik },
      { n_obs: n1 + n2, k_hits: k1 + k2, x_obs: 0 },
    );

    const twoStepP = getPayload(twoStep);
    const singleP = getPayload(singleStep);

    expect(twoStepP.parameters.family).toBe("Beta");
    expect(singleP.parameters.family).toBe("Beta");

    if (twoStepP.parameters.family === "Beta" && singleP.parameters.family === "Beta") {
      expect(twoStepP.parameters.alpha).toBeCloseTo(singleP.parameters.alpha, 10);
      expect(twoStepP.parameters.beta).toBeCloseTo(singleP.parameters.beta, 10);
    }
  });

  test("posterior α = prior_α + k1 + k2 (conjugate formula)", () => {
    const priorAlpha = 1;
    const priorBeta = 1;
    const prior = betaPrior(priorAlpha, priorBeta);
    const k1 = 4;
    const k2 = 3;
    const n1 = 10;
    const n2 = 10;

    const result = computeBayesNet(prior, lik, lik, n1, k1, n2, k2);
    const p = getPayload(result);
    expect(p.parameters.family).toBe("Beta");
    if (p.parameters.family === "Beta") {
      expect(p.parameters.alpha).toBeCloseTo(priorAlpha + k1 + k2, 10);
      expect(p.parameters.beta).toBeCloseTo(priorBeta + (n1 - k1) + (n2 - k2), 10);
    }
  });

  test("output is Distribution of family Beta", () => {
    const result = computeBayesNet(betaPrior(1, 1), lik, lik, 5, 3, 5, 2);
    expect(result.type).toEqual({ kind: "Distribution", family: "Beta" });
  });

  test("throws BayesNetError when prior is not Beta", () => {
    const poissonPrior: MathValue = {
      type: { kind: "Distribution", family: "Poisson" },
      payload: { parameters: { family: "Poisson", lambda: 2 } } as unknown as number,
      provenance: { blockId: "stats.poisson", inputs: [], computedAt: 0, engine: "native" },
    };
    expect(() => computeBayesNet(poissonPrior, lik, lik, 5, 3, 5, 2)).toThrow(BayesNetError);
  });
});

describe("BayesNetBlock compute", () => {
  const prior = betaPrior(1, 1);
  const lik = bernoulliLik(0.5);

  test("returns Beta Distribution for valid inputs", () => {
    const result = BayesNetBlock.compute(
      { prior, likelihood1: lik, likelihood2: lik },
      { n1: 10, k1: 7, n2: 8, k2: 4 },
      ctx,
    ) as MathValue;
    expect(result.type).toEqual({ kind: "Distribution", family: "Beta" });
  });

  test("throws when prior is missing", () => {
    expect(() =>
      BayesNetBlock.compute(
        { likelihood1: lik, likelihood2: lik },
        { n1: 10, k1: 7, n2: 8, k2: 4 },
        ctx,
      ),
    ).toThrow(BayesNetError);
  });

  test("throws when likelihood1 is missing", () => {
    expect(() =>
      BayesNetBlock.compute({ prior, likelihood2: lik }, { n1: 10, k1: 7, n2: 8, k2: 4 }, ctx),
    ).toThrow(BayesNetError);
  });

  test("throws when likelihood2 is missing", () => {
    expect(() =>
      BayesNetBlock.compute({ prior, likelihood1: lik }, { n1: 10, k1: 7, n2: 8, k2: 4 }, ctx),
    ).toThrow(BayesNetError);
  });
});

describe("BayesNetBlock explain", () => {
  test("effect shows posterior Beta params", () => {
    const prior = betaPrior(1, 1);
    const lik = bernoulliLik(0.5);
    const result = BayesNetBlock.compute(
      { prior, likelihood1: lik, likelihood2: lik },
      { n1: 10, k1: 7, n2: 10, k2: 5 },
      ctx,
    ) as MathValue;
    const msg = BayesNetBlock.explain.effect?.(
      { prior, likelihood1: lik, likelihood2: lik },
      result,
    );
    expect(msg).toMatch(/Beta/);
    expect(msg).toMatch(/E\[θ\]/);
  });

  test("effect returns connect prompt when prior missing", () => {
    const msg = BayesNetBlock.explain.effect?.({}, undefined as never);
    expect(msg).toMatch(/Connect/);
  });
});
