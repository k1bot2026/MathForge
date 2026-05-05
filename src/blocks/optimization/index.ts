import type { BlockRegistry } from "../registry";
import { LpDualBlock } from "./lp-dual/definition";
import { LpStandardBlock } from "./lp-standard/definition";
import { SimplexBlock } from "./simplex/definition";

export function register(registry: BlockRegistry): void {
  registry.register(LpStandardBlock);
  registry.register(LpDualBlock);
  registry.register(SimplexBlock);
}
