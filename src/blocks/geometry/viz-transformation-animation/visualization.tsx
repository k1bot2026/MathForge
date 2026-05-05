"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect } from "react";
import type { ResolvedInputs } from "~/blocks/types";
import type { MathValue, PolygonPayload } from "~/math/types";

const SIZE = 260;
const PADDING = 20;
const VIEW_RANGE = 5;
const SCALE = (SIZE - 2 * PADDING) / (2 * VIEW_RANGE);
const CX = SIZE / 2;
const CY = SIZE / 2;

function toScreen(x: number, y: number): [number, number] {
  return [CX + x * SCALE, CY - y * SCALE];
}

function polyPoints(verts: number[][]): string {
  return verts.map(([x, y]) => toScreen(x ?? 0, y ?? 0).join(",")).join(" ");
}

function lerp(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => v + ((b[i] ?? v) - v) * t);
}

function lerpPoly(source: number[][], target: number[][], t: number): number[][] {
  const n = Math.min(source.length, target.length);
  return Array.from({ length: n }, (_, i) => lerp(source[i] ?? [], target[i] ?? [], t));
}

export function TransformationAnimationVisualization({
  inputs,
}: {
  inputs: ResolvedInputs;
  output: MathValue | undefined;
}) {
  const source = inputs.source;
  const transformed = inputs.transformed;

  const t = useMotionValue(0);

  useEffect(() => {
    const controls = animate(t, [0, 1], {
      duration: 1.8,
      repeat: Number.POSITIVE_INFINITY,
      repeatType: "reverse",
      ease: "easeInOut",
    });
    return () => controls.stop();
  }, [t]);

  if (!source || !transformed) {
    return (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: 13,
          background: "#1a1a2e",
        }}
      >
        Connect source + transformed polygons
      </div>
    );
  }

  const srcVerts = source.payload as PolygonPayload;
  const dstVerts = transformed.payload as PolygonPayload;

  const srcArr = srcVerts.map((v) => v as number[]);
  const dstArr = dstVerts.map((v) => v as number[]);

  const AnimatedPoly = motion.polygon;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      style={{ display: "block", background: "#1a1a2e" }}
      role="img"
      aria-label="Transformation animation canvas"
    >
      <title>Transformation Animation</title>
      {/* Reference axes */}
      <line x1={PADDING} y1={CY} x2={SIZE - PADDING} y2={CY} stroke="#555" strokeWidth={0.5} />
      <line x1={CX} y1={PADDING} x2={CX} y2={SIZE - PADDING} stroke="#555" strokeWidth={0.5} />
      {/* Source polygon (ghost) */}
      <polygon
        points={polyPoints(srcArr)}
        fill="rgba(74,158,255,0.1)"
        stroke="#4a9eff"
        strokeWidth={1}
        strokeDasharray="4 3"
      />
      {/* Animated interpolated polygon */}
      <AnimatedPoly
        points={polyPoints(lerpPoly(srcArr, dstArr, 0))}
        fill="rgba(180,130,255,0.2)"
        stroke="#b482ff"
        strokeWidth={2}
        animate={{
          points: [
            polyPoints(lerpPoly(srcArr, dstArr, 0)),
            polyPoints(lerpPoly(srcArr, dstArr, 1)),
          ],
        }}
        transition={{
          duration: 1.8,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />
    </svg>
  );
}
