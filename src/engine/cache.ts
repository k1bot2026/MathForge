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
  private _hits = 0;
  private _misses = 0;

  get(key: CacheKey): MathValue | undefined {
    const result = this.store.get(key);
    if (result !== undefined) {
      this._hits++;
    } else {
      this._misses++;
    }
    return result;
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

  // test-only — do not consume in production code
  __getCacheStats(): { hits: number; misses: number } {
    return { hits: this._hits, misses: this._misses };
  }

  // test-only — do not consume in production code
  __resetCacheStats(): void {
    this._hits = 0;
    this._misses = 0;
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
