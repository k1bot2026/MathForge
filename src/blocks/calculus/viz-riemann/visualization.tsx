"use client";

import { useState } from "react";
import type { ResolvedInputs, ResolvedParams } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { evalAt, sampleExpr, yRange } from "../viz-calc";

const W = 480;
const H = 260;
const PAD_L = 48;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 40;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function toSvgX(x: number, xLo: number, xHi: number): number {
  return PAD_L + ((x - xLo) / (xHi - xLo)) * PLOT_W;
}
function toSvgY(y: number, yMin: number, yMax: number): number {
  return PAD_T + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
}

type Method = "left" | "right" | "midpoint";

function sampleX(lo: number, hi: number, n: number, method: Method, i: number): number {
  const dx = (hi - lo) / n;
  if (method === "left") return lo + i * dx;
  if (method === "right") return lo + (i + 1) * dx;
  return lo + (i + 0.5) * dx;
}

export function RiemannVisualization({
  inputs,
  params,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
  params?: ResolvedParams;
}) {
  const fn = inputs.fn;

  const [nState, setNState] = useState<number>(8);
  const [methodState, setMethodState] = useState<Method>("midpoint");

  if (fn === undefined || fn.type.kind !== "Function") {
    return (
      <div
        data-testid="viz-riemann-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect f(x), a, and b to see the Riemann sum approximation.
      </div>
    );
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const variable = fnPayload.variables[0] ?? "x";

  // Bounds: prefer connected input scalars, fallback to params, then defaults
  const aInput = inputs.a;
  const bInput = inputs.b;
  const a =
    aInput !== undefined && typeof aInput.payload === "number"
      ? aInput.payload
      : typeof params?.a === "number"
        ? params.a
        : 0;
  const b =
    bInput !== undefined && typeof bInput.payload === "number"
      ? bInput.payload
      : typeof params?.b === "number"
        ? params.b
        : Math.PI;

  const xLo = Math.min(a, b);
  const xHi = Math.max(a, b);

  if (xLo >= xHi) {
    return (
      <div
        data-testid="viz-riemann-invalid"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        a must be less than b.
      </div>
    );
  }

  // Slider-controlled n (1–100), method
  const n = nState;
  const method = methodState;
  const dx = (xHi - xLo) / n;

  // Sample function for background curve
  const { xs: curveXs, ys: curveYs } = sampleExpr(fnPayload.expression, variable, xLo, xHi, 300);

  // Rectangle sample heights
  const rectYs = Array.from({ length: n }, (_, i) => {
    const sampleXVal = sampleX(xLo, xHi, n, method, i);
    return evalAt(fnPayload.expression, variable, sampleXVal);
  });

  const allYs = [...curveYs, ...rectYs.filter(Number.isFinite), 0];
  const rawRange = yRange(allYs);
  const span = Math.abs(rawRange[1] - rawRange[0]);
  const clampSpan = 4 * span + 2;
  const yMin = Math.max(rawRange[0], -clampSpan);
  const yMax = Math.min(rawRange[1], clampSpan);

  const zeroSvgY = toSvgY(0, yMin, yMax);

  // Numeric sum
  const riemannSum = rectYs.reduce((acc, y) => acc + (Number.isFinite(y) ? y * dx : 0), 0);

  const fnColor = "var(--role-source-border)";
  const barColor = "var(--role-operation-border)";
  const barOpacity = 0.35;

  const curvePts = curveXs
    .map((x, i) => {
      const y = curveYs[i];
      if (y === undefined || !Number.isFinite(y)) return null;
      return `${toSvgX(x, xLo, xHi).toFixed(1)},${toSvgY(y, yMin, yMax).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <div data-testid="viz-riemann-root" className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: W, height: H }}
        role="img"
        aria-label={`Riemann sum with ${n} rectangles using ${method} endpoints`}
      >
        {/* Plot area */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={PLOT_W}
          height={PLOT_H}
          fill="var(--bg)"
          stroke="var(--border)"
          strokeWidth={0.5}
        />

        {/* Zero line */}
        <line
          x1={PAD_L}
          y1={zeroSvgY}
          x2={PAD_L + PLOT_W}
          y2={zeroSvgY}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />

        {/* Riemann rectangles */}
        {rectYs.map((fy, i) => {
          if (!Number.isFinite(fy)) return null;
          const rectXLo = xLo + i * dx;
          const rectXHi = rectXLo + dx;
          const svgX = toSvgX(rectXLo, xLo, xHi);
          const svgW = toSvgX(rectXHi, xLo, xHi) - svgX;
          const top = toSvgY(fy >= 0 ? fy : 0, yMin, yMax);
          const bot = toSvgY(fy >= 0 ? 0 : fy, yMin, yMax);
          const rH = Math.abs(bot - top);
          return (
            <rect
              key={`r${rectXLo.toFixed(6)}`}
              x={svgX}
              y={top}
              width={svgW}
              height={rH}
              fill={barColor}
              fillOpacity={barOpacity}
              stroke={barColor}
              strokeWidth={0.5}
              strokeOpacity={0.6}
            />
          );
        })}

        {/* f(x) curve on top */}
        {curvePts && (
          <polyline
            points={curvePts}
            fill="none"
            stroke={fnColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Sum label */}
        <text
          x={PAD_L + PLOT_W - 4}
          y={PAD_T + 14}
          textAnchor="end"
          fontSize={9}
          fill="var(--fg-muted)"
        >
          {`Σ ≈ ${riemannSum.toFixed(4)}`}
        </text>

        {/* X-axis ticks */}
        {Array.from({ length: 5 }, (_, i) => {
          const frac = i / 4;
          const x = xLo + frac * (xHi - xLo);
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

        {/* a and b labels */}
        <text
          x={PAD_L + 2}
          y={PAD_T + PLOT_H + 26}
          textAnchor="start"
          fontSize={9}
          fill="var(--fg-faint)"
        >
          {`a=${a.toFixed(2)}`}
        </text>
        <text
          x={PAD_L + PLOT_W - 2}
          y={PAD_T + PLOT_H + 26}
          textAnchor="end"
          fontSize={9}
          fill="var(--fg-faint)"
        >
          {`b=${b.toFixed(2)}`}
        </text>
      </svg>

      {/* Controls */}
      <div className="flex items-center gap-4 px-2 text-xs text-fg-muted">
        <label className="flex items-center gap-2">
          n={n}
          <input
            type="range"
            min={1}
            max={100}
            value={n}
            onChange={(e) => setNState(Number(e.target.value))}
            aria-label="Number of rectangles"
            className="w-28"
          />
        </label>
        <fieldset className="flex gap-2 border-none p-0">
          <legend className="sr-only">Endpoint method</legend>
          {(["left", "midpoint", "right"] as Method[]).map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-1">
              <input
                type="radio"
                name="riemann-method"
                value={m}
                checked={method === m}
                onChange={() => setMethodState(m)}
              />
              {m}
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
