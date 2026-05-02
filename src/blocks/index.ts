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

import * as common from "./common";
import * as linearAlgebra from "./linear-algebra";
import { BlockRegistry } from "./registry";

export function buildRegistry(): BlockRegistry {
  const registry = new BlockRegistry();
  common.register(registry);
  linearAlgebra.register(registry);
  return registry;
}

export const blockRegistry = buildRegistry();
