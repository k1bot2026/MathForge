// Block-system composition root.
//
// `buildRegistry()` constructs a fresh BlockRegistry and registers every
// domain that the build wants to ship. `blockRegistry` is the singleton
// the React tree consumes (auto-evaluate hook, canvas isValidConnection,
// inspector listing). Tests should call `buildRegistry()` for an
// isolated instance instead of touching the singleton.
//
// Note: this is a plugin-entry index.ts (one register() call per
// domain), not a barrel re-export — see CLAUDE.md.

import * as calculus from "./calculus";
import * as common from "./common";
import * as discrete from "./discrete";
import * as linearAlgebra from "./linear-algebra";
import { BlockRegistry } from "./registry";
import * as statistics from "./statistics";

export function buildRegistry(): BlockRegistry {
  const registry = new BlockRegistry();
  common.register(registry);
  linearAlgebra.register(registry);
  statistics.register(registry);
  calculus.register(registry);
  discrete.register(registry);
  return registry;
}

export const blockRegistry = buildRegistry();

/**
 * Asynchronously loads user-defined composite blocks from IndexedDB and
 * registers them into the given registry. Call once at app startup after
 * buildRegistry(). No-op in environments without IndexedDB (SSR, tests
 * that don't import fake-indexeddb).
 */
export async function hydrateUserBlocksIntoRegistry(registry: BlockRegistry): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const { hydrateUserBlocks } = await import("~/lib/user-blocks");
  await hydrateUserBlocks(registry);
}
