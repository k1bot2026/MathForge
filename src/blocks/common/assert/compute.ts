import type { MathValue, ScalarPayload } from "~/math/types";

function toNumber(p: ScalarPayload): number {
  if (typeof p === "number") return p;
  if (typeof p === "boolean") return p ? 1 : 0;
  // Fraction or BigNumber — both have .toNumber()
  return (p as { toNumber: () => number }).toNumber();
}

function scalarEquals(a: ScalarPayload, b: ScalarPayload, tol: number): boolean {
  if (tol === 0) {
    if (typeof a === "boolean" && typeof b === "boolean") return a === b;
    return toNumber(a) === toNumber(b);
  }
  return Math.abs(toNumber(a) - toNumber(b)) <= tol;
}

function vectorEquals(
  a: ReadonlyArray<ScalarPayload>,
  b: ReadonlyArray<ScalarPayload>,
  tol: number,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai === undefined || bi === undefined) return false;
    if (!scalarEquals(ai, bi, tol)) return false;
  }
  return true;
}

function matrixEquals(
  a: ReadonlyArray<ReadonlyArray<ScalarPayload>>,
  b: ReadonlyArray<ReadonlyArray<ScalarPayload>>,
  tol: number,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai === undefined || bi === undefined) return false;
    if (!vectorEquals(ai, bi, tol)) return false;
  }
  return true;
}

export function computeAssert(actual: MathValue, expected: MathValue, tolerance: number): boolean {
  if (actual.type.kind !== expected.type.kind) return false;

  switch (actual.type.kind) {
    case "Scalar": {
      const e = expected as MathValue<{ kind: "Scalar"; field: never; precision: never }>;
      return scalarEquals(actual.payload as ScalarPayload, e.payload as ScalarPayload, tolerance);
    }
    case "Vector": {
      const ap = actual.payload as ReadonlyArray<ScalarPayload>;
      const ep = expected.payload as ReadonlyArray<ScalarPayload>;
      return vectorEquals(ap, ep, tolerance);
    }
    case "Matrix": {
      const ap = actual.payload as ReadonlyArray<ReadonlyArray<ScalarPayload>>;
      const ep = expected.payload as ReadonlyArray<ReadonlyArray<ScalarPayload>>;
      return matrixEquals(ap, ep, tolerance);
    }
    case "Expression": {
      const ap = actual.payload as { serialized: string };
      const ep = expected.payload as { serialized: string };
      return ap.serialized === ep.serialized;
    }
    default:
      // For Distribution, Function, etc — kind-match without deep equality
      return true;
  }
}
