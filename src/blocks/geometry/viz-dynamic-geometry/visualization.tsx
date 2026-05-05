"use client";

import { useCallback, useRef, useState } from "react";
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

function fromScreen(sx: number, sy: number): [number, number] {
  return [(sx - CX) / SCALE, (CY - sy) / SCALE];
}

function midpoint(p1: [number, number], p2: [number, number]): [number, number] {
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

function perpBisectorEndpoints(
  p1: [number, number],
  p2: [number, number],
): [[number, number], [number, number]] {
  const mx = (p1[0] + p2[0]) / 2;
  const my = (p1[1] + p2[1]) / 2;
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-6)
    return [
      [mx, my],
      [mx, my],
    ];
  const ux = -dy / len;
  const uy = dx / len;
  const ext = VIEW_RANGE * 2;
  return [
    [mx - ux * ext, my - uy * ext],
    [mx + ux * ext, my + uy * ext],
  ];
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
    </g>
  );
}

function renderConnectedShape(val: MathValue, idx: number) {
  const kind = val.type.kind;

  if (kind === "Point") {
    const p = val.payload as PointPayload;
    const [sx, sy] = toScreen((p[0] as number) ?? 0, (p[1] as number) ?? 0);
    return <circle key={idx} cx={sx} cy={sy} r={4} fill="#4a9eff" stroke="white" strokeWidth={1} />;
  }

  if (kind === "Line") {
    const line = val.payload as LinePayload;
    const ax = (line.point[0] as number) ?? 0;
    const ay = (line.point[1] as number) ?? 0;
    const dx = (line.direction[0] as number) ?? 0;
    const dy = (line.direction[1] as number) ?? 0;
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

const INPUT_IDS = ["shape1", "shape2", "shape3"] as const;

export function VizDynamicGeometryVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const [draggable, setDraggable] = useState<[number, number]>([2, 2]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const anchorPoint: [number, number] = [-2, -1];

  const getSvgCoords = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const rect = svg.getBoundingClientRect();
    return fromScreen(clientX - rect.left, clientY - rect.top);
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      const [wx, wy] = getSvgCoords(e.clientX, e.clientY);
      setDraggable([wx, wy]);
    },
    [getSvgCoords],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current) return;
      const [wx, wy] = getSvgCoords(e.clientX, e.clientY);
      setDraggable([wx, wy]);
    },
    [getSvgCoords],
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      dragging.current = true;
      const [wx, wy] = getSvgCoords(touch.clientX, touch.clientY);
      setDraggable([wx, wy]);
    },
    [getSvgCoords],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const [wx, wy] = getSvgCoords(touch.clientX, touch.clientY);
      setDraggable([wx, wy]);
    },
    [getSvgCoords],
  );

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  const connectedShapes = INPUT_IDS.map((id) => inputs[id]).filter(
    (v): v is MathValue => v !== undefined,
  );

  const mid = midpoint(anchorPoint, draggable);
  const [bisA, bisB] = perpBisectorEndpoints(anchorPoint, draggable);

  const [ax, ay] = toScreen(...anchorPoint);
  const [px, py] = toScreen(...draggable);
  const [mx, my] = toScreen(...mid);
  const [bax, bay] = toScreen(...bisA);
  const [bbx, bby] = toScreen(...bisB);

  return (
    <svg
      ref={svgRef}
      width={SIZE}
      height={SIZE}
      style={{ display: "block", background: "#1a1a2e", cursor: "crosshair", touchAction: "none" }}
      role="img"
      aria-label="Dynamic geometry canvas — drag the blue handle"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <title>Dynamic Geometry Canvas</title>
      <Axes />

      {connectedShapes.map((s, i) => renderConnectedShape(s, i))}

      {/* Perpendicular bisector */}
      <line
        x1={bax}
        y1={bay}
        x2={bbx}
        y2={bby}
        stroke="#ffd700"
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.7}
      />

      {/* Segment A–P */}
      <line x1={ax} y1={ay} x2={px} y2={py} stroke="#aaa" strokeWidth={1.5} />

      {/* Midpoint */}
      <circle cx={mx} cy={my} r={3} fill="#ffd700" />

      {/* Anchor point A (fixed) */}
      <circle cx={ax} cy={ay} r={5} fill="#50d890" stroke="white" strokeWidth={1} />

      {/* Draggable handle P */}
      {/* biome-ignore lint/a11y/useSemanticElements: SVG circle cannot be a <button>; role="button" is the correct WAI-ARIA approach for SVG interactive elements */}
      <circle
        role="button"
        aria-label="Drag to move point P"
        tabIndex={0}
        data-testid="dynamic-geometry-handle"
        cx={px}
        cy={py}
        r={7}
        fill="#4a9eff"
        stroke="white"
        strokeWidth={1.5}
        style={{ cursor: "grab" }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      />

      {/* Labels */}
      <text x={ax + 8} y={ay - 6} fontSize={10} fill="#50d890" fontFamily="monospace">
        A
      </text>
      <text x={px + 9} y={py - 8} fontSize={10} fill="#4a9eff" fontFamily="monospace">
        P
      </text>
      <text x={mx + 5} y={my - 5} fontSize={9} fill="#ffd700" fontFamily="monospace">
        M
      </text>
    </svg>
  );
}
