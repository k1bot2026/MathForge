"use client";

import { evaluate as mathjsEvaluate } from "mathjs";
import { useState } from "react";
import type { ResolvedInputs } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

const W = 480;
const H = 380;
const PAD = 40;
const PLOT_W = W - 2 * PAD;
const PLOT_H = H - 2 * PAD;

function evalAt2(expr: string, varX: string, x: number, varY: string, y: number): number {
  try {
    const result = mathjsEvaluate(expr, { [varX]: x, [varY]: y });
    if (typeof result !== "number" || !Number.isFinite(result)) return NaN;
    return result;
  } catch {
    return NaN;
  }
}

function toSvgX(x: number, xLo: number, xHi: number): number {
  return PAD + ((x - xLo) / (xHi - xLo)) * PLOT_W;
}
function toSvgY(y: number, yLo: number, yHi: number): number {
  return PAD + (1 - (y - yLo) / (yHi - yLo)) * PLOT_H;
}

export function VectorFieldVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const fx = inputs.Fx;
  const fy = inputs.Fy;

  const [zoom, setZoom] = useState(3);

  if (fx === undefined || fx.type.kind !== "Function") {
    return (
      <div
        data-testid="viz-vector-field-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect Fx(x,y) and Fy(x,y) to render the 2D vector field.
      </div>
    );
  }

  const fxPayload = fx.payload as unknown as FunctionPayload;
  // Determine the two variable names from Fx; default to x, y
  const varX = fxPayload.variables[0] ?? "x";
  const varY = fxPayload.variables[1] ?? "y";

  const fyPayload =
    fy !== undefined && fy.type.kind === "Function"
      ? (fy.payload as unknown as FunctionPayload)
      : null;

  const xLo = -zoom;
  const xHi = zoom;
  const yLo = -zoom;
  const yHi = zoom;

  // Grid resolution: 14×14 arrows
  const GRID = 14;

  type Arrow = { x: number; y: number; dx: number; dy: number; mag: number };
  const arrows: Arrow[] = [];
  let maxMag = 1e-10;

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x = xLo + ((i + 0.5) / GRID) * (xHi - xLo);
      const y = yLo + ((j + 0.5) / GRID) * (yHi - yLo);
      const dx = evalAt2(fxPayload.expression, varX, x, varY, y);
      const dyVal = fyPayload ? evalAt2(fyPayload.expression, varX, x, varY, y) : NaN;
      if (!Number.isFinite(dx) || !Number.isFinite(dyVal)) continue;
      const mag = Math.sqrt(dx * dx + dyVal * dyVal);
      if (mag > maxMag) maxMag = mag;
      arrows.push({ x, y, dx, dy: dyVal, mag });
    }
  }

  // Max arrow display length = half a grid cell
  const cellSize = (PLOT_W / GRID) * 0.45;

  const arrowColor = "var(--role-operation-border)";

  return (
    <div data-testid="viz-vector-field-root" className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: W, height: H }}
        role="img"
        aria-label={`2D vector field (${GRID}×${GRID} grid)`}
      >
        {/* Plot area */}
        <rect
          x={PAD}
          y={PAD}
          width={PLOT_W}
          height={PLOT_H}
          fill="var(--bg)"
          stroke="var(--border)"
          strokeWidth={0.5}
        />

        {/* Zero lines */}
        <line
          x1={toSvgX(0, xLo, xHi)}
          y1={PAD}
          x2={toSvgX(0, xLo, xHi)}
          y2={PAD + PLOT_H}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
        <line
          x1={PAD}
          y1={toSvgY(0, yLo, yHi)}
          x2={PAD + PLOT_W}
          y2={toSvgY(0, yLo, yHi)}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />

        {/* Arrows */}
        {arrows.map(({ x, y, dx, dy, mag }) => {
          const scale = (mag / maxMag) * cellSize;
          const nx = dx / mag;
          const ny = dy / mag;

          const svgX = toSvgX(x, xLo, xHi);
          const svgY = toSvgY(y, yLo, yHi);
          const tailX = svgX - (nx * scale) / 2;
          const tailY = svgY + (ny * scale) / 2;
          const headX = svgX + (nx * scale) / 2;
          const headY = svgY - (ny * scale) / 2;

          // Arrowhead
          const ahLen = scale * 0.3;
          const angle = Math.atan2(headY - tailY, headX - tailX);
          const ah1X = headX - ahLen * Math.cos(angle - 0.4);
          const ah1Y = headY - ahLen * Math.sin(angle - 0.4);
          const ah2X = headX - ahLen * Math.cos(angle + 0.4);
          const ah2Y = headY - ahLen * Math.sin(angle + 0.4);

          const opacity = 0.4 + 0.6 * (mag / maxMag);
          const key = `v${x.toFixed(4)},${y.toFixed(4)}`;
          return (
            <g key={key} opacity={opacity}>
              <line
                x1={tailX}
                y1={tailY}
                x2={headX}
                y2={headY}
                stroke={arrowColor}
                strokeWidth={1}
              />
              <line x1={headX} y1={headY} x2={ah1X} y2={ah1Y} stroke={arrowColor} strokeWidth={1} />
              <line x1={headX} y1={headY} x2={ah2X} y2={ah2Y} stroke={arrowColor} strokeWidth={1} />
            </g>
          );
        })}

        {/* Axis labels */}
        {[-zoom, 0, zoom].map((v) => {
          const px = toSvgX(v, xLo, xHi);
          const py = toSvgY(v, yLo, yHi);
          return (
            <g key={`ax${v}`}>
              <text
                x={px}
                y={PAD + PLOT_H + 14}
                textAnchor="middle"
                fontSize={8}
                fill="var(--fg-faint)"
              >
                {v}
              </text>
              <text x={PAD - 6} y={py + 3} textAnchor="end" fontSize={8} fill="var(--fg-faint)">
                {v}
              </text>
            </g>
          );
        })}

        {/* Fy absent warning */}
        {!fyPayload && (
          <text
            x={PAD + PLOT_W / 2}
            y={PAD + 14}
            textAnchor="middle"
            fontSize={8}
            fill="var(--fg-faint)"
          >
            Connect Fy(x,y) for full 2D field
          </text>
        )}
      </svg>

      {/* Zoom slider */}
      <div className="flex items-center gap-2 px-2 text-xs text-fg-muted">
        <label className="flex items-center gap-2">
          zoom ±{zoom}
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="View range"
            className="w-28"
          />
        </label>
      </div>
    </div>
  );
}
