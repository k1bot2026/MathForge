// Shared probability math utilities for statistics visualization components.
// These functions are for rendering only (PDF/CDF curves) — not for compute logic.

export function lnGamma(z: number): number {
  const c = [76.18009173, -86.50532033, 24.01409824, -1.23173957, 0.00120865097, -5.3952394e-6];
  const x = z;
  let y = z;
  const tmp = x + 5.5;
  const ser = c.reduce((acc, ci) => {
    y += 1;
    return acc + ci / y;
  }, 1.00000000019);
  return (x + 0.5) * Math.log(tmp) - tmp + Math.log((2.50662827465 * ser) / x);
}

export function betaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return 0;
  const logB = lnGamma(alpha) + lnGamma(beta) - lnGamma(alpha + beta);
  return Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logB);
}

export function gammaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0) return 0;
  return Math.exp(alpha * Math.log(beta) + (alpha - 1) * Math.log(x) - beta * x - lnGamma(alpha));
}

export function normalPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

export function normalCdf(x: number, mu: number, sigma: number): number {
  const sign = x >= mu ? 1 : -1;
  const t = 1 / (1 + 0.3275911 * Math.abs((x - mu) / (sigma * Math.SQRT2)));
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const z2 = ((x - mu) / (sigma * Math.SQRT2)) ** 2;
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-z2)));
}

export function uniformPdf(x: number, a: number, b: number): number {
  return x >= a && x <= b ? 1 / (b - a) : 0;
}

export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  let logP = k * Math.log(lambda) - lambda;
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

export function binomialPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n || !Number.isInteger(k)) return 0;
  let logBinom = 0;
  for (let i = 0; i < k; i++) logBinom += Math.log(n - i) - Math.log(i + 1);
  return Math.exp(logBinom + k * Math.log(p) + (n - k) * Math.log(1 - p));
}
