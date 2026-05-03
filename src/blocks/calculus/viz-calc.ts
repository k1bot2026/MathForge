// Shared numeric evaluation utilities for calculus visualization blocks.
//
// SymPy str() output uses Python-style exponentiation (**) which mathjs
// also supports. The main translations needed are:
//   - SymPy's `exp(x)` → mathjs's `exp(x)` (same)
//   - SymPy's `log(x)` → mathjs's `log(x)` (same)
//   - SymPy's `asin/acos/atan` → mathjs `asin/acos/atan` (same)
//
// mathjs's `evaluate()` handles `**`, function calls, and the standard
// transcendentals. This covers the vast majority of single-variable
// SymPy expressions.

import { evaluate as mathjsEvaluate } from "mathjs";

/**
 * Evaluates a SymPy str() expression at a given variable value.
 * Returns NaN for any evaluation error (out-of-domain, overflow, etc.).
 */
export function evalAt(expr: string, variable: string, value: number): number {
  try {
    const result = mathjsEvaluate(expr, { [variable]: value });
    if (typeof result !== "number" || !Number.isFinite(result)) return NaN;
    return result;
  } catch {
    return NaN;
  }
}

/**
 * Samples a SymPy str() expression over N evenly-spaced x values in [lo, hi].
 * Returns paired { xs, ys } arrays; ys[i] may be NaN for out-of-domain points.
 */
export function sampleExpr(
  expr: string,
  variable: string,
  lo: number,
  hi: number,
  n = 200,
): { xs: number[]; ys: number[] } {
  const xs = Array.from({ length: n }, (_, i) => lo + (i / (n - 1)) * (hi - lo));
  const ys = xs.map((x) => evalAt(expr, variable, x));
  return { xs, ys };
}

/** Returns [lo, hi] plot range centered on the mean of visible y values. */
export function yRange(ys: number[]): [number, number] {
  const finite = ys.filter(Number.isFinite);
  if (finite.length === 0) return [-1, 1];
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const pad = (hi - lo) * 0.1 || 0.5;
  return [lo - pad, hi + pad];
}
