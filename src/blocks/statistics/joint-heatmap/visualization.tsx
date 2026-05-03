"use client";

// Joint distribution heatmap using SVG with a color-mapped grid.
// Assumes independence: p(x,y) = p_X(x) * p_Y(y).
// Renders a 40x40 grid with color intensity proportional to joint density.

import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionParameters, DistributionPayload } from "../distribution-payload";

const GRID = 40;
const W = 300;
const H = 300;
const PAD = 28;
const CELL_W = (W - PAD * 2) / GRID;
const CELL_H = (H - PAD * 2) / GRID;

// Reuse the same marginal PDF functions from pdf-cdf but inline here to avoid coupling.

function normalPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

function lnGamma(z: number): number {
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

function betaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return 0;
  const logB = lnGamma(alpha) + lnGamma(beta) - lnGamma(alpha + beta);
  return Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logB);
}

function gammaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0) return 0;
  return Math.exp(alpha * Math.log(beta) + (alpha - 1) * Math.log(x) - beta * x - lnGamma(alpha));
}

function uniformPdf(x: number, a: number, b: number): number {
  return x >= a && x <= b ? 1 / (b - a) : 0;
}

function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  let logP = k * Math.log(lambda) - lambda;
  for (let i = 1; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function binomialPmf(k: number, n: number, p: number): number {
  if (k < 0 || k > n || !Number.isInteger(k)) return 0;
  let logBinom = 0;
  for (let i = 0; i < k; i++) logBinom += Math.log(n - i) - Math.log(i + 1);
  return Math.exp(logBinom + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

function marginalPdf(x: number, params: DistributionParameters): number {
  if (params.family === "Normal") return normalPdf(x, params.mu, params.sigma);
  if (params.family === "Uniform") return uniformPdf(x, params.a, params.b);
  if (params.family === "Beta") return betaPdf(x, params.alpha, params.beta);
  if (params.family === "Gamma") return gammaPdf(x, params.alpha, params.beta);
  if (params.family === "Poisson") return poissonPmf(x, params.lambda);
  if (params.family === "Bernoulli") return x === 0 ? 1 - params.p : x === 1 ? params.p : 0;
  if (params.family === "Binomial") return binomialPmf(x, params.n, params.p);
  if (params.family === "Empirical") {
    const { samples } = params;
    if (samples.length === 0) return 0;
    const bw =
      0.5 *
      Math.sqrt(
        samples.reduce(
          (a, b) => a + (b - samples.reduce((c, d) => c + d, 0) / samples.length) ** 2,
          0,
        ) / samples.length,
      );
    if (bw < 1e-10) return samples.includes(x) ? 1 : 0;
    return (
      samples.reduce(
        (sum, xi) => sum + Math.exp(-0.5 * ((x - xi) / bw) ** 2) / (bw * Math.sqrt(2 * Math.PI)),
        0,
      ) / samples.length
    );
  }
  return 0;
}

function getRange(params: DistributionParameters): [number, number] {
  if (params.family === "Normal")
    return [params.mu - 4 * params.sigma, params.mu + 4 * params.sigma];
  if (params.family === "Uniform") return [params.a, params.b];
  if (params.family === "Beta") return [0, 1];
  if (params.family === "Gamma") {
    const mode = params.alpha > 1 ? (params.alpha - 1) / params.beta : 0;
    return [0, mode + (5 * Math.sqrt(params.alpha)) / params.beta];
  }
  if (params.family === "Poisson")
    return [0, Math.ceil(params.lambda + 5 * Math.sqrt(params.lambda))];
  if (params.family === "Bernoulli") return [0, 1];
  if (params.family === "Binomial") return [0, params.n];
  if (params.family === "Empirical") {
    const s = params.samples;
    const lo = Math.min(...s);
    const hi = Math.max(...s);
    const range = hi - lo || 1;
    return [lo - range * 0.1, hi + range * 0.1];
  }
  return [0, 1];
}

function colorForDensity(density: number, maxDensity: number): string {
  if (maxDensity < 1e-15) return "rgba(0,0,0,0)";
  const t = density / maxDensity;
  // Indigo-to-amber palette matching BRAND.md stochastic color
  const r = Math.round(t * 251);
  const g = Math.round(t * 191);
  const b = Math.round(255 * (1 - t) + t * 36);
  return `rgba(${r},${g},${b},${0.15 + t * 0.85})`;
}

type GridCell = { row: number; col: number; density: number; x: number; y: number };

export function JointHeatmapVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const X = inputs.X;
  const Y = inputs.Y;

  if (
    X === undefined ||
    Y === undefined ||
    X.type.kind !== "Distribution" ||
    Y.type.kind !== "Distribution"
  ) {
    return (
      <div
        data-testid="joint-heatmap-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect two Distributions to X and Y.
      </div>
    );
  }

  const payloadX = X.payload as unknown as DistributionPayload;
  const payloadY = Y.payload as unknown as DistributionPayload;
  const [xLo, xHi] = getRange(payloadX.parameters);
  const [yLo, yHi] = getRange(payloadY.parameters);

  // Build grid of joint densities
  const cells: GridCell[] = [];
  let maxDensity = 0;

  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const x = xLo + ((col + 0.5) * (xHi - xLo)) / GRID;
      const y = yLo + ((row + 0.5) * (yHi - yLo)) / GRID;
      const density = marginalPdf(x, payloadX.parameters) * marginalPdf(y, payloadY.parameters);
      if (density > maxDensity) maxDensity = density;
      cells.push({ row, col, density, x, y });
    }
  }

  const familyStr = (f: typeof X.type.family): string => (typeof f === "string" ? f : f.custom);
  const xLabel = familyStr(X.type.family);
  const yLabel = familyStr(Y.type.family);

  type AxisTick = { label: string; pos: number };
  const xTicks: AxisTick[] = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    label: (xLo + f * (xHi - xLo)).toPrecision(3),
    pos: PAD + f * (W - 2 * PAD),
  }));
  const yTicks: AxisTick[] = [0, 0.5, 1].map((f) => ({
    label: (yLo + f * (yHi - yLo)).toPrecision(3),
    pos: PAD + (1 - f) * (H - 2 * PAD),
  }));

  return (
    <div data-testid="joint-heatmap-root">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: W, height: H }}
        role="img"
        aria-label={`Joint density heatmap: X ~ ${xLabel}, Y ~ ${yLabel}`}
      >
        {/* Heatmap cells */}
        {cells.map(({ row, col, density }) => (
          <rect
            key={`cell-${row}-${col}`}
            x={PAD + col * CELL_W}
            y={PAD + row * CELL_H}
            width={CELL_W}
            height={CELL_H}
            fill={colorForDensity(density, maxDensity)}
          />
        ))}
        {/* Axes */}
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--border)" strokeWidth={1} />
        {/* X-axis ticks */}
        {xTicks.map(({ label, pos }) => (
          <g key={`xt-${label}`}>
            <line
              x1={pos}
              y1={H - PAD}
              x2={pos}
              y2={H - PAD + 4}
              stroke="var(--fg-muted)"
              strokeWidth={0.8}
            />
            <text x={pos} y={H - PAD + 13} textAnchor="middle" fontSize={8} fill="var(--fg-muted)">
              {label}
            </text>
          </g>
        ))}
        {/* Y-axis ticks */}
        {yTicks.map(({ label, pos }) => (
          <g key={`yt-${label}`}>
            <line
              x1={PAD - 4}
              y1={pos}
              x2={PAD}
              y2={pos}
              stroke="var(--fg-muted)"
              strokeWidth={0.8}
            />
            <text x={PAD - 6} y={pos + 3} textAnchor="end" fontSize={8} fill="var(--fg-muted)">
              {label}
            </text>
          </g>
        ))}
        {/* Axis labels */}
        <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="var(--fg-muted)">
          {xLabel}
        </text>
        <text
          x={8}
          y={H / 2}
          textAnchor="middle"
          fontSize={9}
          fill="var(--fg-muted)"
          transform={`rotate(-90, 8, ${H / 2})`}
        >
          {yLabel}
        </text>
      </svg>
    </div>
  );
}
