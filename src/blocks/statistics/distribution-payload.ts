// Shared DistributionPayload type for all stats.* distribution blocks.
//
// Design: parametric moments (mean, variance, skewness, excess kurtosis) are
// computed eagerly via closed-form formulas at block compute time — no lazy
// cache needed since all Phase-3 families have O(1) formulas. SymPy escalation
// is reserved for stats.mgf (Expression output) and stats.posterior.
//
// `parameters` is a typed discriminated union so downstream blocks (stats.expect,
// stats.var, stats.sample, viz.pdf-cdf) can pattern-match on family without
// casting.

export type BernoulliParameters = { p: number };
export type BinomialParameters = { n: number; p: number };
export type UniformParameters = { a: number; b: number };
export type NormalParameters = { mu: number; sigma: number };
export type PoissonParameters = { lambda: number };
export type BetaParameters = { alpha: number; beta: number };
export type GammaParameters = { alpha: number; beta: number };
export type EmpiricalParameters = { samples: ReadonlyArray<number> };

export type DistributionParameters =
  | ({ family: "Bernoulli" } & BernoulliParameters)
  | ({ family: "Binomial" } & BinomialParameters)
  | ({ family: "Uniform" } & UniformParameters)
  | ({ family: "Normal" } & NormalParameters)
  | ({ family: "Poisson" } & PoissonParameters)
  | ({ family: "Beta" } & BetaParameters)
  | ({ family: "Gamma" } & GammaParameters)
  | ({ family: "Empirical" } & EmpiricalParameters);

export type DistributionMoments = {
  mean: number;
  variance: number;
  /** Pearson's moment coefficient of skewness. Undefined for degenerate distributions. */
  skewness?: number | undefined;
  /** Excess kurtosis (Fisher's definition: kurtosis - 3). Undefined for degenerate distributions. */
  excessKurtosis?: number | undefined;
};

export type DistributionPayload = {
  parameters: DistributionParameters;
  moments: DistributionMoments;
  /** Support of the distribution for viz sampling. */
  support:
    | { kind: "discrete"; values: ReadonlyArray<number> }
    | { kind: "continuous"; lo: number; hi: number };
};
