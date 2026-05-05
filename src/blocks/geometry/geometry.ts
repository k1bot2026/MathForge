// Shared geometry utilities. Not a block — pure math helpers used by
// geom.* compute functions.

import type { LinePayload, PointPayload } from "~/math/types";

export class GeometryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeometryError";
  }
}

export function dot(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
}

export function norm(v: ReadonlyArray<number>): number {
  return Math.sqrt(dot(v, v));
}

export function normalize(v: ReadonlyArray<number>): number[] {
  const n = norm(v);
  if (n < 1e-15) throw new GeometryError("Cannot normalize a zero vector");
  return v.map((c) => c / n);
}

export function subtract(a: ReadonlyArray<number>, b: ReadonlyArray<number>): number[] {
  return a.map((c, i) => c - (b[i] ?? 0));
}

export function distance(a: PointPayload, b: PointPayload): number {
  return norm(subtract(a, b));
}

/** Cross product for 3D vectors only. */
export function cross3(
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>,
): [number, number, number] {
  const a0 = a[0] ?? 0,
    a1 = a[1] ?? 0,
    a2 = a[2] ?? 0;
  const b0 = b[0] ?? 0,
    b1 = b[1] ?? 0,
    b2 = b[2] ?? 0;
  return [a1 * b2 - a2 * b1, a2 * b0 - a0 * b2, a0 * b1 - a1 * b0];
}

/**
 * Build a LinePayload from two distinct points.
 * Caches 2D implicit coefficients when n=2.
 */
export function lineFromTwoPoints(p1: PointPayload, p2: PointPayload): LinePayload {
  const dir = subtract(p2, p1);
  const n = norm(dir);
  if (n < 1e-15) throw new GeometryError("Cannot construct a line from two identical points");
  const direction = dir.map((c) => c / n);
  const line: LinePayload = { point: p1, direction };
  if (p1.length === 2) {
    // ax + by + c = 0 from direction vector (dy, -dx, -(dy*x0 - dx*y0))
    const dx = direction[0] ?? 0;
    const dy = direction[1] ?? 0;
    const x0 = p1[0] ?? 0;
    const y0 = p1[1] ?? 0;
    line.implicit = { a: dy, b: -dx, c: -(dy * x0 - dx * y0) };
  }
  return line;
}

/** Identity transformation matrix for dimension n. */
export function identityTransform(n: 2 | 3): number[][] {
  const size = n + 1;
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (__, j) => (i === j ? 1 : 0)),
  );
}

/** Multiply two (n+1)×(n+1) homogeneous matrices. */
export function matmul(A: number[][], B: number[][]): number[][] {
  const size = A.length;
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (__, j) => {
      let sum = 0;
      for (let k = 0; k < size; k++) sum += (A[i]?.[k] ?? 0) * (B[k]?.[j] ?? 0);
      return sum;
    }),
  );
}

/** Apply a homogeneous transformation matrix to a point (adds homogeneous coord 1). */
export function applyTransform(T: number[][], p: PointPayload): number[] {
  const n = p.length;
  const h = [...p, 1]; // homogeneous coords
  const result = Array.from({ length: n + 1 }, (_, i) => {
    let sum = 0;
    for (let j = 0; j <= n; j++) sum += (T[i]?.[j] ?? 0) * (h[j] ?? 0);
    return sum;
  });
  const w = result[n] ?? 1;
  return result.slice(0, n).map((c) => c / (w === 0 ? 1 : w));
}
