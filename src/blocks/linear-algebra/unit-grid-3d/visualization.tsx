"use client";

// 3D unit-cube visualization for a 3×3 real matrix M.
//
// Renders the unit cube [0,1]³ transformed by M using react-three-fiber.
// Shows:
//   - Original basis vectors (e₁, e₂, e₃) as faint reference arrows
//   - Transformed basis vectors (M·e₁, M·e₂, M·e₃) as colored arrows
//   - Wireframe unit cube before and after the transformation

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue } from "~/math/types";

type Vec3 = [number, number, number];

type ArrowProps = { from: Vec3; to: Vec3; color: string; opacity?: number };

function Arrow3d({ from, to, color, opacity = 1 }: ArrowProps) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 1e-6) return null;

  const dir: Vec3 = [dx / len, dy / len, dz / len];
  const mid: Vec3 = [from[0] + dx * 0.5, from[1] + dy * 0.5, from[2] + dz * 0.5];

  // Quaternion to rotate [0,1,0] to dir
  const up: Vec3 = [0, 1, 0];
  const cross: Vec3 = [
    up[1] * dir[2] - up[2] * dir[1],
    up[2] * dir[0] - up[0] * dir[2],
    up[0] * dir[1] - up[1] * dir[0],
  ];
  const crossLen = Math.sqrt(cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2);
  const dot = up[0] * dir[0] + up[1] * dir[1] + up[2] * dir[2];

  let quaternion: [number, number, number, number];
  if (crossLen < 1e-6) {
    // Parallel or anti-parallel to up
    if (dot > 0) {
      quaternion = [0, 0, 0, 1];
    } else {
      quaternion = [1, 0, 0, 0];
    }
  } else {
    const halfAngle = Math.acos(Math.max(-1, Math.min(1, dot))) / 2;
    const sinHalf = Math.sin(halfAngle);
    const axis: Vec3 = [cross[0] / crossLen, cross[1] / crossLen, cross[2] / crossLen];
    quaternion = [axis[0] * sinHalf, axis[1] * sinHalf, axis[2] * sinHalf, Math.cos(halfAngle)];
  }

  return (
    <group>
      <mesh position={mid} quaternion={quaternion}>
        <cylinderGeometry args={[0.02, 0.02, len * 0.85, 8]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh position={to} quaternion={quaternion}>
        <coneGeometry args={[0.06, len * 0.15, 8]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}

type WireBoxProps = { corners: Vec3[]; color: string; opacity?: number };

// Draw 12 edges of a parallelepiped given its 8 corners in standard order:
// [000, 100, 010, 110, 001, 101, 011, 111]
function WireBox({ corners, color, opacity = 1 }: WireBoxProps) {
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3], // bottom face
    [4, 5],
    [4, 6],
    [5, 7],
    [6, 7], // top face
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7], // verticals
  ];
  return (
    <group>
      {edges.map(([a, b]) => {
        const from = corners[a] ?? [0, 0, 0];
        const to = corners[b] ?? [0, 0, 0];
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const dz = to[2] - from[2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-6) return null;
        const dir: Vec3 = [dx / len, dy / len, dz / len];
        const mid: Vec3 = [from[0] + dx * 0.5, from[1] + dy * 0.5, from[2] + dz * 0.5];
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
          <mesh key={`${a}-${b}`} position={mid} quaternion={q}>
            <cylinderGeometry args={[0.015, 0.015, len, 6]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
}

type SceneProps = {
  matrix: ReadonlyArray<ReadonlyArray<number>>;
};

function Scene({ matrix }: SceneProps) {
  const col0 = useMemo<Vec3>(
    () => [matrix[0]?.[0] ?? 0, matrix[1]?.[0] ?? 0, matrix[2]?.[0] ?? 0],
    [matrix],
  );
  const col1 = useMemo<Vec3>(
    () => [matrix[0]?.[1] ?? 0, matrix[1]?.[1] ?? 0, matrix[2]?.[1] ?? 0],
    [matrix],
  );
  const col2 = useMemo<Vec3>(
    () => [matrix[0]?.[2] ?? 0, matrix[1]?.[2] ?? 0, matrix[2]?.[2] ?? 0],
    [matrix],
  );

  const origin: Vec3 = [0, 0, 0];

  // Corners of transformed unit cube: M·(i,j,k) for i,j,k ∈ {0,1}
  const corners = useMemo<Vec3[]>(() => {
    function applyM(x: number, y: number, z: number): Vec3 {
      return [
        (matrix[0]?.[0] ?? 0) * x + (matrix[0]?.[1] ?? 0) * y + (matrix[0]?.[2] ?? 0) * z,
        (matrix[1]?.[0] ?? 0) * x + (matrix[1]?.[1] ?? 0) * y + (matrix[1]?.[2] ?? 0) * z,
        (matrix[2]?.[0] ?? 0) * x + (matrix[2]?.[1] ?? 0) * y + (matrix[2]?.[2] ?? 0) * z,
      ];
    }
    return [
      applyM(0, 0, 0),
      applyM(1, 0, 0),
      applyM(0, 1, 0),
      applyM(1, 1, 0),
      applyM(0, 0, 1),
      applyM(1, 0, 1),
      applyM(0, 1, 1),
      applyM(1, 1, 1),
    ];
  }, [matrix]);

  // Original unit cube corners
  const unitCorners: Vec3[] = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [0, 1, 1],
    [1, 1, 1],
  ];

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <OrbitControls makeDefault />

      {/* Original unit cube (faint wireframe) */}
      <WireBox corners={unitCorners} color="#888888" opacity={0.3} />

      {/* Original basis arrows (faint) */}
      <Arrow3d from={origin} to={[1, 0, 0]} color="#aaaaaa" opacity={0.3} />
      <Arrow3d from={origin} to={[0, 1, 0]} color="#aaaaaa" opacity={0.3} />
      <Arrow3d from={origin} to={[0, 0, 1]} color="#aaaaaa" opacity={0.3} />

      {/* Transformed cube wireframe */}
      <WireBox corners={corners} color="#6b7dcc" opacity={0.8} />

      {/* Transformed basis arrows */}
      <Arrow3d from={origin} to={col0} color="#e05c5c" />
      <Arrow3d from={origin} to={col1} color="#5cb85c" />
      <Arrow3d from={origin} to={col2} color="#5c9de0" />
    </>
  );
}

export function UnitGrid3dVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const M = inputs.M;
  if (M === undefined || M.type.kind !== "Matrix") {
    return (
      <div className="flex h-[260px] w-[260px] items-center justify-center text-center text-xs text-fg-faint">
        Connect a 3×3 matrix to M.
      </div>
    );
  }
  const matrix = M.payload as ReadonlyArray<ReadonlyArray<number>>;

  return (
    <div
      data-testid="unit-grid-3d-canvas"
      style={{ width: 260, height: 260 }}
      className="rounded bg-bg"
    >
      <Canvas camera={{ position: [2.5, 2, 3], fov: 45 }}>
        <Suspense fallback={null}>
          <Scene matrix={matrix} />
        </Suspense>
      </Canvas>
    </div>
  );
}
