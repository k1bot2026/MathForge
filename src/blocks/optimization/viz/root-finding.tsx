"use client";

import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition, ResolvedInputs } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

const W = 480;
const H = 240;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function evalFn(expression: string, x: number): number {
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

function RootFindingPlot({ inputs }: { inputs: ResolvedInputs; output: MathValue | undefined }) {
  const fnVal = inputs.fn;
  const rootVal = inputs.root;
  const xMinVal = inputs.x_min;
  const xMaxVal = inputs.x_max;

  if (fnVal === undefined) {
    return (
      <div
        data-testid="viz-root-finding-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a function to see the root-finding plot.
      </div>
    );
  }

  const { expression } = fnVal.payload as unknown as FunctionPayload;
  const xMin = (xMinVal?.payload as number | undefined) ?? -5;
  const xMax = (xMaxVal?.payload as number | undefined) ?? 5;

  if (xMin >= xMax) {
    return (
      <div className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint">
        x_min must be less than x_max.
      </div>
    );
  }

  const steps = 300;
  const fnValues: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    const y = evalFn(expression, x);
    if (Number.isFinite(y)) fnValues.push({ x, y });
  }

  if (fnValues.length === 0) {
    return (
      <div className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint">
        Function produced no finite values in this range.
      </div>
    );
  }

  const allY = fnValues.map((p) => p.y);
  const rawYMin = Math.min(...allY);
  const rawYMax = Math.max(...allY);
  const yRange = rawYMax - rawYMin;
  const yMin = rawYMin - yRange * 0.1;
  const yMax = rawYMax + yRange * 0.1;

  // Build polyline segments (break on discontinuities where consecutive points jump > yRange)
  const segments: string[][] = [];
  let current: string[] = [];
  for (let i = 0; i < fnValues.length; i++) {
    const p = fnValues[i];
    if (p === undefined) continue;
    const prev = fnValues[i - 1];
    if (prev !== undefined && yRange > 0 && Math.abs(p.y - prev.y) > yRange * 2) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push(`${toSvgX(p.x, xMin, xMax).toFixed(1)},${toSvgY(p.y, yMin, yMax).toFixed(1)}`);
  }
  if (current.length > 1) segments.push(current);

  // Root marker
  const rootX = rootVal !== undefined ? (rootVal.payload as number) : null;
  const rootY = rootX !== null ? evalFn(expression, rootX) : null;

  const fnColor = "var(--role-operation-border)";
  const zeroColor = "var(--border)";
  const rootColor = "var(--role-visualizer-border, #f59e0b)";

  return (
    <svg
      role="img"
      aria-label="Root-finding plot — function curve with root marker"
      data-testid="viz-root-finding-root"
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

      {/* x-axis (y = 0) */}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PAD_L}
          y1={toSvgY(0, yMin, yMax)}
          x2={PAD_L + PLOT_W}
          y2={toSvgY(0, yMin, yMax)}
          stroke={zeroColor}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}

      {/* Function curve segments */}
      {segments.map((seg) => (
        <polyline
          key={seg[0]}
          points={seg.join(" ")}
          fill="none"
          stroke={fnColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ))}

      {/* Root marker */}
      {rootX !== null && rootY !== null && Number.isFinite(rootY) && (
        <g>
          {/* Vertical drop line from root to x-axis */}
          <line
            x1={toSvgX(rootX, xMin, xMax)}
            y1={toSvgY(rootY, yMin, yMax)}
            x2={toSvgX(rootX, xMin, xMax)}
            y2={toSvgY(0, yMin, yMax)}
            stroke={rootColor}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          {/* Root point on curve */}
          <circle
            cx={toSvgX(rootX, xMin, xMax)}
            cy={toSvgY(rootY, yMin, yMax)}
            r={5}
            fill={rootColor}
            fillOpacity={0.9}
            stroke="white"
            strokeWidth={1.5}
          />
          {/* Root point on x-axis */}
          <circle
            cx={toSvgX(rootX, xMin, xMax)}
            cy={toSvgY(0, yMin, yMax)}
            r={3}
            fill={rootColor}
            stroke="white"
            strokeWidth={1}
          />
          <text
            x={toSvgX(rootX, xMin, xMax) + 8}
            y={toSvgY(rootY, yMin, yMax) - 6}
            fontSize={9}
            fill={rootColor}
          >
            {`x*≈${rootX.toFixed(4)}`}
          </text>
        </g>
      )}

      {/* X-axis ticks */}
      {Array.from({ length: 5 }, (_, i) => {
        const frac = i / 4;
        const x = xMin + frac * (xMax - xMin);
        const px = PAD_L + frac * PLOT_W;
        return (
          <g key={`xt${x.toFixed(3)}`}>
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
              {x.toFixed(2)}
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
          <g key={`yt${y.toFixed(3)}`}>
            <line
              x1={PAD_L - 4}
              y1={py}
              x2={PAD_L}
              y2={py}
              stroke="var(--fg-muted)"
              strokeWidth={0.8}
            />
            <text x={PAD_L - 6} y={py + 4} textAnchor="end" fontSize={9} fill="var(--fg-muted)">
              {y.toFixed(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const RootFindingVizBlock: BlockDefinition = {
  id: "viz.root-finding",
  label: "Root Finding",
  symbol: "f→0",
  category: "visualizer",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "fn",
      label: "f (function to plot)",
      type: {
        kind: "Function",
        arity: 1,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "root",
      label: "Root x* (optional, from opt.bisection / opt.newton-root / …)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "x_min",
      label: "x min (plot domain, default −5)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "x_max",
      label: "x max (plot domain, default 5)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
  ],
  outputs: [
    {
      id: "root",
      label: "Root (passthrough, if connected)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
    },
  ],
  params: {},
  compute: (inputs): MathValue => {
    const fn = inputs.fn;
    if (fn === undefined) throw new Error("viz.root-finding: fn input is required");
    // Pass root through if provided, else return a NaN scalar placeholder
    if (inputs.root !== undefined) return inputs.root;
    return {
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      payload: Number.NaN,
      provenance: {
        blockId: "viz.root-finding",
        inputs: [],
        computedAt: Date.now(),
        engine: "native",
      },
    };
  },
  explain: {
    what: "Plots a 1D function curve over [x_min, x_max] and marks the root x* found by a root-finding block. Connect opt.bisection, opt.newton-root, opt.secant, or opt.fixed-point to the root port.",
    why: "Seeing where f(x)=0 on the curve confirms the root numerically and reveals whether the function is well-behaved in the vicinity (no poles, sign changes, etc.).",
    effect: (inputs) => {
      if (inputs.fn === undefined) return "Connect a function to see the root-finding plot.";
      const hasRoot = inputs.root !== undefined;
      const xMin = (inputs.x_min?.payload as number | undefined) ?? -5;
      const xMax = (inputs.x_max?.payload as number | undefined) ?? 5;
      return `Plotting f over [${xMin}, ${xMax}]${hasRoot ? " with root marked." : "."}`;
    },
    impact: (_inputs, output) => {
      const v = output.payload as number;
      return Number.isNaN(v)
        ? "No root connected — output is placeholder NaN."
        : `Passes root x*≈${v.toFixed(6)} downstream.`;
    },
  },
  visualization: RootFindingPlot,
};
