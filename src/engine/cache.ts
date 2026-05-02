// In-memory memoization cache for evaluator results.
//
// Layer 1 of the three documented in docs/ARCHITECTURE.md (in-memory →
// session storage → IndexedDB). Phase 1 implements only this layer;
// the disk-backed layers land alongside SymPy in Phase 4 once they
// have something heavy enough to be worth caching.

import type { MathValue } from "~/math/types";
import { stableStringify } from "./hash";

export type CacheKey = string;

export class EvalCache {
  private readonly store = new Map<CacheKey, MathValue>();

  get(key: CacheKey): MathValue | undefined {
    return this.store.get(key);
  }

  set(key: CacheKey, value: MathValue): void {
    this.store.set(key, value);
  }

  delete(key: CacheKey): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export function buildCacheKey(
  blockId: string,
  paramsHash: string,
  inputHashes: ReadonlyArray<string>,
): CacheKey {
  return `${blockId}|${paramsHash}|${inputHashes.join(",")}`;
}

export function hashInput(value: unknown): string {
  return stableStringify(value);
}
