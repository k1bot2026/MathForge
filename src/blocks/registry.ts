// In-memory block registry.
//
// Domains register their blocks via a side-effect-free `register(registry)`
// function (per the Phase-1 decision). The registry is decoupled from
// any global state so tests can spin up isolated registries; production
// builds compose one in `src/blocks/index.ts` (added when the first
// domain ships).

import type { BlockDefinition } from "./types";

export class BlockRegistry {
  private readonly blocks = new Map<string, BlockDefinition>();
  /** IDs registered via `register()` — cannot be overwritten by `registerOrReplace()`. */
  private readonly builtinIds = new Set<string>();

  /** Throws on duplicate ids — registration is the wrong place to mask conflicts. */
  register(definition: BlockDefinition): void {
    if (this.blocks.has(definition.id)) {
      throw new Error(`Duplicate block id: ${definition.id}`);
    }
    this.blocks.set(definition.id, definition);
    this.builtinIds.add(definition.id);
  }

  /**
   * Register or replace a user-defined composite block.
   * Throws if the id belongs to a built-in block (registered via `register()`).
   * Emits a console warning when replacing an existing user block.
   */
  registerOrReplace(definition: BlockDefinition): void {
    if (this.builtinIds.has(definition.id)) {
      throw new Error(`Cannot overwrite built-in block: ${definition.id}`);
    }
    if (this.blocks.has(definition.id)) {
      console.warn(`[BlockRegistry] Replacing user block: ${definition.id}`);
    }
    this.blocks.set(definition.id, definition);
  }

  get(id: string): BlockDefinition | undefined {
    return this.blocks.get(id);
  }

  has(id: string): boolean {
    return this.blocks.has(id);
  }

  list(): ReadonlyArray<BlockDefinition> {
    return [...this.blocks.values()];
  }

  byDomain(domain: BlockDefinition["domain"]): ReadonlyArray<BlockDefinition> {
    return this.list().filter((b) => b.domain === domain);
  }

  size(): number {
    return this.blocks.size;
  }
}
