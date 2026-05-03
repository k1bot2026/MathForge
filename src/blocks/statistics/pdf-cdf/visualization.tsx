"use client";

import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";
import type { DistributionParameters, DistributionPayload } from "../distribution-payload";
import {
  betaPdf,
  binomialPmf,
  gammaPdf,
  normalCdf,
  normalPdf,
  poissonPmf,
  uniformPdf,
} from "../viz-math";

const W = 480;
const H = 180;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 32;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function tx(frac: number): number {
  return PAD_L + frac * PLOT_W;
}
function ty(frac: number): number {
  return PAD_T + (1 - frac) * PLOT_H;
}

type PlotSeries = {
  xs: number[];
  pdfYs: number[];
  cdfYs: number[];
  isDiscrete: boolean;
};

function buildSeries(params: DistributionParameters): PlotSeries {
  const N = 200;

  if (params.family === "Normal") {
    const { mu, sigma } = params;
    const lo = mu - 4 * sigma;
    const hi = mu + 4 * sigma;
    const xs = Array.from({ length: N }, (_, i) => lo + (i / (N - 1)) * (hi - lo));
    const pdfYs = xs.map((x) => normalPdf(x, mu, sigma));
    const cdfYs = xs.map((x) => normalCdf(x, mu, sigma));
    return { xs, pdfYs, cdfYs, isDiscrete: false };
  }

  if (params.family === "Uniform") {
    const { a, b } = params;
    const margin = (b - a) * 0.15;
    const lo = a - margin;
    const hi = b + margin;
    const xs = Array.from({ length: N }, (_, i) => lo + (i / (N - 1)) * (hi - lo));
    const pdfYs = xs.map((x) => uniformPdf(x, a, b));
    const cdfYs = xs.map((x) => (x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a)));
    // Clamp endpoints so the step edges render cleanly
    pdfYs[0] = 0;
    pdfYs[pdfYs.length - 1] = 0;
    return { xs, pdfYs, cdfYs, isDiscrete: false };
  }

  if (params.family === "Beta") {
    const { alpha, beta } = params;
    const xs = Array.from({ length: N }, (_, i) => 0.001 + (i / (N - 1)) * 0.998);
    const pdfYs = xs.map((x) => betaPdf(x, alpha, beta));
    // CDF via numerical integration (trapezoid)
    const cdfYs: number[] = [0];
    for (let i = 1; i < xs.length; i++) {
      const dx = (xs[i] ?? 0) - (xs[i - 1] ?? 0);
      cdfYs.push((cdfYs[i - 1] ?? 0) + 0.5 * ((pdfYs[i - 1] ?? 0) + (pdfYs[i] ?? 0)) * dx);
    }
    const scale = cdfYs[cdfYs.length - 1] ?? 1;
    const cdfYsNorm = cdfYs.map((v) => v / scale);
    return { xs, pdfYs, cdfYs: cdfYsNorm, isDiscrete: false };
  }

  if (params.family === "Gamma") {
    const { alpha, beta } = params;
    const mode = alpha > 1 ? (alpha - 1) / beta : 0;
    const hi = mode + (5 * Math.sqrt(alpha)) / beta;
    const xs = Array.from({ length: N }, (_, i) => (i / (N - 1)) * hi);
    const pdfYs = xs.map((x) => gammaPdf(x, alpha, beta));
    // CDF via trapezoid
    const cdfYs: number[] = [0];
    for (let i = 1; i < xs.length; i++) {
      const dx = (xs[i] ?? 0) - (xs[i - 1] ?? 0);
      cdfYs.push((cdfYs[i - 1] ?? 0) + 0.5 * ((pdfYs[i - 1] ?? 0) + (pdfYs[i] ?? 0)) * dx);
    }
    return { xs, pdfYs, cdfYs, isDiscrete: false };
  }

  if (params.family === "Poisson") {
    const { lambda } = params;
    const kMax = Math.max(10, Math.ceil(lambda + 5 * Math.sqrt(lambda)));
    const xs = Array.from({ length: kMax + 1 }, (_, k) => k);
    const pdfYs = xs.map((k) => poissonPmf(k, lambda));
    let cum = 0;
    const cdfYs = pdfYs.map((p) => {
      cum += p;
      return cum;
    });
    return { xs, pdfYs, cdfYs, isDiscrete: true };
  }

  if (params.family === "Bernoulli") {
    const { p } = params;
    const xs = [0, 1];
    const pdfYs = [1 - p, p];
    const cdfYs = [1 - p, 1];
    return { xs, pdfYs, cdfYs, isDiscrete: true };
  }

  if (params.family === "Binomial") {
    const { n, p } = params;
    const xs = Array.from({ length: n + 1 }, (_, k) => k);
    const pdfYs = xs.map((k) => binomialPmf(k, n, p));
    let cum = 0;
    const cdfYs = pdfYs.map((pk) => {
      cum += pk;
      return cum;
    });
    return { xs, pdfYs, cdfYs, isDiscrete: true };
  }

  if (params.family === "Empirical") {
    const { samples } = params;
    const sorted = [...samples].sort((a, b) => a - b);
    const lo = sorted[0] ?? 0;
    const hi = sorted[sorted.length - 1] ?? 1;
    const range = hi - lo || 1;
    const binCount = Math.min(30, Math.max(5, Math.ceil(Math.sqrt(samples.length))));
    const binW = range / binCount;
    const counts = new Array<number>(binCount).fill(0);
    for (const s of sorted) {
      const idx = Math.min(binCount - 1, Math.floor((s - lo) / binW));
      counts[idx] = (counts[idx] ?? 0) + 1;
    }
    const xs = Array.from({ length: binCount }, (_, i) => lo + (i + 0.5) * binW);
    const total = samples.length;
    const pdfYs = counts.map((c) => c / (total * binW));
    const cdfYs = xs.map((x) => sorted.filter((s) => s <= x).length / total);
    return { xs, pdfYs, cdfYs, isDiscrete: false };
  }

  const _exhaustive: never = params;
  throw new Error(`Unknown distribution family: ${JSON.stringify(_exhaustive)}`);
}

type CurveProps = {
  xs: number[];
  ys: number[];
  xMin: number;
  xMax: number;
  yMax: number;
  color: string;
};

function ContinuousCurve({ xs, ys, xMin, xMax, yMax, color }: CurveProps) {
  if (xs.length < 2 || yMax === 0) return null;
  const pts = xs
    .map((x, i) => {
      const fx = (x - xMin) / (xMax - xMin);
      const fy = (ys[i] ?? 0) / yMax;
      return `${tx(fx).toFixed(1)},${ty(fy).toFixed(1)}`;
    })
    .join(" ");
  return (
    <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
  );
}

type DiscreteBarsProps = {
  xs: number[];
  ys: number[];
  xMin: number;
  xMax: number;
  yMax: number;
  color: string;
  fillOpacity?: number;
};

function DiscreteBars({ xs, ys, xMin, xMax, yMax, color, fillOpacity = 0.7 }: DiscreteBarsProps) {
  if (xs.length === 0 || yMax === 0) return null;
  const range = xMax - xMin || 1;
  const barW = Math.max(2, (PLOT_W / range) * 0.6);
  return (
    <>
      {xs.map((x, i) => {
        const fy = (ys[i] ?? 0) / yMax;
        const bx = tx((x - xMin) / range) - barW / 2;
        const bh = fy * PLOT_H;
        const by = PAD_T + PLOT_H - bh;
        return (
          <rect
            key={`bar-${x}`}
            x={bx}
            y={by}
            width={barW}
            height={bh}
            fill={color}
            fillOpacity={fillOpacity}
            stroke={color}
            strokeWidth={0.5}
          />
        );
      })}
    </>
  );
}

type AxisLabelsProps = { xMin: number; xMax: number; yMax: number; label: string };

function AxisLabels({ xMin, xMax, yMax, label }: AxisLabelsProps) {
  const xTicks = 5;
  type Tick = { frac: number; val: number; px: number };
  const ticks: Tick[] = Array.from({ length: xTicks }, (_, i) => {
    const frac = i / (xTicks - 1);
    return { frac, val: xMin + frac * (xMax - xMin), px: tx(frac) };
  });
  return (
    <>
      {/* x-axis ticks */}
      {ticks.map(({ val, px }) => (
        <g key={`xt${val.toPrecision(4)}`}>
          <line
            x1={px}
            y1={PAD_T + PLOT_H}
            x2={px}
            y2={PAD_T + PLOT_H + 4}
            stroke="var(--fg-muted)"
            strokeWidth={0.8}
          />
          <text
            x={px}
            y={PAD_T + PLOT_H + 14}
            textAnchor="middle"
            fontSize={9}
            fill="var(--fg-muted)"
          >
            {Math.abs(val) < 1e-10 ? "0" : val.toPrecision(3)}
          </text>
        </g>
      ))}
      {/* y-axis label */}
      <text
        x={PAD_L - 6}
        y={PAD_T + PLOT_H / 2}
        textAnchor="middle"
        fontSize={9}
        fill="var(--fg-muted)"
        transform={`rotate(-90, ${PAD_L - 6}, ${PAD_T + PLOT_H / 2})`}
      >
        {label}
      </text>
      {/* y max tick */}
      <text x={PAD_L - 4} y={PAD_T + 4} textAnchor="end" fontSize={9} fill="var(--fg-muted)">
        {yMax.toPrecision(2)}
      </text>
    </>
  );
}

function PanelFrame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div style={{ width: W, position: "relative" }}>
      <div style={{ fontSize: 10, color: "var(--fg-muted)", paddingLeft: PAD_L, paddingBottom: 2 }}>
        {title}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: W, height: H }}
        role="img"
        aria-label={title}
      >
        {/* Plot area border */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={PLOT_W}
          height={PLOT_H}
          fill="var(--bg)"
          stroke="var(--border)"
          strokeWidth={0.5}
        />
        {/* x-axis baseline */}
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--border)"
          strokeWidth={1}
        />
        {children}
      </svg>
    </div>
  );
}

export function PdfCdfVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const dist = inputs.X;
  if (dist === undefined || dist.type.kind !== "Distribution") {
    return (
      <div
        data-testid="pdf-cdf-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a Distribution to X.
      </div>
    );
  }

  const payload = dist.payload as unknown as DistributionPayload;
  const series = buildSeries(payload.parameters);

  const xMin = series.xs[0] ?? 0;
  const xMax = series.xs[series.xs.length - 1] ?? 1;
  const pdfMax = Math.max(...series.pdfYs, 1e-10);

  const pdfColor = "var(--role-source-border)";
  const cdfColor = "var(--role-operation-border)";

  return (
    <div data-testid="pdf-cdf-root" className="flex flex-col gap-1">
      <PanelFrame title="PDF / PMF">
        <AxisLabels xMin={xMin} xMax={xMax} yMax={pdfMax} label="p(x)" />
        {series.isDiscrete ? (
          <DiscreteBars
            xs={series.xs}
            ys={series.pdfYs}
            xMin={xMin}
            xMax={xMax}
            yMax={pdfMax}
            color={pdfColor}
          />
        ) : (
          <ContinuousCurve
            xs={series.xs}
            ys={series.pdfYs}
            xMin={xMin}
            xMax={xMax}
            yMax={pdfMax}
            color={pdfColor}
          />
        )}
      </PanelFrame>

      <PanelFrame title="CDF">
        <AxisLabels xMin={xMin} xMax={xMax} yMax={1} label="F(x)" />
        {series.isDiscrete ? (
          <DiscreteBars
            xs={series.xs}
            ys={series.cdfYs}
            xMin={xMin}
            xMax={xMax}
            yMax={1}
            color={cdfColor}
            fillOpacity={0.5}
          />
        ) : (
          <ContinuousCurve
            xs={series.xs}
            ys={series.cdfYs}
            xMin={xMin}
            xMax={xMax}
            yMax={1}
            color={cdfColor}
          />
        )}
      </PanelFrame>
    </div>
  );
}
