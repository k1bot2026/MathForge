"use client";

// Inspector preview for la.eigen output.
// Renders eigenvectors as colored rays on a 2D or 3D plot.
// - 2×2 matrices: SVG with Cartesian axes, eigenvector rays as arrows.
// - 3×3 matrices: react-three-fiber Canvas with r3f arrows (reuses
//   the geometry pattern from viz.unit-grid-3d).
// - Other sizes: compact text summary of eigenvalues.

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { MathValue } from "~/math/types";
import type { EigenPayload } from "./compute";

// ── colour palette (one per eigenvector, cycling) ──────────────────────────
const COLORS = ["#e05c5c", "#5cb85c", "#5c9de0", "#c87de0", "#e0c05c"];

function eigenColor(i: number): string {
  return COLORS[i % COLORS.length] ?? "#888888";
}

// ── shared label for eigenvalue ─────────────────────────────────────────────
function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toPrecision(4).replace(/\.?0+$/, "");
}

// ── 2-D SVG renderer ────────────────────────────────────────────────────────

const SIZE = 220;
const PADDING = 24;
const HALF_RANGE = 1.5;
const SCALE = (SIZE - 2 * PADDING) / (2 * HALF_RANGE);
const CX = SIZE / 2;
const CY = SIZE / 2;

function toScreen(x: number, y: number): [number, number] {
  return [CX + x * SCALE, CY - y * SCALE];
}

type Arrow2dProps = { dx: number; dy: number; color: string; label: string };

function Arrow2d({ dx, dy, color, label }: Arrow2dProps) {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return null;
  const from = toScreen(0, 0);
  const to = toScreen(dx, dy);
  const [x1, y1] = from;
  const [x2, y2] = to;
  const ux = (x2 - x1) / Math.hypot(x2 - x1, y2 - y1);
  const uy = (y2 - y1) / Math.hypot(x2 - x1, y2 - y1);
  const headSize = 8;
  const headBaseX = x2 - ux * headSize;
  const headBaseY = y2 - uy * headSize;
  const perpX = -uy;
  const perpY = ux;
  const hw = headSize * 0.5;
  const wing1 = `${headBaseX + perpX * hw},${headBaseY + perpY * hw}`;
  const wing2 = `${headBaseX - perpX * hw},${headBaseY - perpY * hw}`;
  // Label just past tip
  const lx = x2 + ux * 12;
  const ly = y2 + uy * 12;

  return (
    <g>
      {/* Negative ray (faint) */}
      <line
        x1={x1}
        y1={y1}
        x2={CX - (x2 - CX)}
        y2={CY - (y2 - CY)}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 3"
        opacity={0.4}
      />
      {/* Positive ray */}
      <line x1={x1} y1={y1} x2={headBaseX} y2={headBaseY} stroke={color} strokeWidth={2} />
      <polygon points={`${x2},${y2} ${wing1} ${wing2}`} fill={color} />
      <text x={lx} y={ly} fontSize={9} fill={color} textAnchor="middle" dominantBaseline="central">
        {label}
      </text>
    </g>
  );
}

function EigenPreview2d({ eigenvalues, eigenvectors }: EigenPayload) {
  const gridLines = [-1, 1];
  return (
    <svg
      data-testid="eigen-preview-2d"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block h-[220px] w-[220px] rounded bg-bg"
      role="img"
      aria-label="Eigenvector directions"
    >
      {/* Faint grid */}
      <g stroke="var(--border)" strokeWidth={0.5} opacity={0.5}>
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
      {/* Eigenvector rays */}
      {eigenvalues.map((ev, k) => {
        const col0 = eigenvectors[0]?.[k] ?? 0;
        const col1 = eigenvectors[1]?.[k] ?? 0;
        return (
          <Arrow2d
            key={`ev${fmtNum(ev)}`}
            dx={col0}
            dy={col1}
            color={eigenColor(k)}
            label={`λ${k + 1}=${fmtNum(ev)}`}
          />
        );
      })}
    </svg>
  );
}

// ── 3-D r3f renderer ─────────────────────────────────────────────────────────

type Arrow3dProps = { to: [number, number, number]; color: string; opacity?: number };

function Arrow3d({ to, color, opacity = 1 }: Arrow3dProps) {
  const [dx, dy, dz] = to;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-6) return null;
  const dir: [number, number, number] = [dx / len, dy / len, dz / len];
  const mid: [number, number, number] = [dx * 0.5, dy * 0.5, dz * 0.5];
  const up: [number, number, number] = [0, 1, 0];
  const cross: [number, number, number] = [
    up[1] * dir[2] - up[2] * dir[1],
    up[2] * dir[0] - up[0] * dir[2],
    up[0] * dir[1] - up[1] * dir[0],
  ];
  const crossLen = Math.sqrt(cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2);
  const dot = up[0] * dir[0] + up[1] * dir[1] + up[2] * dir[2];
  let q: [number, number, number, number];
  if (crossLen < 1e-6) {
    q = dot > 0 ? [0, 0, 0, 1] : [1, 0, 0, 0];
  } else {
    const halfAngle = Math.acos(Math.max(-1, Math.min(1, dot))) / 2;
    const sinHalf = Math.sin(halfAngle);
    q = [
      (cross[0] / crossLen) * sinHalf,
      (cross[1] / crossLen) * sinHalf,
      (cross[2] / crossLen) * sinHalf,
      Math.cos(halfAngle),
    ];
  }
  return (
    <group>
      <mesh position={mid} quaternion={q}>
        <cylinderGeometry args={[0.03, 0.03, len * 0.85, 8]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={to} quaternion={q}>
        <coneGeometry args={[0.07, len * 0.15, 8]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

function EigenScene3d({ eigenvalues, eigenvectors }: EigenPayload) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <OrbitControls makeDefault />
      {/* Axis markers */}
      <Arrow3d to={[1.2, 0, 0]} color="#555" opacity={0.3} />
      <Arrow3d to={[0, 1.2, 0]} color="#555" opacity={0.3} />
      <Arrow3d to={[0, 0, 1.2]} color="#555" opacity={0.3} />
      {eigenvalues.map((ev, k) => {
        const v0 = eigenvectors[0]?.[k] ?? 0;
        const v1 = eigenvectors[1]?.[k] ?? 0;
        const v2 = eigenvectors[2]?.[k] ?? 0;
        return <Arrow3d key={`ev${fmtNum(ev)}`} to={[v0, v1, v2]} color={eigenColor(k)} />;
      })}
    </>
  );
}

function EigenPreview3d({ eigenvalues, eigenvectors }: EigenPayload) {
  return (
    <div
      data-testid="eigen-preview-3d"
      style={{ width: 220, height: 220 }}
      className="rounded bg-bg"
    >
      <Canvas camera={{ position: [2, 1.5, 2.5], fov: 45 }}>
        <Suspense fallback={null}>
          <EigenScene3d eigenvalues={eigenvalues} eigenvectors={eigenvectors} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ── Public component: dispatch on matrix size ────────────────────────────────

export function EigenPreviewRenderer({ value }: { value: MathValue }) {
  const payload = value.payload as unknown as EigenPayload;
  const { eigenvalues, eigenvectors } = payload;
  const n = eigenvectors.length;

  if (n === 2) {
    return <EigenPreview2d eigenvalues={eigenvalues} eigenvectors={eigenvectors} />;
  }
  if (n === 3) {
    return <EigenPreview3d eigenvalues={eigenvalues} eigenvectors={eigenvectors} />;
  }

  // For other sizes render a compact eigenvalue list
  return (
    <div data-testid="eigen-preview-text" className="font-mono text-xs text-fg-muted">
      {eigenvalues.map((ev, k) => (
        <div key={`ev${fmtNum(ev)}`}>
          λ{k + 1} = {fmtNum(ev)}
        </div>
      ))}
    </div>
  );
}
