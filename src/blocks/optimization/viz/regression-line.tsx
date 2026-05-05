"use client";

import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition, ResolvedInputs } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { evaluateSplineAt, isSplineExpression } from "../spline/definition";

const W = 480;
const H = 240;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function evalFn(expression: string, x: number): number {
  if (isSplineExpression(expression)) return evaluateSplineAt(expression, x);
  try {
    const result = mathjsEvaluate(expression.replace(/\*\*/g, "^"), { x });
    return typeof result === "number" && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

function toSvgX(x: number, xMin: number, xMax: number): number {
  return PAD_L + ((x - xMin) / (xMax - xMin)) * PLOT_W;
}
function toSvgY(y: number, yMin: number, yMax: number): number {
  return PAD_T + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
}

function RegressionLinePlot({ inputs }: { inputs: ResolvedInputs; output: MathValue | undefined }) {
  const xVal = inputs.x ?? inputs.X;
  const yVal = inputs.y;
  const fitVal = inputs.fit;

  if (xVal === undefined || yVal === undefined) {
    return (
      <div
        data-testid="viz-regression-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect x and y vectors to see the scatter plot.
      </div>
    );
  }

  const xs = xVal.payload as ReadonlyArray<number>;
  const ys = yVal.payload as ReadonlyArray<number>;
  const n = Math.min(xs.length, ys.length);

  const xMin = Math.min(...xs) - 0.5;
  const xMax = Math.max(...xs) + 0.5;

  // Compute y range from data + fit
  const allYs = [...ys];
  if (fitVal !== undefined && fitVal.type.kind === "Function") {
    const { expression } = fitVal.payload as unknown as FunctionPayload;
    const xSamples = Array.from({ length: 100 }, (_, i) => xMin + (i / 99) * (xMax - xMin));
    for (const xi of xSamples) {
      const yi = evalFn(expression, xi);
      if (Number.isFinite(yi)) allYs.push(yi);
    }
  }
  const yMin = Math.min(...allYs) - 0.5;
  const yMax = Math.max(...allYs) + 0.5;

  // Fit curve path
  let fitPath = "";
  if (fitVal !== undefined && fitVal.type.kind === "Function") {
    const { expression } = fitVal.payload as unknown as FunctionPayload;
    const steps = 200;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const y = evalFn(expression, x);
      if (!Number.isFinite(y)) continue;
      pts.push(`${toSvgX(x, xMin, xMax).toFixed(1)},${toSvgY(y, yMin, yMax).toFixed(1)}`);
    }
    if (pts.length > 1) fitPath = pts.join(" ");
  }

  const dataColor = "var(--role-source-border)";
  const fitColor = "var(--role-operation-border)";

  return (
    <svg
      role="img"
      aria-label="Scatter plot with regression line"
      data-testid="viz-regression-root"
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
      {/* Zero lines */}
      {xMin < 0 && xMax > 0 && (
        <line
          x1={toSvgX(0, xMin, xMax)}
          y1={PAD_T}
          x2={toSvgX(0, xMin, xMax)}
          y2={PAD_T + PLOT_H}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
      )}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PAD_L}
          y1={toSvgY(0, yMin, yMax)}
          x2={PAD_L + PLOT_W}
          y2={toSvgY(0, yMin, yMax)}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
      )}
      {/* Fit curve */}
      {fitPath && (
        <polyline
          points={fitPath}
          fill="none"
          stroke={fitColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}
      {/* Data points */}
      {Array.from({ length: n }, (_, i) => {
        const x = xs[i] ?? 0;
        const y = ys[i] ?? 0;
        return (
          <circle
            key={`pt${x.toFixed(3)}${y.toFixed(3)}`}
            cx={toSvgX(x, xMin, xMax)}
            cy={toSvgY(y, yMin, yMax)}
            r={4}
            fill={dataColor}
            fillOpacity={0.8}
            stroke="white"
            strokeWidth={1}
          />
        );
      })}
      {/* X-axis ticks */}
      {Array.from({ length: 5 }, (_, i) => {
        const frac = i / 4;
        const x = xMin + frac * (xMax - xMin);
        const px = PAD_L + frac * PLOT_W;
        return (
          <g key={`xt${x.toFixed(2)}`}>
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
              {x.toFixed(1)}
            </text>
          </g>
        );
      })}
      {/* Y-axis ticks */}
      {Array.from({ length: 5 }, (_, i) => {
        const frac = i / 4;
        const y = yMin + frac * (yMax - yMin);
        const py = PAD_T + (1 - frac) * PLOT_H;
        return (
          <g key={`yt${y.toFixed(2)}`}>
            <line
              x1={PAD_L - 4}
              y1={py}
              x2={PAD_L}
              y2={py}
              stroke="var(--fg-muted)"
              strokeWidth={0.8}
            />
            <text x={PAD_L - 6} y={py + 4} textAnchor="end" fontSize={9} fill="var(--fg-muted)">
              {y.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const RegressionLineBlock: BlockDefinition = {
  id: "viz.regression-line",
  label: "Regression Line",
  symbol: "⋯∼",
  category: "visualizer",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "x",
      label: "x (sample points)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
    {
      id: "y",
      label: "y (values)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
    {
      id: "fit",
      label: "fit (fitted function, optional)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
      required: false,
    },
  ],
  outputs: [
    {
      id: "x",
      label: "x (passthrough)",
      type: { kind: "Vector", n: "any", field: "real" },
    },
  ],
  params: {},
  compute: (inputs): MathValue => {
    const x = inputs.x;
    if (x === undefined) throw new Error("viz.regression-line: x vector is required");
    return x;
  },
  explain: {
    what: "Scatter plot of (x, y) data points with an optional fitted curve overlay. Connect opt.linear-regression, opt.polynomial-regression, opt.lagrange, or opt.spline to the fit port.",
    why: "Visualises how well a fitted model explains the data. The curve passes through or near the scatter points depending on the fit quality.",
    effect: (inputs) => {
      if (inputs.x === undefined || inputs.y === undefined)
        return "Connect x and y vectors to see the scatter plot.";
      const n = (inputs.x.payload as ReadonlyArray<number>).length;
      return `Plotting ${n} data points${inputs.fit !== undefined ? " with fitted curve." : "."}`;
    },
    impact: (_inputs, output) => {
      const n = (output.payload as ReadonlyArray<number>).length;
      return `Passes x vector (${n} points) downstream.`;
    },
  },
  visualization: RegressionLinePlot,
};
