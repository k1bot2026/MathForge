"use client";

import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

const W = 300;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const R = 110;
const TICK_R = 126;
const LABEL_R = 136;
const NODE_R = 14;

function clockAngle(value: number, modulus: number): number {
  return (2 * Math.PI * value) / modulus - Math.PI / 2;
}

export function ModularClockVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const mVal = inputs.M;

  if (mVal === undefined || mVal.type.kind !== "Modular") {
    return (
      <div
        data-testid="viz-modular-clock-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a Modular value to port M.
      </div>
    );
  }

  const { value, modulus } = mVal.payload as { value: number; modulus: number };
  const n = modulus;

  // Draw tick marks for each residue
  const ticks = Array.from({ length: n }, (_, i) => {
    const angle = clockAngle(i, n);
    const tx = CX + TICK_R * Math.cos(angle);
    const ty = CY + TICK_R * Math.sin(angle);
    const lx = CX + LABEL_R * Math.cos(angle);
    const ly = CY + LABEL_R * Math.sin(angle);
    return { i, tx, ty, lx, ly, angle };
  });

  // Active node position
  const activeAngle = clockAngle(value, n);
  const ax = CX + R * Math.cos(activeAngle);
  const ay = CY + R * Math.sin(activeAngle);

  // Hand from center to active value
  const handX = CX + (R - NODE_R - 2) * Math.cos(activeAngle);
  const handY = CY + (R - NODE_R - 2) * Math.sin(activeAngle);

  const fontSize = Math.max(7, Math.min(10, 120 / n));

  return (
    <svg
      role="img"
      aria-label={`Modular clock: ${value} mod ${modulus}`}
      data-testid="viz-modular-clock-root"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ background: "transparent" }}
    >
      {/* Outer ring */}
      <circle
        cx={CX}
        cy={CY}
        r={TICK_R - 4}
        fill="none"
        stroke="var(--role-source-border, #7c3aed)"
        strokeWidth={1}
        strokeOpacity={0.3}
      />

      {/* Tick labels for each residue */}
      {ticks.map(({ i, tx, ty, lx, ly }) => (
        <g key={i}>
          <circle
            cx={tx}
            cy={ty}
            r={2.5}
            fill={i === value ? "var(--role-source-border, #7c3aed)" : "var(--fg-faint, #64748b)"}
          />
          <text
            x={lx}
            y={ly + fontSize * 0.35}
            fontSize={fontSize}
            fill={i === value ? "var(--fg-base, #f1f5f9)" : "var(--fg-faint, #64748b)"}
            fontWeight={i === value ? "700" : "400"}
            textAnchor="middle"
          >
            {i}
          </text>
        </g>
      ))}

      {/* Clock hand */}
      <line
        x1={CX}
        y1={CY}
        x2={handX}
        y2={handY}
        stroke="var(--role-source-border, #7c3aed)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx={CX} cy={CY} r={4} fill="var(--role-source-border, #7c3aed)" />

      {/* Active node highlight */}
      <circle
        cx={ax}
        cy={ay}
        r={NODE_R}
        fill="var(--role-source-border, #7c3aed)"
        fillOpacity={0.2}
        stroke="var(--role-source-border, #7c3aed)"
        strokeWidth={2}
      />
      <text
        x={ax}
        y={ay + 4}
        fontSize={11}
        fontWeight="700"
        fill="var(--fg-base, #f1f5f9)"
        textAnchor="middle"
      >
        {value}
      </text>

      {/* Label */}
      <text x={CX} y={H - 10} fontSize={10} fill="var(--fg-faint, #64748b)" textAnchor="middle">
        {value} ≡ {value} (mod {modulus})
      </text>
    </svg>
  );
}
