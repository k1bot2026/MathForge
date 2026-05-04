// Caching layers for evaluator results.
//
// Layer 1 — EvalCache: in-memory memoization, reset on reload.
// Layer 3 — IndexedDBCache: extends EvalCache with IDB write-through and
//   async hydrate(), so hot results survive page reloads without touching
//   the synchronous evaluator hot-path.

import { createStore, clear as idbClear, entries as idbEntries, set as idbSet } from "idb-keyval";
import type { MathValue } from "~/math/types";
import { stableStringify } from "./hash";

// Bumping this constant orphans all existing IDB entries (they become
// unreachable via any key that includes the version prefix). A cleanup
// sweep is deferred to Phase 6.
export const ENGINE_VERSION = "1";

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

// Prefix applied to every IDB key so that an ENGINE_VERSION bump makes
// all previously-written entries unreachable without an explicit clear.
function idbKey(key: CacheKey): string {
  return `v${ENGINE_VERSION}:${key}`;
}

/**
 * Layer 3 cache: extends EvalCache with IndexedDB write-through persistence.
 *
 * Usage:
 *   const cache = new IndexedDBCache();
 *   await cache.hydrate();   // call once at startup to warm from IDB
 *   // pass cache to evaluate() as normal — set() writes through to IDB
 */
export class IndexedDBCache extends EvalCache {
  private readonly idbStore = createStore("mathforge:eval-cache", "entries");

  /**
   * Reads all version-matching entries from IDB into the in-memory store.
   * Call once at startup before the first evaluate() call.
   */
  async hydrate(): Promise<void> {
    const prefix = `v${ENGINE_VERSION}:`;
    const all = await idbEntries<string, MathValue>(this.idbStore);
    for (const [k, v] of all) {
      if (typeof k === "string" && k.startsWith(prefix)) {
        const memKey = k.slice(prefix.length);
        super.set(memKey, v);
      }
    }
  }

  /** Write-through: sets in memory and schedules an async IDB write. */
  override set(key: CacheKey, value: MathValue): void {
    super.set(key, value);
    void idbSet(idbKey(key), value, this.idbStore);
  }

  /** Clears both the in-memory store and all IDB entries in this store. */
  override clear(): void {
    super.clear();
    void idbClear(this.idbStore);
  }
}
