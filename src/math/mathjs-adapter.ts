// math.js adapter — Phase-0 surface is a single integer-matrix multiply
// used by the smoke test. Phase 1 replaces this with the Fraction- and
// BigNumber-aware adapter described in docs/ARCHITECTURE.md.

import { multiply as mathjsMultiply } from "mathjs";

export function multiply(a: number[][], b: number[][]): number[][] {
  return mathjsMultiply(a, b) as number[][];
}
