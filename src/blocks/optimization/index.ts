import type { BlockRegistry } from "../registry";
import { LpStandardBlock } from "./lp-standard/definition";

export function register(registry: BlockRegistry): void {
  registry.register(LpStandardBlock);
}
