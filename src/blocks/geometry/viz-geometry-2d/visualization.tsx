"use client";

import type { ResolvedInputs } from "~/blocks/types";
import type {
  CirclePayload,
  LinePayload,
  MathValue,
  PointPayload,
  PolygonPayload,
} from "~/math/types";

const SIZE = 260;
const PADDING = 20;
const VIEW_RANGE = 6;
const SCALE = (SIZE - 2 * PADDING) / (2 * VIEW_RANGE);
const CX = SIZE / 2;
const CY = SIZE / 2;

function toScreen(x: number, y: number): [number, number] {
  return [CX + x * SCALE, CY - y * SCALE];
}

function Axes() {
  const [x0] = toScreen(-VIEW_RANGE, 0);
  const [x1] = toScreen(VIEW_RANGE, 0);
  const [, y0] = toScreen(0, -VIEW_RANGE);
  const [, y1] = toScreen(0, VIEW_RANGE);
  return (
    <g stroke="#555" strokeWidth={1} opacity={0.5}>
      <line x1={x0} y1={CY} x2={x1} y2={CY} />
      <line x1={CX} y1={y0} x2={CX} y2={y1} />
      {Array.from({ length: 2 * VIEW_RANGE - 1 }, (_, i) => i - VIEW_RANGE + 1).map((t) => {
        const [tx, _ty] = toScreen(t, 0);
        const [, gy] = toScreen(0, t);
        return (
          <g key={t}>
            <line x1={tx} y1={CY - 3} x2={tx} y2={CY + 3} />
            <line x1={CX - 3} y1={gy} x2={CX + 3} y2={gy} />
          </g>
        );
      })}
    </g>
  );
}

function renderShape(val: MathValue, idx: number) {
  const kind = val.type.kind;

  if (kind === "Point") {
    const p = val.payload as PointPayload;
    const [sx, sy] = toScreen((p[0] as number) ?? 0, (p[1] as number) ?? 0);
    return <circle key={idx} cx={sx} cy={sy} r={4} fill="#4a9eff" stroke="white" strokeWidth={1} />;
  }

  if (kind === "Line") {
    const line = val.payload as LinePayload;
    const ax = line.point[0] ?? 0;
    const ay = line.point[1] ?? 0;
    const dx = line.direction[0] ?? 0;
    const dy = line.direction[1] ?? 0;
    const tMax = VIEW_RANGE * 2;
    const [x1, y1] = toScreen(ax - tMax * dx, ay - tMax * dy);
    const [x2, y2] = toScreen(ax + tMax * dx, ay + tMax * dy);
    return <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ff7f50" strokeWidth={1.5} />;
  }

  if (kind === "Circle") {
    const c = val.payload as CirclePayload;
    const [scx, scy] = toScreen((c.center[0] as number) ?? 0, (c.center[1] as number) ?? 0);
    const sr = c.radius * SCALE;
    return (
      <circle key={idx} cx={scx} cy={scy} r={sr} fill="none" stroke="#50d890" strokeWidth={1.5} />
    );
  }

  if (kind === "Polygon") {
    const verts = val.payload as PolygonPayload;
    const pts = verts
      .map((v) => {
        const [sx, sy] = toScreen((v as number[])[0] ?? 0, (v as number[])[1] ?? 0);
        return `${sx},${sy}`;
      })
      .join(" ");
    return (
      <polygon
        key={idx}
        points={pts}
        fill="rgba(180,130,255,0.15)"
        stroke="#b482ff"
        strokeWidth={1.5}
      />
    );
  }

  return null;
}

export function Geometry2dVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const shapes = Object.values(inputs).filter(Boolean) as MathValue[];

  return (
    <svg
      width={SIZE}
      height={SIZE}
      style={{ display: "block", background: "#1a1a2e" }}
      role="img"
      aria-label="2D geometry canvas"
    >
      <title>2D Geometry Canvas</title>
      <Axes />
      {shapes.map((val, i) => renderShape(val, i))}
    </svg>
  );
}
