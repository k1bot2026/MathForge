"use client";

// 2D unit-grid visualization for a 2×2 real matrix M.
//
// Phase-1 implementation uses raw SVG — Mafs (0.21.0) is pre-1.0 with a
// React-19 peer-dep risk that we don't want to take on the same session
// where the visualizer needs to ship green. Phase 2 can swap in Mafs
// behind the same component contract.
//
// What it shows:
//   - Cartesian axes + a faint dotted grid (-3..3 by integer ticks)
//   - The original basis (e₁ = (1,0), e₂ = (0,1)) as faint reference arrows
//   - The transformed basis (M·e₁, M·e₂) as the source-role + operation-role
//     accent arrows so the colour mapping echoes the role semantics from
//     docs/BRAND.md
//   - The transformed unit-square outline (so determinant changes are
//     visible as area change)

import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

const SIZE = 220;
const PADDING = 16;
const HALF_RANGE = 3;
const SCALE = (SIZE - 2 * PADDING) / (2 * HALF_RANGE);
const CX = SIZE / 2;
const CY = SIZE / 2;

function toScreen(x: number, y: number): [number, number] {
  return [CX + x * SCALE, CY - y * SCALE];
}

type ArrowProps = {
  from: readonly [number, number];
  to: readonly [number, number];
  color: string;
  width?: number;
  opacity?: number;
};

function Arrow({ from, to, color, width = 1.5, opacity = 1 }: ArrowProps) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  if (x1 === x2 && y1 === y2) return null;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const headSize = 8;
  const headBaseX = x2 - ux * headSize;
  const headBaseY = y2 - uy * headSize;
  // Perpendicular for arrowhead wings
  const perpX = -uy;
  const perpY = ux;
  const halfWidth = headSize * 0.5;
  const wing1 = `${headBaseX + perpX * halfWidth},${headBaseY + perpY * halfWidth}`;
  const wing2 = `${headBaseX - perpX * halfWidth},${headBaseY - perpY * halfWidth}`;
  return (
    <g opacity={opacity}>
      <line x1={x1} y1={y1} x2={headBaseX} y2={headBaseY} stroke={color} strokeWidth={width} />
      <polygon points={`${x2},${y2} ${wing1} ${wing2}`} fill={color} />
    </g>
  );
}

export function UnitGridVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const M = inputs.M;
  if (M === undefined || M.type.kind !== "Matrix") {
    return (
      <div className="flex h-[220px] w-[220px] items-center justify-center text-center text-xs text-fg-faint">
        Connect a 2×2 matrix to M.
      </div>
    );
  }
  const matrix = M.payload as ReadonlyArray<ReadonlyArray<number>>;
  const m11 = matrix[0]?.[0] ?? 1;
  const m12 = matrix[0]?.[1] ?? 0;
  const m21 = matrix[1]?.[0] ?? 0;
  const m22 = matrix[1]?.[1] ?? 1;

  const e1 = toScreen(1, 0);
  const e2 = toScreen(0, 1);
  const Me1 = toScreen(m11, m21);
  const Me2 = toScreen(m12, m22);
  const origin = toScreen(0, 0);
  // Transformed unit-square corners.
  const sq00 = toScreen(0, 0);
  const sq10 = toScreen(m11, m21);
  const sq11 = toScreen(m11 + m12, m21 + m22);
  const sq01 = toScreen(m12, m22);

  const gridLines: number[] = [-3, -2, -1, 1, 2, 3];

  return (
    <svg
      data-testid="unit-grid-svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block h-[220px] w-[220px] rounded bg-bg"
      role="img"
      aria-label={`Unit-grid visualization of M = [[${m11}, ${m12}], [${m21}, ${m22}]]`}
    >
      {/* Faint grid */}
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.6}>
        {gridLines.map((g) => {
          const [, gy] = toScreen(0, g);
          return <line key={`gh${g}`} x1={PADDING} y1={gy} x2={SIZE - PADDING} y2={gy} />;
        })}
        {gridLines.map((g) => {
          const [gx] = toScreen(g, 0);
          return <line key={`gv${g}`} x1={gx} y1={PADDING} x2={gx} y2={SIZE - PADDING} />;
        })}
      </g>
      {/* Axes */}
      <g stroke="var(--fg-muted)" strokeWidth={1}>
        <line x1={PADDING} y1={CY} x2={SIZE - PADDING} y2={CY} />
        <line x1={CX} y1={PADDING} x2={CX} y2={SIZE - PADDING} />
      </g>
      {/* Transformed unit-square outline */}
      <polygon
        points={`${sq00[0]},${sq00[1]} ${sq10[0]},${sq10[1]} ${sq11[0]},${sq11[1]} ${sq01[0]},${sq01[1]}`}
        fill="var(--role-source-fill)"
        fillOpacity={0.35}
        stroke="var(--role-source-border)"
        strokeWidth={1}
      />
      {/* Original basis (faint reference) */}
      <Arrow from={origin} to={e1} color="var(--fg-faint)" opacity={0.4} />
      <Arrow from={origin} to={e2} color="var(--fg-faint)" opacity={0.4} />
      {/* Transformed basis */}
      <Arrow from={origin} to={Me1} color="var(--role-source-border)" width={2} />
      <Arrow from={origin} to={Me2} color="var(--role-operation-border)" width={2} />
    </svg>
  );
}
