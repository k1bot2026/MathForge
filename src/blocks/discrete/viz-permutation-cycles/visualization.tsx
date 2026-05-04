"use client";

import { useMemo } from "react";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue, PermutationPayload } from "~/math/types";

const W = 400;
const H = 300;
const CX = W / 2;
const CY = H / 2;

const CYCLE_COLORS = [
  "var(--role-source-border, #7c3aed)",
  "var(--role-operation-border, #2563eb)",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
];

function decomposeCycles(perm: ReadonlyArray<number>): ReadonlyArray<ReadonlyArray<number>> {
  const visited = new Set<number>();
  const cycles: number[][] = [];
  for (let i = 0; i < perm.length; i++) {
    if (visited.has(i)) continue;
    const cycle: number[] = [];
    let cur = i;
    while (!visited.has(cur)) {
      visited.add(cur);
      cycle.push(cur);
      cur = perm[cur] ?? cur;
    }
    cycles.push(cycle);
  }
  return cycles;
}

function nodePosition(index: number, total: number, r: number): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
}

function arcPath(from: { x: number; y: number }, to: { x: number; y: number }, r: number): string {
  if (Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5) {
    // Self-loop: small circle above node
    return `M ${from.x} ${from.y - r * 0.3} a ${r * 0.25} ${r * 0.25} 0 1 1 0.001 0`;
  }
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  // Curve control point: perpendicular offset towards center
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const bend = Math.min(dist * 0.3, 40);
  // Offset toward circle center
  const nx = (CX - mx) / Math.max(Math.sqrt((CX - mx) ** 2 + (CY - my) ** 2), 1);
  const ny = (CY - my) / Math.max(Math.sqrt((CX - mx) ** 2 + (CY - my) ** 2), 1);
  const cpx = mx + nx * bend;
  const cpy = my + ny * bend;
  return `M ${from.x} ${from.y} Q ${cpx} ${cpy} ${to.x} ${to.y}`;
}

export function PermutationCyclesVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const pVal = inputs.P;

  const cycles = useMemo(() => {
    if (pVal === undefined || pVal.type.kind !== "Permutation") return null;
    return decomposeCycles(pVal.payload as PermutationPayload);
  }, [pVal]);

  if (pVal === undefined || pVal.type.kind !== "Permutation" || cycles === null) {
    return (
      <div
        data-testid="viz-permutation-cycles-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a Permutation to port P.
      </div>
    );
  }

  const n = (pVal.payload as PermutationPayload).length;
  const r = Math.min(120, Math.max(60, n * 12));
  const nodeR = Math.max(10, Math.min(16, 80 / Math.max(n, 1)));

  return (
    <svg
      role="img"
      aria-label="Permutation cycle decomposition"
      data-testid="viz-permutation-cycles-root"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ background: "transparent" }}
    >
      <defs>
        {cycles.map((cycle) => {
          const ci = cycles.indexOf(cycle);
          return (
            <marker
              key={`marker-first-${cycle[0] ?? 0}`}
              id={`arrow-${ci}`}
              markerWidth="6"
              markerHeight="4"
              refX="5"
              refY="2"
              orient="auto"
            >
              <polygon
                points="0 0, 6 2, 0 4"
                fill={CYCLE_COLORS[ci % CYCLE_COLORS.length] ?? "#888"}
              />
            </marker>
          );
        })}
      </defs>

      {/* Arcs for each cycle */}
      {cycles.map((cycle, ci) => {
        const color = CYCLE_COLORS[ci % CYCLE_COLORS.length] ?? "#888";
        return cycle.map((elem, j) => {
          const next = cycle[(j + 1) % cycle.length] ?? elem;
          const pFrom = nodePosition(elem, n, r);
          const pTo = nodePosition(next, n, r);
          if (cycle.length === 1) {
            // Fixed point: small self-loop indicator
            return (
              <circle
                key={`fixed-${elem}`}
                cx={pFrom.x}
                cy={pFrom.y - nodeR - 4}
                r={4}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
              />
            );
          }
          return (
            <path
              key={`arc-${elem}-to-${next}`}
              d={arcPath(pFrom, pTo, r)}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              markerEnd={`url(#arrow-${ci})`}
            />
          );
        });
      })}

      {/* Nodes */}
      {[...Array(n).keys()].map((i) => {
        const p = nodePosition(i, n, r);
        const ci = cycles.findIndex((c) => c.includes(i));
        const color = CYCLE_COLORS[ci % CYCLE_COLORS.length] ?? "#888";
        return (
          <g key={`node-${i}`}>
            <circle
              cx={p.x}
              cy={p.y}
              r={nodeR}
              fill="var(--role-source-bg, #1e293b)"
              stroke={color}
              strokeWidth={1.5}
            />
            <text
              x={p.x}
              y={p.y + 4}
              fontSize={10}
              fontWeight="500"
              fill="var(--fg-base, #f1f5f9)"
              textAnchor="middle"
              pointerEvents="none"
            >
              {i}
            </text>
          </g>
        );
      })}

      {/* Cycle legend */}
      <text x={W / 2} y={H - 8} fontSize={9} fill="var(--fg-faint, #64748b)" textAnchor="middle">
        {cycles.length} cycle{cycles.length !== 1 ? "s" : ""} — n = {n}
      </text>
    </svg>
  );
}
