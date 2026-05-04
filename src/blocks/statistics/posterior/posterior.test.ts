import { describe, expect, test } from "vitest";
import type { DistributionPayload } from "../distribution-payload";
import { computePosterior, PosteriorError } from "./compute";

function betaDist(alpha: number, beta: number): Parameters<typeof computePosterior>[0] {
  const payload: DistributionPayload = {
    parameters: { family: "Beta", alpha, beta },
    moments: {
      mean: alpha / (alpha + beta),
      variance: (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1)),
    },
    support: { kind: "continuous", lo: 0, hi: 1 },
  };
  return {
    prior: {
      type: { kind: "Distribution", family: "Beta" },
      payload: payload as unknown as number,
      provenance: { blockId: "stats.beta", inputs: [], computedAt: 0, engine: "native" },
    },
  };
}

function bernoulliDist(): Parameters<typeof computePosterior>[0]["prior"] {
  const payload: DistributionPayload = {
    parameters: { family: "Bernoulli", p: 0.5 },
    moments: { mean: 0.5, variance: 0.25 },
    support: { kind: "discrete", values: [0, 1] },
  };
  return {
    type: { kind: "Distribution", family: "Bernoulli" },
    payload: payload as unknown as number,
    provenance: { blockId: "stats.bernoulli", inputs: [], computedAt: 0, engine: "native" },
  };
}

function binomialDist(): Parameters<typeof computePosterior>[0]["prior"] {
  const payload: DistributionPayload = {
    parameters: { family: "Binomial", n: 10, p: 0.5 },
    moments: { mean: 5, variance: 2.5 },
    support: { kind: "discrete", values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  };
  return {
    type: { kind: "Distribution", family: "Binomial" },
    payload: payload as unknown as number,
    provenance: { blockId: "stats.binomial", inputs: [], computedAt: 0, engine: "native" },
  };
}

function normalDist(mu: number, sigma: number): Parameters<typeof computePosterior>[0]["prior"] {
  const payload: DistributionPayload = {
    parameters: { family: "Normal", mu, sigma },
    moments: { mean: mu, variance: sigma ** 2 },
    support: { kind: "continuous", lo: -Infinity, hi: Infinity },
  };
  return {
    type: { kind: "Distribution", family: "Normal" },
    payload: payload as unknown as number,
    provenance: { blockId: "stats.normal", inputs: [], computedAt: 0, engine: "native" },
  };
}

function gammaDist(alpha: number, beta: number): Parameters<typeof computePosterior>[0]["prior"] {
  const payload: DistributionPayload = {
    parameters: { family: "Gamma", alpha, beta },
    moments: { mean: alpha / beta, variance: alpha / beta ** 2 },
    support: { kind: "continuous", lo: 0, hi: Infinity },
  };
  return {
    type: { kind: "Distribution", family: "Gamma" },
    payload: payload as unknown as number,
    provenance: { blockId: "stats.gamma", inputs: [], computedAt: 0, engine: "native" },
  };
}

function poissonDist(): Parameters<typeof computePosterior>[0]["prior"] {
  const payload: DistributionPayload = {
    parameters: { family: "Poisson", lambda: 2 },
    moments: { mean: 2, variance: 2 },
    support: { kind: "discrete", values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  };
  return {
    type: { kind: "Distribution", family: "Poisson" },
    payload: payload as unknown as number,
    provenance: { blockId: "stats.poisson", inputs: [], computedAt: 0, engine: "native" },
  };
}

describe("stats.posterior — Beta–Bernoulli conjugate", () => {
  test("Prior Beta(1,1) + 7/10 → Posterior Beta(8,4)", () => {
    const inputs = { ...betaDist(1, 1), likelihood: bernoulliDist() };
    const result = computePosterior(inputs, { n_obs: 10, k_hits: 7 });
    const payload = result.payload as unknown as DistributionPayload;
    expect(payload.parameters.family).toBe("Beta");
    const { alpha, beta } = payload.parameters as { family: "Beta"; alpha: number; beta: number };
    expect(alpha).toBeCloseTo(8, 10);
    expect(beta).toBeCloseTo(4, 10);
  });

  test("Beta(2,5) + 3/5 → Beta(5,7)", () => {
    const inputs = { ...betaDist(2, 5), likelihood: bernoulliDist() };
    const result = computePosterior(inputs, { n_obs: 5, k_hits: 3 });
    const payload = result.payload as unknown as DistributionPayload;
    const { alpha, beta } = payload.parameters as { family: "Beta"; alpha: number; beta: number };
    expect(alpha).toBeCloseTo(5, 10);
    expect(beta).toBeCloseTo(7, 10);
  });

  test("E[θ] = α_post/(α_post + β_post)", () => {
    const inputs = { ...betaDist(3, 7), likelihood: bernoulliDist() };
    const result = computePosterior(inputs, { n_obs: 20, k_hits: 12 });
    const payload = result.payload as unknown as DistributionPayload;
    const { alpha, beta } = payload.parameters as { family: "Beta"; alpha: number; beta: number };
    const postMean = alpha / (alpha + beta);
    expect(postMean).toBeCloseTo(15 / 30, 10);
  });

  test("output type is Distribution(Beta)", () => {
    const inputs = { ...betaDist(1, 1), likelihood: bernoulliDist() };
    const result = computePosterior(inputs, { n_obs: 10, k_hits: 7 });
    expect(result.type).toEqual({ kind: "Distribution", family: "Beta" });
  });

  test("provenance blockId is stats.posterior", () => {
    const inputs = { ...betaDist(1, 1), likelihood: bernoulliDist() };
    const result = computePosterior(inputs, { n_obs: 10, k_hits: 7 });
    expect(result.provenance.blockId).toBe("stats.posterior");
  });
});

describe("stats.posterior — Beta–Binomial conjugate", () => {
  test("Prior Beta(1,1) + 7/10 → Posterior Beta(8,4)", () => {
    const inputs = { ...betaDist(1, 1), likelihood: binomialDist() };
    const result = computePosterior(inputs, { n_obs: 10, k_hits: 7 });
    const payload = result.payload as unknown as DistributionPayload;
    const { alpha, beta } = payload.parameters as { family: "Beta"; alpha: number; beta: number };
    expect(alpha).toBeCloseTo(8, 10);
    expect(beta).toBeCloseTo(4, 10);
  });

  test("Beta(2,3) + 0/5 → Beta(2,8)", () => {
    const inputs = { ...betaDist(2, 3), likelihood: binomialDist() };
    const result = computePosterior(inputs, { n_obs: 5, k_hits: 0 });
    const payload = result.payload as unknown as DistributionPayload;
    const { alpha, beta } = payload.parameters as { family: "Beta"; alpha: number; beta: number };
    expect(alpha).toBeCloseTo(2, 10);
    expect(beta).toBeCloseTo(8, 10);
  });
});

describe("stats.posterior — Normal–Normal conjugate (known σ)", () => {
  test("matches closed-form update formula", () => {
    const mu0 = 0;
    const sigma0 = 1;
    const sigmaLik = 2;
    const xObs = 3;
    const n = 5;

    const var0 = sigma0 ** 2;
    const varLik = sigmaLik ** 2;
    const varPost = 1 / (1 / var0 + n / varLik);
    const muPost = varPost * (mu0 / var0 + (n * xObs) / varLik);
    const sigmaPost = Math.sqrt(varPost);

    const inputs = {
      prior: normalDist(mu0, sigma0),
      likelihood: normalDist(0, sigmaLik),
    };
    const result = computePosterior(inputs, { n_obs: n, k_hits: 0, x_obs: xObs });
    const payload = result.payload as unknown as DistributionPayload;
    expect(payload.parameters.family).toBe("Normal");
    const params = payload.parameters as { family: "Normal"; mu: number; sigma: number };
    expect(params.mu).toBeCloseTo(muPost, 8);
    expect(params.sigma).toBeCloseTo(sigmaPost, 8);
  });

  test("output type is Distribution(Normal)", () => {
    const inputs = { prior: normalDist(0, 1), likelihood: normalDist(0, 1) };
    const result = computePosterior(inputs, { n_obs: 10, k_hits: 0, x_obs: 2 });
    expect(result.type).toEqual({ kind: "Distribution", family: "Normal" });
  });

  test("single observation (n=1) reduces variance", () => {
    const inputs = { prior: normalDist(0, 2), likelihood: normalDist(0, 1) };
    const result = computePosterior(inputs, { n_obs: 1, k_hits: 0, x_obs: 0 });
    const payload = result.payload as unknown as DistributionPayload;
    expect(payload.moments.variance).toBeLessThan(4);
  });
});

describe("stats.posterior — Gamma–Poisson conjugate", () => {
  test("Gamma(2,1) + 8 events in 4 periods → Gamma(10,5)", () => {
    const inputs = { prior: gammaDist(2, 1), likelihood: poissonDist() };
    const result = computePosterior(inputs, { n_obs: 4, k_hits: 8 });
    const payload = result.payload as unknown as DistributionPayload;
    expect(payload.parameters.family).toBe("Gamma");
    const params = payload.parameters as { family: "Gamma"; alpha: number; beta: number };
    expect(params.alpha).toBeCloseTo(10, 10);
    expect(params.beta).toBeCloseTo(5, 10);
  });

  test("output type is Distribution(Gamma)", () => {
    const inputs = { prior: gammaDist(1, 1), likelihood: poissonDist() };
    const result = computePosterior(inputs, { n_obs: 5, k_hits: 10 });
    expect(result.type).toEqual({ kind: "Distribution", family: "Gamma" });
  });

  test("E[λ] = (α+k)/(β+n)", () => {
    const inputs = { prior: gammaDist(3, 2), likelihood: poissonDist() };
    const result = computePosterior(inputs, { n_obs: 6, k_hits: 9 });
    const payload = result.payload as unknown as DistributionPayload;
    expect(payload.moments.mean).toBeCloseTo(12 / 8, 8);
  });
});

describe("stats.posterior definition explain.effect", () => {
  test("returns connect prompt when prior is undefined", async () => {
    const { PosteriorBlock } = await import("./definition");
    const effect = PosteriorBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const dummyOutput = {
      type: { kind: "Distribution" as const, family: "Beta" as const },
      payload: {
        parameters: { family: "Beta" as const, alpha: 2, beta: 3 },
        moments: { mean: 0.4, variance: 0.04 },
        support: { kind: "continuous" as const, lo: 0, hi: 1 },
      } as unknown as number,
      provenance: {
        blockId: "stats.posterior",
        inputs: [],
        computedAt: 0,
        engine: "native" as const,
      },
    };
    expect(effect({}, dummyOutput)).toMatch(/Connect/);
  });

  test("effect describes Beta posterior with E[θ]", async () => {
    const { PosteriorBlock } = await import("./definition");
    const effect = PosteriorBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    // Use a Beta dist directly as MathValue (same shape as betaDist helper returns for .prior)
    const betaPayload: DistributionPayload = {
      parameters: { family: "Beta", alpha: 8, beta: 4 },
      moments: { mean: 8 / 12, variance: (8 * 4) / (144 * 13) },
      support: { kind: "continuous", lo: 0, hi: 1 },
    };
    const prior = betaDist(8, 4);
    const inputs = { ...prior, likelihood: bernoulliDist() };
    const result = computePosterior(inputs, { n_obs: 0, k_hits: 0 });
    const priorVal = {
      type: { kind: "Distribution" as const, family: "Beta" as const },
      payload: betaPayload as unknown as number,
      provenance: {
        blockId: "stats.beta",
        inputs: [] as string[],
        computedAt: 0,
        engine: "native" as const,
      },
    };
    const out = effect({ prior: priorVal }, result);
    expect(out).toMatch(/Beta/);
    expect(out).toMatch(/E\[θ\]/);
  });

  test("effect describes Normal posterior", async () => {
    const { PosteriorBlock } = await import("./definition");
    const effect = PosteriorBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const prior = normalDist(0, 1);
    const result = computePosterior(
      { prior, likelihood: normalDist(0, 2) },
      { n_obs: 5, x_obs: 1 },
    );
    const out = effect({ prior }, result);
    expect(out).toMatch(/Normal/);
  });

  test("effect describes Gamma posterior with E[λ]", async () => {
    const { PosteriorBlock } = await import("./definition");
    const effect = PosteriorBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    const prior = gammaDist(2, 1);
    const result = computePosterior({ prior, likelihood: poissonDist() }, { n_obs: 4, k_hits: 8 });
    const out = effect({ prior }, result);
    expect(out).toMatch(/Gamma/);
    expect(out).toMatch(/E\[λ\]/);
  });

  test("effect returns generic fallback for non-Beta/Normal/Gamma output", async () => {
    const { PosteriorBlock } = await import("./definition");
    const effect = PosteriorBlock.explain.effect;
    if (effect === undefined) throw new Error("effect undefined");
    // Construct a dummy output with a family not handled by the effect branches
    const payload: DistributionPayload = {
      parameters: { family: "Bernoulli", p: 0.5 },
      moments: { mean: 0.5, variance: 0.25 },
      support: { kind: "discrete", values: [0, 1] },
    };
    const dummyOutput = {
      type: { kind: "Distribution" as const, family: "Bernoulli" as const },
      payload: payload as unknown as number,
      provenance: {
        blockId: "test",
        inputs: [] as string[],
        computedAt: 0,
        engine: "native" as const,
      },
    };
    const priorVal = {
      type: { kind: "Distribution" as const, family: "Beta" as const },
      payload: {} as unknown as number,
      provenance: {
        blockId: "test",
        inputs: [] as string[],
        computedAt: 0,
        engine: "native" as const,
      },
    };
    const msg = effect({ prior: priorVal }, dummyOutput);
    expect(msg).toBe("Posterior computed.");
  });

  test("impact returns family name and visualization hint", async () => {
    const { PosteriorBlock } = await import("./definition");
    const impact = PosteriorBlock.explain.impact;
    if (impact === undefined) throw new Error("impact undefined");
    const inputs = { ...betaDist(1, 1), likelihood: bernoulliDist() };
    const result = computePosterior(inputs, { n_obs: 10, k_hits: 5 });
    const msg = impact({}, result);
    expect(msg).toMatch(/Beta/);
    expect(msg).toMatch(/viz/);
  });
});

describe("stats.posterior — error cases", () => {
  test("throws PosteriorError for missing prior", () => {
    expect(() => computePosterior({ likelihood: bernoulliDist() }, {})).toThrow(PosteriorError);
  });

  test("throws PosteriorError for missing likelihood", () => {
    const inputs = betaDist(1, 1);
    expect(() => computePosterior(inputs, {})).toThrow(PosteriorError);
  });

  test("throws PosteriorError for non-conjugate pair (Normal prior + Bernoulli likelihood)", () => {
    const inputs = { prior: normalDist(0, 1), likelihood: bernoulliDist() };
    expect(() => computePosterior(inputs, { n_obs: 10, k_hits: 5 })).toThrow(PosteriorError);
    expect(() => computePosterior(inputs, { n_obs: 10, k_hits: 5 })).toThrow(/Non-conjugate/);
  });

  test("throws PosteriorError for non-conjugate pair (Beta prior + Poisson likelihood)", () => {
    const inputs = { ...betaDist(2, 2), likelihood: poissonDist() };
    expect(() => computePosterior(inputs, { n_obs: 5, k_hits: 3 })).toThrow(PosteriorError);
  });

  test("k_hits clamped to n_obs (k > n treated as k=n)", () => {
    const inputs = { ...betaDist(1, 1), likelihood: bernoulliDist() };
    const result = computePosterior(inputs, { n_obs: 5, k_hits: 10 });
    const payload = result.payload as unknown as DistributionPayload;
    const { alpha, beta } = payload.parameters as { family: "Beta"; alpha: number; beta: number };
    expect(alpha).toBeCloseTo(6, 10);
    expect(beta).toBeCloseTo(1, 10);
  });

  test("throws PosteriorError when prior is not a Distribution (scalar input)", () => {
    const scalar = {
      type: { kind: "Scalar" as const, field: "real" as const, precision: "exact" as const },
      payload: 1 as unknown as number,
      provenance: {
        blockId: "test",
        inputs: [] as string[],
        computedAt: 0,
        engine: "native" as const,
      },
    };
    expect(() => computePosterior({ prior: scalar, likelihood: bernoulliDist() }, {})).toThrow(
      /Distribution/,
    );
  });
});
