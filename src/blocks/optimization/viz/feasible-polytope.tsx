"use client";

import type { BlockDefinition, ResolvedInputs } from "~/blocks/types";
import type { MathValue, SetPayload } from "~/math/types";

const W = 380;
const H = 320;
const PAD_L = 44;
const PAD_R = 24;
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

function FeasiblePolytopePlot({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const verticesVal = inputs.vertices;
  const optimalVal = inputs.optimal;

  if (verticesVal === undefined) {
    return (
      <div
        data-testid="viz-feasible-polytope-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect opt.feasible-region to see the feasible polytope.
      </div>
    );
  }

  const vertexSet = verticesVal.payload as SetPayload;
  const vertices: [number, number][] = vertexSet.map((v) => {
    const coords = v.payload as ReadonlyArray<number>;
    return [coords[0] ?? 0, coords[1] ?? 0];
  });

  if (vertices.length === 0) {
    return (
      <div
        data-testid="viz-feasible-polytope-empty"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Infeasible — no vertices found.
      </div>
    );
  }

  const allX = vertices.map((v) => v[0]);
  const allY = vertices.map((v) => v[1]);
  const margin = 0.8;
  const xMin = Math.min(0, ...allX) - margin;
  const xMax = Math.max(...allX) + margin;
  const yMin = Math.min(0, ...allY) - margin;
  const yMax = Math.max(...allY) + margin;

  // Build polygon points
  const polyPoints = vertices
    .map(([x, y]) => `${toSvgX(x, xMin, xMax).toFixed(1)},${toSvgY(y, yMin, yMax).toFixed(1)}`)
    .join(" ");

  // Optimal point
  let optX: number | null = null;
  let optY: number | null = null;
  if (optimalVal !== undefined && optimalVal.type.kind === "Vector") {
    const coords = optimalVal.payload as ReadonlyArray<number>;
    optX = coords[0] ?? null;
    optY = coords[1] ?? null;
  }

  const fillColor = "var(--role-operation-border)";
  const vertexColor = "var(--role-source-border)";
  const optColor = "var(--role-visualizer-border, #f59e0b)";

  return (
    <svg
      role="img"
      aria-label="Feasible polytope"
      data-testid="viz-feasible-polytope-root"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", width: W, height: H }}
    >
      {/* Plot area background */}
      <rect
        x={PAD_L}
        y={PAD_T}
        width={PLOT_W}
        height={PLOT_H}
        fill="var(--bg)"
        stroke="var(--border)"
        strokeWidth={0.5}
      />

      {/* Axis zero lines */}
      {xMin < 0 && xMax > 0 && (
        <line
          x1={toSvgX(0, xMin, xMax)}
          y1={PAD_T}
          x2={toSvgX(0, xMin, xMax)}
          y2={PAD_T + PLOT_H}
          stroke="var(--border)"
          strokeWidth={0.8}
        />
      )}
      {yMin < 0 && yMax > 0 && (
        <line
          x1={PAD_L}
          y1={toSvgY(0, yMin, yMax)}
          x2={PAD_L + PLOT_W}
          y2={toSvgY(0, yMin, yMax)}
          stroke="var(--border)"
          strokeWidth={0.8}
        />
      )}

      {/* Feasible region polygon */}
      {vertices.length >= 3 && (
        <polygon
          points={polyPoints}
          fill={fillColor}
          fillOpacity={0.2}
          stroke={fillColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      )}
      {vertices.length === 2 && (
        <polyline points={polyPoints} fill="none" stroke={fillColor} strokeWidth={1.5} />
      )}

      {/* Vertices */}
      {vertices.map(([x, y]) => (
        <circle
          key={`v${x.toFixed(4)},${y.toFixed(4)}`}
          cx={toSvgX(x, xMin, xMax)}
          cy={toSvgY(y, yMin, yMax)}
          r={4}
          fill={vertexColor}
          stroke="white"
          strokeWidth={1}
        />
      ))}

      {/* Optimal point */}
      {optX !== null && optY !== null && (
        <g>
          <circle
            cx={toSvgX(optX, xMin, xMax)}
            cy={toSvgY(optY, yMin, yMax)}
            r={7}
            fill={optColor}
            fillOpacity={0.9}
            stroke="white"
            strokeWidth={1.5}
          />
          <text
            x={toSvgX(optX, xMin, xMax) + 10}
            y={toSvgY(optY, yMin, yMax) - 6}
            fontSize={9}
            fill={optColor}
          >
            x*
          </text>
        </g>
      )}

      {/* X-axis ticks */}
      {Array.from({ length: 5 }, (_, i) => {
        const frac = i / 4;
        const x = xMin + frac * (xMax - xMin);
        const px = PAD_L + frac * PLOT_W;
        return (
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
              {x.toFixed(1)}
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
          <g key={`yt${y.toFixed(2)}`}>
            <line
              x1={PAD_L - 4}
              y1={py}
              x2={PAD_L}
              y2={py}
              stroke="var(--fg-muted)"
              strokeWidth={0.8}
            />
            <text x={PAD_L - 6} y={py + 4} textAnchor="end" fontSize={9} fill="var(--fg-muted)">
              {y.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const FeasiblePolytopeBlock: BlockDefinition = {
  id: "viz.feasible-polytope",
  label: "Feasible Polytope",
  symbol: "LP↗",
  category: "visualizer",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "vertices",
      label: "Vertices (from opt.feasible-region)",
      type: {
        kind: "Set",
        element: { kind: "Vector", n: 2, field: "real" },
      },
    },
    {
      id: "optimal",
      label: "Optimal point x* (optional, from opt.simplex result[0])",
      type: { kind: "Vector", n: 2, field: "real" },
      required: false,
    },
  ],
  outputs: [
    {
      id: "vertices",
      label: "Vertices (passthrough)",
      type: {
        kind: "Set",
        element: { kind: "Vector", n: 2, field: "real" },
      },
    },
  ],
  params: {},
  compute: (inputs): MathValue => {
    const v = inputs.vertices;
    if (v === undefined) throw new Error("viz.feasible-polytope: vertices input is required");
    return v;
  },
  explain: {
    what: "Renders the 2D feasible region of an LP as a convex polygon. Vertices come from opt.feasible-region. Optionally highlights the optimal vertex from opt.simplex.",
    why: "Visualising the feasible polytope makes LP geometry concrete: you can see which constraints bind, where the corners are, and where the optimal solution sits.",
    effect: (inputs) => {
      if (inputs.vertices === undefined)
        return "Connect opt.feasible-region to see the feasible polytope.";
      const count = (inputs.vertices.payload as SetPayload).length;
      return `Rendering feasible polytope with ${count} vertices${inputs.optimal !== undefined ? " and optimal point x*." : "."}`;
    },
    impact: (_inputs, output) => {
      const count = (output.payload as SetPayload).length;
      return `Passes vertex set (${count} points) downstream.`;
    },
  },
  visualization: FeasiblePolytopePlot,
};
