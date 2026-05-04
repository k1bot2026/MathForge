"use client";

import { useMemo } from "react";
import type { ResolvedInputs } from "~/blocks/types";
import type { GraphPayload, MathValue } from "~/math/types";

const W = 400;
const H = 300;
const PADDING = 32;
const ITERATIONS = 120;
const AREA = (W - 2 * PADDING) * (H - 2 * PADDING);

type Pos = { x: number; y: number };

function forceLayout(
  vertices: ReadonlyArray<{ id: string }>,
  edges: ReadonlyArray<{ from: string; to: string }>,
): Map<string, Pos> {
  const n = vertices.length;
  if (n === 0) return new Map();

  const k = Math.sqrt(AREA / n);
  const pos = new Map<string, Pos>();

  // Place in a circle initially
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const r = Math.min(W, H) * 0.35;
    const v = vertices[i];
    if (v !== undefined) {
      pos.set(v.id, {
        x: W / 2 + r * Math.cos(angle),
        y: H / 2 + r * Math.sin(angle),
      });
    }
  }

  const disp = new Map<string, Pos>();
  for (const v of vertices) {
    disp.set(v.id, { x: 0, y: 0 });
  }

  let temp = W * 0.1;
  const cooling = temp / ITERATIONS;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const v of vertices) {
      disp.set(v.id, { x: 0, y: 0 });
    }

    // Repulsion
    for (let i = 0; i < n; i++) {
      const vi = vertices[i];
      if (vi === undefined) continue;
      const pi = pos.get(vi.id);
      if (pi === undefined) continue;
      const di = disp.get(vi.id) ?? { x: 0, y: 0 };

      for (let j = i + 1; j < n; j++) {
        const vj = vertices[j];
        if (vj === undefined) continue;
        const pj = pos.get(vj.id);
        if (pj === undefined) continue;
        const dj = disp.get(vj.id) ?? { x: 0, y: 0 };

        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
        const rep = (k * k) / dist;
        const fx = (dx / dist) * rep;
        const fy = (dy / dist) * rep;
        di.x += fx;
        di.y += fy;
        dj.x -= fx;
        dj.y -= fy;
        disp.set(vi.id, di);
        disp.set(vj.id, dj);
      }
    }

    // Attraction
    for (const edge of edges) {
      const pu = pos.get(edge.from);
      const pv = pos.get(edge.to);
      if (pu === undefined || pv === undefined) continue;
      const du = disp.get(edge.from) ?? { x: 0, y: 0 };
      const dv = disp.get(edge.to) ?? { x: 0, y: 0 };
      const dx = pu.x - pv.x;
      const dy = pu.y - pv.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
      const attr = (dist * dist) / k;
      const fx = (dx / dist) * attr;
      const fy = (dy / dist) * attr;
      du.x -= fx;
      du.y -= fy;
      dv.x += fx;
      dv.y += fy;
      disp.set(edge.from, du);
      disp.set(edge.to, dv);
    }

    // Apply displacement with cooling
    for (const v of vertices) {
      const p = pos.get(v.id);
      const d = disp.get(v.id);
      if (p === undefined || d === undefined) continue;
      const dLen = Math.max(Math.sqrt(d.x * d.x + d.y * d.y), 0.01);
      const move = Math.min(dLen, temp);
      pos.set(v.id, {
        x: Math.max(PADDING, Math.min(W - PADDING, p.x + (d.x / dLen) * move)),
        y: Math.max(PADDING, Math.min(H - PADDING, p.y + (d.y / dLen) * move)),
      });
    }

    temp -= cooling;
  }

  return pos;
}

function arrowPath(x1: number, y1: number, x2: number, y2: number, r: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return "";
  const ux = dx / len;
  const uy = dy / len;
  const tx = x2 - ux * (r + 6);
  const ty = y2 - uy * (r + 6);
  return `M${x1 + ux * r} ${y1 + uy * r} L${tx} ${ty}`;
}

export function GraphVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const gVal = inputs.G;

  const layout = useMemo(() => {
    if (gVal === undefined || gVal.type.kind !== "Graph") return null;
    const g = gVal.payload as GraphPayload;
    return forceLayout(g.vertices, g.edges);
  }, [gVal]);

  if (gVal === undefined || gVal.type.kind !== "Graph" || layout === null) {
    return (
      <div
        data-testid="viz-graph-2d-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a Graph to port G.
      </div>
    );
  }

  const g = gVal.payload as GraphPayload;
  const directed = (gVal.type as { directed: boolean }).directed;
  const weighted = (gVal.type as { weighted: boolean }).weighted;
  const RADIUS = Math.max(8, Math.min(14, 70 / Math.max(g.vertices.length, 1)));

  return (
    <svg
      role="img"
      aria-label="Force-directed graph"
      data-testid="viz-graph-2d-root"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ background: "transparent" }}
    >
      {directed && (
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="3" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="var(--role-operation-border, #888)" />
          </marker>
        </defs>
      )}

      {/* Edges */}
      {g.edges.map((edge) => {
        const pu = layout.get(edge.from);
        const pv = layout.get(edge.to);
        if (pu === undefined || pv === undefined) return null;
        const d = directed ? arrowPath(pu.x, pu.y, pv.x, pv.y, RADIUS) : undefined;
        return (
          <g key={`${edge.from}-${edge.to}`}>
            {directed ? (
              <path
                d={d}
                stroke="var(--role-operation-border, #888)"
                strokeWidth={1.5}
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            ) : (
              <line
                x1={pu.x}
                y1={pu.y}
                x2={pv.x}
                y2={pv.y}
                stroke="var(--role-operation-border, #888)"
                strokeWidth={1.5}
              />
            )}
            {weighted && edge.weight !== undefined && (
              <text
                x={(pu.x + pv.x) / 2}
                y={(pu.y + pv.y) / 2 - 4}
                fontSize={9}
                fill="var(--fg-muted, #aaa)"
                textAnchor="middle"
              >
                {edge.weight}
              </text>
            )}
          </g>
        );
      })}

      {/* Vertices */}
      {g.vertices.map((v) => {
        const p = layout.get(v.id);
        if (p === undefined) return null;
        return (
          <g key={v.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={RADIUS}
              fill="var(--role-source-bg, #1e293b)"
              stroke="var(--role-source-border, #7c3aed)"
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
              {v.label ?? v.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
