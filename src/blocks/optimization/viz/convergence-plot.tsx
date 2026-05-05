"use client";

import type { BlockDefinition, ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

const W = 480;
const H = 240;
const PAD_L = 60;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function toSvgX(i: number, n: number): number {
  return PAD_L + (i / Math.max(n - 1, 1)) * PLOT_W;
}

function toSvgY(logVal: number, logMin: number, logMax: number): number {
  if (logMax === logMin) return PAD_T + PLOT_H / 2;
  return PAD_T + (1 - (logVal - logMin) / (logMax - logMin)) * PLOT_H;
}

function ConvergencePlot({ inputs }: { inputs: ResolvedInputs; output: MathValue | undefined }) {
  const residualsVal = inputs.residuals;

  if (residualsVal === undefined) {
    return (
      <div
        data-testid="viz-convergence-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a residuals/error vector to see the convergence plot.
      </div>
    );
  }

  const raw = residualsVal.payload as ReadonlyArray<number>;
  // Filter positive, finite values only (log-scale needs > 0)
  const values = raw.map((v) => (Number.isFinite(v) && v > 0 ? v : null));

  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length === 0) {
    return (
      <div
        data-testid="viz-convergence-empty"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        No positive residual values to plot.
      </div>
    );
  }

  const logValues = validValues.map((v) => Math.log10(v));
  const logMin = Math.min(...logValues);
  const logMax = Math.max(...logValues);

  // Build polyline segments — skip gaps where value is null
  const n = values.length;
  const segments: string[][] = [];
  let current: string[] = [];
  for (let i = 0; i < n; i++) {
    const v = values[i] ?? null;
    if (v !== null) {
      const logV = Math.log10(v);
      current.push(`${toSvgX(i, n).toFixed(1)},${toSvgY(logV, logMin, logMax).toFixed(1)}`);
    } else if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length > 0) segments.push(current);

  // Y-axis: 4-5 log-decade ticks
  const floorLog = Math.floor(logMin);
  const ceilLog = Math.ceil(logMax);
  const yTicks: number[] = [];
  for (let decade = floorLog; decade <= ceilLog; decade++) {
    yTicks.push(decade);
  }

  // X-axis: 5 evenly spaced iteration ticks
  const xTicks = Array.from({ length: 5 }, (_, i) => Math.round((i / 4) * (n - 1)));

  const lineColor = "var(--role-operation-border)";

  return (
    <svg
      role="img"
      aria-label="Convergence plot (log-scale residuals vs iteration)"
      data-testid="viz-convergence-root"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", width: W, height: H }}
    >
      <rect
        x={PAD_L}
        y={PAD_T}
        width={PLOT_W}
        height={PLOT_H}
        fill="var(--bg)"
        stroke="var(--border)"
        strokeWidth={0.5}
      />

      {/* Horizontal grid lines at each log decade */}
      {yTicks.map((decade) => {
        const py = toSvgY(decade, logMin, logMax);
        if (py < PAD_T || py > PAD_T + PLOT_H) return null;
        return (
          <line
            key={`grid${decade}`}
            x1={PAD_L}
            y1={py}
            x2={PAD_L + PLOT_W}
            y2={py}
            stroke="var(--border)"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        );
      })}

      {/* Convergence line segments */}
      {segments.map((seg) =>
        seg.length > 1 ? (
          <polyline
            key={seg[0]}
            points={seg.join(" ")}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ) : null,
      )}

      {/* Data points */}
      {values.map((v, iterIdx) => {
        if (v === null) return null;
        const cx = toSvgX(iterIdx, n);
        const cy = toSvgY(Math.log10(v), logMin, logMax);
        return (
          <circle
            key={`pt:${cx.toFixed(1)},${cy.toFixed(1)}`}
            cx={cx}
            cy={cy}
            r={2.5}
            fill={lineColor}
          />
        );
      })}

      {/* X-axis ticks */}
      {xTicks.map((idx) => {
        const px = toSvgX(idx, n);
        return (
          <g key={`xt${idx}`}>
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
              {idx}
            </text>
          </g>
        );
      })}

      {/* X-axis label */}
      <text
        x={PAD_L + PLOT_W / 2}
        y={H - 2}
        textAnchor="middle"
        fontSize={9}
        fill="var(--fg-muted)"
      >
        Iteration
      </text>

      {/* Y-axis ticks (log scale) */}
      {yTicks.map((decade) => {
        const py = toSvgY(decade, logMin, logMax);
        if (py < PAD_T || py > PAD_T + PLOT_H) return null;
        return (
          <g key={`yt${decade}`}>
            <line
              x1={PAD_L - 4}
              y1={py}
              x2={PAD_L}
              y2={py}
              stroke="var(--fg-muted)"
              strokeWidth={0.8}
            />
            <text x={PAD_L - 6} y={py + 4} textAnchor="end" fontSize={9} fill="var(--fg-muted)">
              {`10${decade === 0 ? "" : decade < 0 ? `⁻${Math.abs(decade)}` : `${decade}`}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const ConvergencePlotBlock: BlockDefinition = {
  id: "viz.convergence-plot",
  label: "Convergence Plot",
  symbol: "↘log",
  category: "visualizer",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "residuals",
      label: "Residuals / error per iteration (Vector of positive numbers)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  outputs: [
    {
      id: "residuals",
      label: "Residuals (passthrough)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  params: {},
  compute: (inputs): MathValue => {
    const r = inputs.residuals;
    if (r === undefined) throw new Error("viz.convergence-plot: residuals vector is required");
    return r;
  },
  explain: {
    what: "Plots residuals (or any error/loss sequence) on a log₁₀ y-axis against iteration index. Use to diagnose convergence speed and stagnation.",
    why: "Log-scale reveals exponential convergence as a straight line with negative slope. Superlinear convergence (e.g., Newton) shows a characteristic upward kink.",
    effect: (inputs) => {
      if (inputs.residuals === undefined)
        return "Connect a vector of positive residual values to see the convergence plot.";
      const n = (inputs.residuals.payload as ReadonlyArray<number>).length;
      return `Plotting ${n} residual values on log scale.`;
    },
    impact: (_inputs, output) => {
      const n = (output.payload as ReadonlyArray<number>).length;
      return `Passes residuals vector (${n} values) downstream.`;
    },
  },
  visualization: ConvergencePlot,
};
