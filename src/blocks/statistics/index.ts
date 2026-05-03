// Statistics domain plugin entry. Side-effect-free per the registration
// decision: domains expose a single `register(registry)` and the composition
// root in src/blocks/index.ts chooses when to call it.

import type { BlockRegistry } from "../registry";
import { BernoulliBlock } from "./bernoulli/definition";
import { BinomialBlock } from "./binomial/definition";
import { NormalBlock } from "./normal/definition";
import { UniformBlock } from "./uniform/definition";

export function register(registry: BlockRegistry): void {
  registry.register(BernoulliBlock);
  registry.register(BinomialBlock);
  registry.register(NormalBlock);
  registry.register(UniformBlock);
}
