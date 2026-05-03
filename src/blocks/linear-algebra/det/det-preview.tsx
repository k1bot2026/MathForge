"use client";

// Inspector preview for la.det output.
// Animates the unit square/cube under the transformation encoded in A.
// - 2×2 matrices: SVG showing unit square → transformed parallelogram.
//   Positive det = blue fill, negative = orange (orientation flip).
//   det=0 = red collapsed shape.
// - 3×3 matrices: react-three-fiber Canvas showing unit cube → parallelepiped.
// - Other sizes: no preview (value strip suffices).

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

// ── helpers ─────────────────────────────────────────────────────────────────

function fmtDet(d: number): string {
  if (Number.isInteger(d)) return String(d);
  return d.toPrecision(4).replace(/\.?0+$/, "");
}

// ── 2-D SVG renderer ─────────────────────────────────────────────────────────

const SVG = 220;
const PAD = 28;
const RANGE = 2.0;
const SCALE = (SVG - 2 * PAD) / (2 * RANGE);
const CX = SVG / 2;
const CY = SVG / 2;

function toScreen(x: number, y: number): [number, number] {
  return [CX + x * SCALE, CY - y * SCALE];
}

type DetPreview2dProps = {
  A: number[][];
  det: number;
};

function DetPreview2d({ A, det }: DetPreview2dProps) {
  // Unit square corners in matrix order: (0,0),(1,0),(1,1),(0,1)
  const unitCorners: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  function transform(x: number, y: number): [number, number] {
    const a00 = A[0]?.[0] ?? 1;
    const a01 = A[0]?.[1] ?? 0;
    const a10 = A[1]?.[0] ?? 0;
    const a11 = A[1]?.[1] ?? 1;
    return [a00 * x + a01 * y, a10 * x + a11 * y];
  }

  const unitPts = unitCorners.map(([x, y]) => toScreen(x, y));
  const transPts = unitCorners.map(([x, y]) => {
    const [tx, ty] = transform(x, y);
    return toScreen(tx, ty);
  });

  const unitPath = `${unitPts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ")} Z`;
  const transPath = `${transPts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ")} Z`;

  const absDet = Math.abs(det);
  const isNeg = det < -1e-10;
  const isZero = absDet < 1e-10;

  const transColor = isZero ? "#e05c5c" : isNeg ? "#e08c3c" : "#5c9de0";
  const transOpacity = isZero ? 0.3 : 0.45;

  return (
    <svg
      data-testid="det-preview-2d"
      viewBox={`0 0 ${SVG} ${SVG}`}
      className="block h-[220px] w-[220px] rounded bg-bg"
      role="img"
      aria-label="Determinant: unit square transformation"
    >
      {/* Axes */}
      <g stroke="var(--fg-muted)" strokeWidth={0.8} opacity={0.5}>
        <line x1={PAD} y1={CY} x2={SVG - PAD} y2={CY} />
        <line x1={CX} y1={PAD} x2={CX} y2={SVG - PAD} />
      </g>
      {/* Unit square */}
      <path
        d={unitPath}
        fill="var(--fg-faint)"
        fillOpacity={0.15}
        stroke="var(--fg-muted)"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      {/* Transformed parallelogram */}
      <path
        d={transPath}
        fill={transColor}
        fillOpacity={transOpacity}
        stroke={transColor}
        strokeWidth={1.5}
      />
      {/* Det label */}
      <text x={SVG - PAD - 2} y={PAD + 10} fontSize={9} fill="var(--fg-muted)" textAnchor="end">
        det = {fmtDet(det)}
      </text>
      {isNeg ? (
        <text x={SVG - PAD - 2} y={PAD + 22} fontSize={8} fill={transColor} textAnchor="end">
          orientation flipped
        </text>
      ) : null}
      {isZero ? (
        <text x={SVG - PAD - 2} y={PAD + 22} fontSize={8} fill={transColor} textAnchor="end">
          collapsed (singular)
        </text>
      ) : null}
    </svg>
  );
}

// ── 3-D r3f renderer ─────────────────────────────────────────────────────────

type BoxWireProps = {
  corners: [number, number, number][];
  color: string;
  opacity?: number;
  lineWidth?: number;
};

// 12 edges of a cube by corner-pair indices
const CUBE_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0], // bottom face
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4], // top face
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7], // verticals
];

function WireBox({ corners, color, opacity = 1 }: BoxWireProps) {
  return (
    <>
      {CUBE_EDGES.map(([a, b]) => {
        const ca = corners[a];
        const cb = corners[b];
        if (ca === undefined || cb === undefined) return null;
        const [ax, ay, az] = ca;
        const [bx, by, bz] = cb;
        const dx = bx - ax;
        const dy = by - ay;
        const dz = bz - az;
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-9) return null;
        const mid: [number, number, number] = [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2];
        const dir: [number, number, number] = [dx / len, dy / len, dz / len];
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
          const s = Math.sin(halfAngle);
          q = [
            (cross[0] / crossLen) * s,
            (cross[1] / crossLen) * s,
            (cross[2] / crossLen) * s,
            Math.cos(halfAngle),
          ];
        }
        return (
          <mesh key={`${a}-${b}`} position={mid} quaternion={q}>
            <cylinderGeometry args={[0.015, 0.015, len, 6]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </>
  );
}

type DetScene3dProps = { A: number[][]; det: number };

function DetScene3d({ A, det }: DetScene3dProps) {
  function applyA(x: number, y: number, z: number): [number, number, number] {
    const r0 = A[0] ?? [1, 0, 0];
    const r1 = A[1] ?? [0, 1, 0];
    const r2 = A[2] ?? [0, 0, 1];
    return [
      (r0[0] ?? 1) * x + (r0[1] ?? 0) * y + (r0[2] ?? 0) * z,
      (r1[0] ?? 0) * x + (r1[1] ?? 1) * y + (r1[2] ?? 0) * z,
      (r2[0] ?? 0) * x + (r2[1] ?? 0) * y + (r2[2] ?? 1) * z,
    ];
  }

  // Unit cube corners (all 8 combinations of 0/1 in x,y,z)
  const unitCorners: [number, number, number][] = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
  ];

  const transCorners = unitCorners.map(([x, y, z]) => applyA(x, y, z));

  const absDet = Math.abs(det);
  const isNeg = det < -1e-10;
  const isZero = absDet < 1e-10;
  const transColor = isZero ? "#e05c5c" : isNeg ? "#e08c3c" : "#6b7dcc";

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <OrbitControls makeDefault />
      <WireBox corners={unitCorners} color="#888888" opacity={0.3} />
      <WireBox corners={transCorners} color={transColor} opacity={0.85} />
    </>
  );
}

function DetPreview3d({ A, det }: DetPreview2dProps) {
  return (
    <div data-testid="det-preview-3d" style={{ width: 220, height: 220 }} className="rounded bg-bg">
      <Canvas camera={{ position: [2.5, 2, 3], fov: 45 }}>
        <Suspense fallback={null}>
          <DetScene3d A={A} det={det} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function DetPreviewRenderer({
  value,
  inputs,
}: {
  value: MathValue;
  inputs: ResolvedInputs;
}) {
  const det = value.payload as number;
  const A = inputs.A;
  if (A === undefined) return null;

  const rows = A.payload as number[][];
  const n = rows.length;

  if (n === 2) return <DetPreview2d A={rows} det={det} />;
  if (n === 3) return <DetPreview3d A={rows} det={det} />;
  return null;
}
