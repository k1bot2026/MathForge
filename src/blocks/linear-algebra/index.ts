// Linear-algebra domain plugin entry. Side-effect-free per the
// Phase-1 registration decision: domains expose a single
// `register(registry)` and the composition root in src/blocks/index.ts
// chooses when to call it.

import type { BlockRegistry } from "../registry";
import { Matrix2x2Block } from "./matrix2x2/definition";
import { Vector2Block } from "./vector2/definition";

export function register(registry: BlockRegistry): void {
  registry.register(Vector2Block);
  registry.register(Matrix2x2Block);
}
