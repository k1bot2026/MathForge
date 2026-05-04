import { evalAt } from "~/blocks/calculus/viz-calc";
import type { FunctionPayload } from "~/math/types";

export class BenchmarkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BenchmarkError";
  }
}

/**
 * Runs `fn` at `x` for `warmup + samples` iterations.
 * Discards warmup iterations, returns mean wall-clock ms over the sample window.
 */
export function runBenchmark(
  fn: FunctionPayload,
  x: number,
  samples: number,
  warmup: number,
): number {
  if (samples < 1) {
    throw new BenchmarkError("core.benchmark: samples must be at least 1");
  }
  if (warmup < 0) {
    throw new BenchmarkError("core.benchmark: warmup must be non-negative");
  }

  const variable = fn.variables[0] ?? "x";

  // Warmup iterations — discarded
  for (let i = 0; i < warmup; i++) {
    evalAt(fn.expression, variable, x);
  }

  // Timed iterations
  const start = performance.now();
  for (let i = 0; i < samples; i++) {
    evalAt(fn.expression, variable, x);
  }
  const elapsed = performance.now() - start;

  return elapsed / samples;
}
