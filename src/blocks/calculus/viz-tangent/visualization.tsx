"use client";

import { useState } from "react";
import type { ResolvedInputs } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { evalAt, sampleExpr, yRange } from "../viz-calc";

const W = 480;
const H = 240;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

const X_LO = -Math.PI * 2.5;
const X_HI = Math.PI * 2.5;

function toSvgX(x: number): number {
  return PAD_L + ((x - X_LO) / (X_HI - X_LO)) * PLOT_W;
}
function toSvgY(y: number, yMin: number, yMax: number): number {
  return PAD_T + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
}
function fromSvgX(px: number): number {
  return X_LO + ((px - PAD_L) / PLOT_W) * (X_HI - X_LO);
}

/** Central-difference approximation for the derivative at x. */
function numericalDerivative(expr: string, variable: string, x: number): number {
  const h = 1e-6;
  const lo = evalAt(expr, variable, x - h);
  const hi = evalAt(expr, variable, x + h);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return NaN;
  return (hi - lo) / (2 * h);
}

export function TangentVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const fn = inputs.fn;
  const derivative = inputs.derivative;

  // movable point x coordinate (in data space)
  const [pointX, setPointX] = useState(0);

  if (fn === undefined || fn.type.kind !== "Function") {
    return (
      <div
        data-testid="viz-tangent-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect f(x) to see the function and tangent line.
      </div>
    );
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const variable = fnPayload.variables[0] ?? "x";

  const { xs, ys: fnYs } = sampleExpr(fnPayload.expression, variable, X_LO, X_HI, 300);
  const rawRange = yRange(fnYs);
  const clampSpan = 5 * Math.abs(rawRange[1] - rawRange[0]) + 2;
  const yMin = Math.max(rawRange[0], -clampSpan);
  const yMax = Math.min(rawRange[1], clampSpan);

  // Point and tangent
  const py = evalAt(fnPayload.expression, variable, pointX);
  const slope =
    derivative !== undefined && derivative.type.kind === "Function"
      ? evalAt((derivative.payload as unknown as FunctionPayload).expression, variable, pointX)
      : numericalDerivative(fnPayload.expression, variable, pointX);

  // Tangent line: y = slope*(x - pointX) + py over a ±1.5 unit window
  const tangentHalf = (X_HI - X_LO) * 0.2;
  const txLo = pointX - tangentHalf;
  const txHi = pointX + tangentHalf;
  const tyLo = Number.isFinite(slope) && Number.isFinite(py) ? slope * (txLo - pointX) + py : NaN;
  const tyHi = Number.isFinite(slope) && Number.isFinite(py) ? slope * (txHi - pointX) + py : NaN;

  // SVG polyline for f(x)
  const fnPts = xs
    .map((x, i) => {
      const y = fnYs[i];
      if (y === undefined || !Number.isFinite(y)) return null;
      return `${toSvgX(x).toFixed(1)},${toSvgY(y, yMin, yMax).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  // Handle drag on the SVG to move the point
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const newX = Math.max(X_LO, Math.min(X_HI, fromSvgX(px)));
    setPointX(newX);
  }

  const pointSvgX = toSvgX(pointX);
  const pointSvgY = Number.isFinite(py) ? toSvgY(py, yMin, yMax) : PAD_T + PLOT_H / 2;

  const fnColor = "var(--role-source-border)";
  const tangentColor = "var(--role-operation-border)";
  const pointColor = "var(--role-function-border, #f97316)";

  return (
    <div data-testid="viz-tangent-root">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: W, height: H, cursor: "crosshair" }}
        role="img"
        aria-label="Function with movable tangent line"
        onClick={handleSvgClick}
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

        {/* Zero lines */}
        <line
          x1={toSvgX(0)}
          y1={PAD_T}
          x2={toSvgX(0)}
          y2={PAD_T + PLOT_H}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
        <line
          x1={PAD_L}
          y1={toSvgY(0, yMin, yMax)}
          x2={PAD_L + PLOT_W}
          y2={toSvgY(0, yMin, yMax)}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />

        {/* f(x) curve */}
        {fnPts && (
          <polyline
            points={fnPts}
            fill="none"
            stroke={fnColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Tangent line */}
        {Number.isFinite(tyLo) && Number.isFinite(tyHi) && (
          <line
            x1={toSvgX(txLo).toFixed(1)}
            y1={toSvgY(tyLo, yMin, yMax).toFixed(1)}
            x2={toSvgX(txHi).toFixed(1)}
            y2={toSvgY(tyHi, yMin, yMax).toFixed(1)}
            stroke={tangentColor}
            strokeWidth={1.5}
          />
        )}

        {/* Movable point */}
        <circle
          cx={pointSvgX}
          cy={pointSvgY}
          r={5}
          fill={pointColor}
          stroke="white"
          strokeWidth={1.5}
        />

        {/* Slope label */}
        {Number.isFinite(slope) && (
          <text
            x={PAD_L + PLOT_W - 4}
            y={PAD_T + 14}
            textAnchor="end"
            fontSize={9}
            fill="var(--fg-muted)"
          >
            {`f'(${pointX.toFixed(2)}) = ${slope.toFixed(4)}`}
          </text>
        )}

        {/* X-axis ticks */}
        {Array.from({ length: 5 }, (_, i) => {
          const frac = i / 4;
          const x = X_LO + frac * (X_HI - X_LO);
          const px = PAD_L + frac * PLOT_W;
          return (
            <g key={`xt${i}`}>
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
                {Math.abs(x) < 0.01 ? "0" : x.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Click hint */}
        <text x={PAD_L + 4} y={PAD_T + 10} fontSize={8} fill="var(--fg-faint)">
          click to move point
        </text>
      </svg>
    </div>
  );
}
