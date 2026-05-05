"use client";

import { evaluate as mathjsEvaluate } from "mathjs";
import type { BlockDefinition, ResolvedInputs } from "~/blocks/types";
import type { FunctionPayload, MathValue } from "~/math/types";

const W = 400;
const H = 360;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const CONTOUR_LEVELS = 12;

function evalFn2d(expression: string, x: number, y: number): number {
  try {
    const result = mathjsEvaluate(expression.replace(/\*\*/g, "^"), { x, y });
    return typeof result === "number" && Number.isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

function toSvgX(x: number, xMin: number, xMax: number): number {
  return PAD_L + ((x - xMin) / (xMax - xMin)) * PLOT_W;
}
function toSvgY(y: number, yMin: number, yMax: number): number {
  return PAD_T + (1 - (y - yMin) / (yMax - yMin)) * PLOT_H;
}

// Simple marching-squares contour line for a single level.
// Returns a list of line segment endpoints in SVG coordinates.
function marchingSquaresContour(
  grid: Float64Array,
  nx: number,
  ny: number,
  level: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): Array<[number, number, number, number]> {
  const dx = (xMax - xMin) / (nx - 1);
  const dy = (yMax - yMin) / (ny - 1);
  const segs: Array<[number, number, number, number]> = [];

  function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const f00 = grid[j * nx + i] ?? NaN;
      const f10 = grid[j * nx + (i + 1)] ?? NaN;
      const f01 = grid[(j + 1) * nx + i] ?? NaN;
      const f11 = grid[(j + 1) * nx + (i + 1)] ?? NaN;

      if (!Number.isFinite(f00 + f10 + f01 + f11)) continue;

      const c = ((f00 >= level ? 1 : 0) |
        (f10 >= level ? 2 : 0) |
        (f01 >= level ? 4 : 0) |
        (f11 >= level ? 8 : 0)) as number;

      if (c === 0 || c === 15) continue;

      const x0 = xMin + i * dx;
      const x1 = xMin + (i + 1) * dx;
      const y0 = yMin + j * dy;
      const y1 = yMin + (j + 1) * dy;

      // Interpolation helpers for each edge
      function edgePt(side: 0 | 1 | 2 | 3): [number, number] {
        if (side === 0) {
          // Bottom edge (y=y0): f00 → f10
          const t = (level - f00) / (f10 - f00);
          return [lerp(x0, x1, t), y0];
        }
        if (side === 1) {
          // Right edge (x=x1): f10 → f11
          const t = (level - f10) / (f11 - f10);
          return [x1, lerp(y0, y1, t)];
        }
        if (side === 2) {
          // Top edge (y=y1): f01 → f11
          const t = (level - f01) / (f11 - f01);
          return [lerp(x0, x1, t), y1];
        }
        // Left edge (x=x0): f00 → f01
        const t = (level - f00) / (f01 - f00);
        return [x0, lerp(y0, y1, t)];
      }

      // Lookup table for marching squares (15 non-trivial cases)
      const edges: Array<[0 | 1 | 2 | 3, 0 | 1 | 2 | 3]> = [];
      if (c === 1 || c === 14) edges.push([0, 3]);
      else if (c === 2 || c === 13) edges.push([0, 1]);
      else if (c === 4 || c === 11) edges.push([2, 3]);
      else if (c === 8 || c === 7) edges.push([1, 2]);
      else if (c === 3 || c === 12) {
        edges.push([3, 1]);
      } else if (c === 6 || c === 9) {
        edges.push([0, 2]);
      } else if (c === 5) {
        edges.push([0, 3]);
        edges.push([1, 2]);
      } else if (c === 10) {
        edges.push([0, 1]);
        edges.push([2, 3]);
      }

      for (const [e0, e1] of edges) {
        const [ax, ay] = edgePt(e0);
        const [bx, by] = edgePt(e1);
        segs.push([
          toSvgX(ax, xMin, xMax),
          toSvgY(ay, yMin, yMax),
          toSvgX(bx, xMin, xMax),
          toSvgY(by, yMin, yMax),
        ]);
      }
    }
  }
  return segs;
}

function OptimizationTrajectoryPlot({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const fnVal = inputs.fn;
  const optimalVal = inputs.optimal;
  const startVal = inputs.start;
  const xMinParam = (inputs.x_min?.payload as number | undefined) ?? -3;
  const xMaxParam = (inputs.x_max?.payload as number | undefined) ?? 3;
  const yMinParam = (inputs.y_min?.payload as number | undefined) ?? -3;
  const yMaxParam = (inputs.y_max?.payload as number | undefined) ?? 3;

  if (fnVal === undefined) {
    return (
      <div
        data-testid="viz-opt-trajectory-placeholder"
        className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect a 2D function f(x,y) to see the optimization landscape.
      </div>
    );
  }

  const { expression } = fnVal.payload as unknown as FunctionPayload;

  const nx = 40;
  const ny = 40;
  const grid = new Float64Array(nx * ny);
  let fMin = Infinity;
  let fMax = -Infinity;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const xi = xMinParam + (i / (nx - 1)) * (xMaxParam - xMinParam);
      const yj = yMinParam + (j / (ny - 1)) * (yMaxParam - yMinParam);
      const fv = evalFn2d(expression, xi, yj);
      grid[j * nx + i] = fv;
      if (Number.isFinite(fv)) {
        if (fv < fMin) fMin = fv;
        if (fv > fMax) fMax = fv;
      }
    }
  }

  if (!Number.isFinite(fMin)) {
    return (
      <div className="flex h-[80px] items-center justify-center text-center text-xs text-fg-faint">
        Function produced no finite values in this domain.
      </div>
    );
  }

  // Generate contour levels
  const fRange = fMax - fMin;
  const levels = Array.from(
    { length: CONTOUR_LEVELS },
    (_, k) => fMin + ((k + 1) / (CONTOUR_LEVELS + 1)) * fRange,
  );

  const optCoords =
    optimalVal !== undefined && optimalVal.type.kind === "Vector"
      ? (optimalVal.payload as ReadonlyArray<number>)
      : null;
  const startCoords =
    startVal !== undefined && startVal.type.kind === "Vector"
      ? (startVal.payload as ReadonlyArray<number>)
      : null;

  const contourColor = "var(--role-operation-border)";
  const optColor = "var(--role-visualizer-border, #f59e0b)";
  const startColor = "var(--role-source-border)";

  return (
    <svg
      role="img"
      aria-label="Optimization landscape contour plot"
      data-testid="viz-opt-trajectory-root"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", width: W, height: H }}
    >
      <rect
        x={PAD_L}
        y={PAD_T}
        width={PLOT_W}
        height={PLOT_H}
        fill="var(--bg)"
        stroke="var(--border)"
        strokeWidth={0.5}
      />

      {/* Contour lines */}
      {levels.map((level, li) => {
        const segs = marchingSquaresContour(
          grid,
          nx,
          ny,
          level,
          xMinParam,
          xMaxParam,
          yMinParam,
          yMaxParam,
        );
        const opacity = 0.25 + (li / (CONTOUR_LEVELS - 1)) * 0.55;
        return segs.map(([x1, y1, x2, y2]) => (
          <line
            key={`c:${x1.toFixed(1)},${y1.toFixed(1)}→${x2.toFixed(1)},${y2.toFixed(1)}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={contourColor}
            strokeWidth={0.8}
            strokeOpacity={opacity}
          />
        ));
      })}

      {/* Start point */}
      {startCoords !== null && (
        <g>
          <circle
            cx={toSvgX(startCoords[0] ?? 0, xMinParam, xMaxParam)}
            cy={toSvgY(startCoords[1] ?? 0, yMinParam, yMaxParam)}
            r={5}
            fill={startColor}
            fillOpacity={0.9}
            stroke="white"
            strokeWidth={1.5}
          />
          <text
            x={toSvgX(startCoords[0] ?? 0, xMinParam, xMaxParam) + 8}
            y={toSvgY(startCoords[1] ?? 0, yMinParam, yMaxParam) - 6}
            fontSize={9}
            fill={startColor}
          >
            x₀
          </text>
        </g>
      )}

      {/* Optimal point */}
      {optCoords !== null && (
        <g>
          <circle
            cx={toSvgX(optCoords[0] ?? 0, xMinParam, xMaxParam)}
            cy={toSvgY(optCoords[1] ?? 0, yMinParam, yMaxParam)}
            r={7}
            fill={optColor}
            fillOpacity={0.9}
            stroke="white"
            strokeWidth={1.5}
          />
          <text
            x={toSvgX(optCoords[0] ?? 0, xMinParam, xMaxParam) + 10}
            y={toSvgY(optCoords[1] ?? 0, yMinParam, yMaxParam) - 6}
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
        const x = xMinParam + frac * (xMaxParam - xMinParam);
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
        const y = yMinParam + frac * (yMaxParam - yMinParam);
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

export const OptimizationTrajectoryBlock: BlockDefinition = {
  id: "viz.optimization-trajectory",
  label: "Optimization Landscape",
  symbol: "∇f",
  category: "visualizer",
  domain: "optimization",
  determinism: "pure",
  stability: "experimental",
  engine: "native",
  color: "visualizer",
  inputs: [
    {
      id: "fn",
      label: "f (2D objective — must use variables x and y)",
      type: {
        kind: "Function",
        arity: 2,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
    {
      id: "optimal",
      label: "Optimal x* (optional, Vector(2) from opt.minimize)",
      type: { kind: "Vector", n: 2, field: "real" },
      required: false,
    },
    {
      id: "start",
      label: "Start x₀ (optional, Vector(2) initial guess)",
      type: { kind: "Vector", n: 2, field: "real" },
      required: false,
    },
    {
      id: "x_min",
      label: "x min (default −3)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "x_max",
      label: "x max (default 3)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "y_min",
      label: "y min (default −3)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
    {
      id: "y_max",
      label: "y max (default 3)",
      type: { kind: "Scalar", field: "real", precision: "approximate" },
      required: false,
    },
  ],
  outputs: [
    {
      id: "fn",
      label: "f (passthrough)",
      type: {
        kind: "Function",
        arity: 2,
        domain: { kind: "Scalar", field: "real", precision: "approximate" },
        codomain: { kind: "Scalar", field: "real", precision: "approximate" },
      },
    },
  ],
  params: {},
  compute: (inputs): MathValue => {
    const fn = inputs.fn;
    if (fn === undefined) throw new Error("viz.optimization-trajectory: fn input is required");
    return fn;
  },
  explain: {
    what: "Renders a 2D objective function f(x,y) as contour lines. Optionally marks the starting point x₀ and the optimal point x* found by an optimization block.",
    why: "Contour plots reveal the shape of the loss landscape: valleys, saddle points, ill-conditioning (elongated ellipses). Use with opt.gradient-descent or opt.minimize for visual debugging.",
    effect: (inputs) => {
      if (inputs.fn === undefined)
        return "Connect a 2D function to see the optimization landscape.";
      const hasOpt = inputs.optimal !== undefined;
      const hasStart = inputs.start !== undefined;
      const parts: string[] = [];
      if (hasStart) parts.push("starting point");
      if (hasOpt) parts.push("optimal x*");
      return `Rendering contour landscape${parts.length > 0 ? ` with ${parts.join(" and ")}` : ""}.`;
    },
    impact: (_inputs, _output) => "Passes function f downstream for chaining.",
  },
  visualization: OptimizationTrajectoryPlot,
};
