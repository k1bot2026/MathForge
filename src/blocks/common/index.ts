// Common-domain plugin entry. Registers blocks that aren't tied to a
// single mathematical domain (constants, scalar inputs, control flow,
// …). Per the user's Phase-1 decision the registration is side-effect-
// free: this module exports a single `register(registry)` function and
// the composition layer (src/blocks/index.ts) decides when to call it.

import type { BlockRegistry } from "../registry";
import { ConstantBlock } from "./constant/definition";

export function register(registry: BlockRegistry): void {
  registry.register(ConstantBlock);
}
