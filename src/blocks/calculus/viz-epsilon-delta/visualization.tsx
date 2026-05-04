"use client";

import { useState } from "react";
import type { ResolvedInputs } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";
import { evalAt, sampleExpr, yRange } from "../viz-calc";

const W = 480;
const H = 300;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 20;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function toSvgX(x: number, xLo: number, xHi: number): number {
  return PAD_L + ((x - xLo) / (xHi - xLo)) * PLOT_W;
}
function toSvgY(y: number, yMin: number, yMax: number): number {
  return PAD_T + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
}

export function EpsilonDeltaVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const fn = inputs.fn;

  const [epsilon, setEpsilon] = useState(0.5);
  const [delta, setDelta] = useState(0.3);

  if (fn === undefined || fn.type.kind !== "Function") {
    return (
      <div
        data-testid="viz-epsilon-delta-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect f(x) and the limit point c to see the ε-δ definition.
      </div>
    );
  }

  const fnPayload = fn.payload as unknown as FunctionPayload;
  const variable = fnPayload.variables[0] ?? "x";

  // c: the point at which we take the limit
  const cInput = inputs.c;
  const c = cInput !== undefined && typeof cInput.payload === "number" ? cInput.payload : 0;

  // L: the claimed limit value — prefer connected input, fallback to f(c) numerically
  const lInput = inputs.L;
  const fAtC = evalAt(fnPayload.expression, variable, c);
  const L =
    lInput !== undefined && typeof lInput.payload === "number"
      ? lInput.payload
      : Number.isFinite(fAtC)
        ? fAtC
        : 0;

  // Plot window centred on c
  const halfSpan = Math.max(3 * delta, 1.5);
  const xLo = c - halfSpan * 3;
  const xHi = c + halfSpan * 3;

  const { xs, ys } = sampleExpr(fnPayload.expression, variable, xLo, xHi, 300);
  const rawRange = yRange(ys);
  const span = Math.abs(rawRange[1] - rawRange[0]);
  const clampSpan = 4 * span + 2;
  const yMin = Math.max(rawRange[0], L - clampSpan / 2);
  const yMax = Math.min(rawRange[1], L + clampSpan / 2);

  const curvePts = xs
    .map((x, i) => {
      const y = ys[i];
      if (y === undefined || !Number.isFinite(y)) return null;
      return `${toSvgX(x, xLo, xHi).toFixed(1)},${toSvgY(y, yMin, yMax).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  const cSvgX = toSvgX(c, xLo, xHi);
  const lSvgY = toSvgY(L, yMin, yMax);

  // δ-band: vertical strip [c-δ, c+δ]
  const dLo = toSvgX(c - delta, xLo, xHi);
  const dHi = toSvgX(c + delta, xLo, xHi);
  const dW = dHi - dLo;

  // ε-band: horizontal strip [L-ε, L+ε]
  const eLo = toSvgY(L + epsilon, yMin, yMax);
  const eHi = toSvgY(L - epsilon, yMin, yMax);
  const eH = eHi - eLo;

  // Verify: does f map (c-δ, c+δ)\{c} into (L-ε, L+ε)?
  const sampleXs = Array.from({ length: 41 }, (_, i) => c - delta + (i / 40) * 2 * delta).filter(
    (x) => Math.abs(x - c) > 1e-10,
  );
  const satisfied = sampleXs.every((x) => {
    const y = evalAt(fnPayload.expression, variable, x);
    return !Number.isFinite(y) || Math.abs(y - L) < epsilon;
  });

  const fnColor = "var(--role-source-border)";
  const deltaColor = "rgba(99, 179, 237, 0.2)";
  const epsilonColor = "rgba(252, 211, 77, 0.2)";
  const overlapColor = "rgba(52, 211, 153, 0.25)";
  const badColor = "rgba(252, 129, 74, 0.2)";

  return (
    <div data-testid="viz-epsilon-delta-root" className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: W, height: H }}
        role="img"
        aria-label={`ε-δ definition of limit: f(x)→${L.toFixed(3)} as x→${c.toFixed(3)}`}
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

        {/* δ-strip (vertical, blue) */}
        <rect
          x={Math.max(PAD_L, dLo)}
          y={PAD_T}
          width={Math.min(dW, PLOT_W)}
          height={PLOT_H}
          fill={deltaColor}
        />

        {/* ε-strip (horizontal, yellow) */}
        <rect x={PAD_L} y={eLo} width={PLOT_W} height={eH} fill={epsilonColor} />

        {/* Overlap region (green if valid, orange if violated) */}
        <rect
          x={Math.max(PAD_L, dLo)}
          y={eLo}
          width={Math.min(dW, PLOT_W)}
          height={eH}
          fill={satisfied ? overlapColor : badColor}
        />

        {/* L horizontal dashed line */}
        <line
          x1={PAD_L}
          y1={lSvgY}
          x2={PAD_L + PLOT_W}
          y2={lSvgY}
          stroke="var(--fg-muted)"
          strokeWidth={0.8}
          strokeDasharray="4 3"
        />

        {/* c vertical dashed line */}
        <line
          x1={cSvgX}
          y1={PAD_T}
          x2={cSvgX}
          y2={PAD_T + PLOT_H}
          stroke="var(--fg-muted)"
          strokeWidth={0.8}
          strokeDasharray="4 3"
        />

        {/* f(x) curve */}
        {curvePts && (
          <polyline
            points={curvePts}
            fill="none"
            stroke={fnColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}

        {/* Hollow circle at (c, L) — limit point */}
        <circle cx={cSvgX} cy={lSvgY} r={4} fill="var(--bg)" stroke={fnColor} strokeWidth={1.5} />

        {/* Labels */}
        <text x={cSvgX + 4} y={PAD_T + PLOT_H - 4} fontSize={9} fill="var(--fg-muted)">
          c={c.toFixed(2)}
        </text>
        <text x={PAD_L + 4} y={lSvgY - 4} fontSize={9} fill="var(--fg-muted)">
          L={L.toFixed(3)}
        </text>

        {/* Validity badge */}
        <text
          x={PAD_L + PLOT_W - 4}
          y={PAD_T + 14}
          textAnchor="end"
          fontSize={9}
          fill={satisfied ? "var(--role-source-border)" : "var(--destructive)"}
        >
          {satisfied ? "δ works for ε" : "δ too large"}
        </text>

        {/* X-axis ticks */}
        {[c - delta, c, c + delta].map((x) => {
          const px = toSvgX(x, xLo, xHi);
          const label = x === c ? `c` : x < c ? `c-δ` : `c+δ`;
          return (
            <g key={`xt${x.toFixed(6)}`}>
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
                fontSize={8}
                fill="var(--fg-faint)"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Sliders */}
      <div className="flex flex-col gap-1 px-2 text-xs text-fg-muted">
        <label className="flex items-center gap-2">
          ε = {epsilon.toFixed(3)}
          <input
            type="range"
            min={0.01}
            max={2}
            step={0.01}
            value={epsilon}
            onChange={(e) => setEpsilon(Number(e.target.value))}
            aria-label="Epsilon (output tolerance)"
            className="w-32"
          />
        </label>
        <label className="flex items-center gap-2">
          δ = {delta.toFixed(3)}
          <input
            type="range"
            min={0.01}
            max={2}
            step={0.01}
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            aria-label="Delta (input tolerance)"
            className="w-32"
          />
        </label>
        <div className="text-fg-faint">
          {satisfied
            ? `For all x in (c-δ, c+δ)\\{c}, |f(x)-L| < ε ✓`
            : `Some x in (c-δ, c+δ) has |f(x)-L| ≥ ε ✗`}
        </div>
      </div>
    </div>
  );
}
