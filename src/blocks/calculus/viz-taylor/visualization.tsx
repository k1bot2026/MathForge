"use client";

import type { ResolvedInputs } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { sampleExpr, yRange } from "../viz-calc";

const W = 480;
const H = 220;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function toSvgX(x: number, xMin: number, xMax: number): number {
  return PAD_L + ((x - xMin) / (xMax - xMin)) * PLOT_W;
}
function toSvgY(y: number, yMin: number, yMax: number): number {
  return PAD_T + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
}

function polyline(
  xs: number[],
  ys: number[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): string {
  const pts: string[] = [];
  for (let i = 0; i < xs.length; i++) {
    const y = ys[i];
    if (y === undefined || !Number.isFinite(y)) continue;
    pts.push(`${toSvgX(xs[i] ?? 0, xMin, xMax).toFixed(1)},${toSvgY(y, yMin, yMax).toFixed(1)}`);
  }
  return pts.join(" ");
}

export function TaylorVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const fn = inputs.fn;
  const taylor = inputs.taylor;

  if (fn === undefined || fn.type.kind !== "Function") {
    return (
      <div
        data-testid="viz-taylor-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect f(x) to see the function and its Taylor approximation.
      </div>
    );
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const variable = fnPayload.variables[0] ?? "x";

  // Plot window: ±3π by default, clamp to visible
  const xLo = -Math.PI * 3;
  const xHi = Math.PI * 3;

  const { xs, ys: fnYs } = sampleExpr(fnPayload.expression, variable, xLo, xHi, 300);

  const taylorYs: number[] | null =
    taylor !== undefined && taylor.type.kind === "Function"
      ? (() => {
          const tp = taylor.payload as unknown as FunctionPayload;
          return sampleExpr(tp.expression, variable, xLo, xHi, 300).ys;
        })()
      : null;

  // Y range: union of fn + taylor, clamped to avoid huge spikes
  const allYs = [...fnYs, ...(taylorYs ?? [])].filter(Number.isFinite);
  const rawRange = yRange(allYs);
  const clampLimit = 5 * Math.abs(rawRange[1] - rawRange[0]) + 2;
  const yMin = Math.max(rawRange[0], -clampLimit);
  const yMax = Math.min(rawRange[1], clampLimit);

  const fnPts = polyline(xs, fnYs, xLo, xHi, yMin, yMax);
  const taylorPts = taylorYs ? polyline(xs, taylorYs, xLo, xHi, yMin, yMax) : null;

  const fnColor = "var(--role-source-border)";
  const taylorColor = "var(--role-operation-border)";

  // x=0 line
  const x0px = toSvgX(0, xLo, xHi);
  const y0px = toSvgY(0, yMin, yMax);

  const xTicks = 5;
  type XTick = { x: number; px: number };
  const xTickObjs: XTick[] = Array.from({ length: xTicks }, (_, i) => {
    const frac = i / (xTicks - 1);
    return { x: xLo + frac * (xHi - xLo), px: PAD_L + frac * PLOT_W };
  });

  return (
    <div data-testid="viz-taylor-root">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: W, height: H }}
        role="img"
        aria-label="Taylor approximation overlay"
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
          x1={x0px}
          y1={PAD_T}
          x2={x0px}
          y2={PAD_T + PLOT_H}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
        <line
          x1={PAD_L}
          y1={y0px}
          x2={PAD_L + PLOT_W}
          y2={y0px}
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

        {/* Taylor polynomial curve */}
        {taylorPts && (
          <polyline
            points={taylorPts}
            fill="none"
            stroke={taylorColor}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeDasharray="4 2"
          />
        )}

        {/* X-axis ticks */}
        {xTickObjs.map(({ x, px }) => (
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
              {Math.abs(x) < 0.01 ? "0" : x.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${PAD_L + 4}, ${PAD_T + 8})`}>
          <line x1={0} y1={0} x2={18} y2={0} stroke={fnColor} strokeWidth={2} />
          <text x={22} y={4} fontSize={9} fill="var(--fg-muted)">
            f(x)
          </text>
          {taylorPts && (
            <>
              <line
                x1={0}
                y1={14}
                x2={18}
                y2={14}
                stroke={taylorColor}
                strokeWidth={1.5}
                strokeDasharray="4 2"
              />
              <text x={22} y={18} fontSize={9} fill="var(--fg-muted)">
                Tₙ(x)
              </text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
