"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { ResolvedInputs } from "~/blocks/types";
import type {
  LinePayload,
  MathValue,
  PointPayload,
  PolygonPayload,
  SpherePayload,
} from "~/math/types";

const SIZE = 260;

type Vec3 = [number, number, number];

function toVec3(p: PointPayload, fallback: Vec3 = [0, 0, 0]): Vec3 {
  return [
    (p[0] as number) ?? fallback[0],
    (p[1] as number) ?? fallback[1],
    (p[2] as number) ?? fallback[2],
  ];
}

function Point3d({ position, color }: { position: Vec3; color: string }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.08, 12, 12]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Line3d({ from, to, color }: { from: Vec3; to: Vec3; color: string }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-6) return null;

  const mid: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const dir: Vec3 = [dx / len, dy / len, dz / len];

  const up: Vec3 = [0, 1, 0];
  const cross: Vec3 = [
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
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[0.025, 0.025, len, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Sphere3d({ center, radius, color }: { center: Vec3; radius: number; color: string }) {
  return (
    <mesh position={center}>
      <sphereGeometry args={[Math.max(0.01, radius), 24, 24]} />
      <meshStandardMaterial color={color} transparent opacity={0.35} wireframe={false} />
    </mesh>
  );
}

function Polygon3d({ vertices, color }: { vertices: Vec3[]; color: string }) {
  if (vertices.length < 2) return null;
  return (
    <group>
      {vertices.map((v, i) => {
        const next = vertices[(i + 1) % vertices.length] ?? v;
        // biome-ignore lint/suspicious/noArrayIndexKey: polygon edges are positionally addressed; reordering is not a thing here.
        return <Line3d key={i} from={v} to={next} color={color} />;
      })}
      {vertices.map((v, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: polygon vertices are positionally addressed; reordering is not a thing here.
        <Point3d key={`p${i}`} position={v} color={color} />
      ))}
    </group>
  );
}

const SHAPE_COLORS = ["#4a9eff", "#50d890", "#ffd700", "#ff7f50"] as const;

function renderShape3d(val: MathValue, idx: number) {
  const color = SHAPE_COLORS[idx % SHAPE_COLORS.length] ?? "#4a9eff";
  const kind = val.type.kind;

  if (kind === "Point") {
    const p = val.payload as PointPayload;
    return <Point3d key={idx} position={toVec3(p)} color={color} />;
  }

  if (kind === "Line") {
    const l = val.payload as LinePayload;
    const anchor = toVec3(l.point);
    const dir = toVec3(l.direction);
    const scale = 4;
    const from: Vec3 = [
      anchor[0] - dir[0] * scale,
      anchor[1] - dir[1] * scale,
      anchor[2] - dir[2] * scale,
    ];
    const to: Vec3 = [
      anchor[0] + dir[0] * scale,
      anchor[1] + dir[1] * scale,
      anchor[2] + dir[2] * scale,
    ];
    return <Line3d key={idx} from={from} to={to} color={color} />;
  }

  if (kind === "Sphere") {
    const s = val.payload as SpherePayload;
    return <Sphere3d key={idx} center={toVec3(s.center)} radius={s.radius} color={color} />;
  }

  if (kind === "Polygon") {
    const verts = (val.payload as PolygonPayload).map((v) => toVec3(v));
    return <Polygon3d key={idx} vertices={verts} color={color} />;
  }

  return null;
}

function Axes3d() {
  const o: Vec3 = [0, 0, 0];
  return (
    <group>
      <Line3d from={o} to={[3, 0, 0]} color="#e05c5c" />
      <Line3d from={o} to={[0, 3, 0]} color="#5cb85c" />
      <Line3d from={o} to={[0, 0, 3]} color="#5c9de0" />
    </group>
  );
}

function Scene({ shapes }: { shapes: MathValue[] }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <OrbitControls makeDefault />
      <Axes3d />
      {shapes.map((s, i) => renderShape3d(s, i))}
    </>
  );
}

const INPUT_IDS = ["shape1", "shape2", "shape3", "shape4"] as const;

export function VizGeometry3dVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const shapes = INPUT_IDS.map((id) => inputs[id]).filter((v): v is MathValue => v !== undefined);

  if (shapes.length === 0) {
    return (
      <div
        style={{ width: SIZE, height: SIZE }}
        className="flex items-center justify-center text-center text-xs text-fg-faint"
      >
        Connect geometry shapes to render in 3D
      </div>
    );
  }

  return (
    <div
      data-testid="viz-geometry-3d-canvas"
      style={{ width: SIZE, height: SIZE }}
      className="rounded bg-[#1a1a2e]"
    >
      <Canvas camera={{ position: [4, 3, 5], fov: 45 }}>
        <Suspense fallback={null}>
          <Scene shapes={shapes} />
        </Suspense>
      </Canvas>
    </div>
  );
}
